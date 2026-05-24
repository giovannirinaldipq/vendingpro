import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { runParser, type ImportSource } from '@/lib/import';

interface MappingPair {
  external_name: string;
  machine_id: string;
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const systemRaw = (form.get('system') as string | null) ?? 'vmpay';
  const mappingsRaw = form.get('mappings') as string | null;

  if (!file) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  if (systemRaw !== 'vmpay' && systemRaw !== 'vendpago') {
    return NextResponse.json({ error: 'invalid_system' }, { status: 400 });
  }
  const system = systemRaw as ImportSource;

  let mappings: MappingPair[] = [];
  try {
    mappings = JSON.parse(mappingsRaw ?? '[]') as MappingPair[];
  } catch {
    return NextResponse.json({ error: 'invalid_mappings_json' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = runParser(buffer, system);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'parse_failed', details: parsed.errors }, { status: 400 });
  }

  // Valida ownership dos machine_ids passados
  const machineIds = [...new Set(mappings.map(m => m.machine_id))];
  if (machineIds.length > 0) {
    const { data: owned } = await ctx.supabase
      .from('machines')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .in('id', machineIds);
    const ownedSet = new Set((owned ?? []).map(m => m.id));
    const unauthorized = machineIds.filter(id => !ownedSet.has(id));
    if (unauthorized.length > 0) {
      return NextResponse.json(
        { error: 'machines_not_owned', details: unauthorized },
        { status: 403 }
      );
    }
  }

  // Upsert dos aliases (substitui se já existe)
  if (mappings.length > 0) {
    const aliasRows = mappings.map(m => ({
      tenant_id: ctx.tenantId,
      machine_id: m.machine_id,
      external_name: m.external_name,
      source: system,
      created_by: ctx.userId,
    }));
    const { error: aliasErr } = await ctx.supabase
      .from('machine_aliases')
      .upsert(aliasRows, { onConflict: 'tenant_id,source,external_name' });
    if (aliasErr) {
      return NextResponse.json({ error: aliasErr.message }, { status: 500 });
    }
  }

  // Map external_name → machine_id (mappings vencem; aliases preexistentes ficam de fora)
  const mappingMap = new Map<string, string>(mappings.map(m => [m.external_name, m.machine_id]));

  // Para máquinas que vieram no arquivo mas NÃO estão no mapping, busca alias persistido
  const externalNames = parsed.summary.machines;
  const missing = externalNames.filter(n => !mappingMap.has(n));
  if (missing.length > 0) {
    const { data: existing } = await ctx.supabase
      .from('machine_aliases')
      .select('external_name, machine_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('source', system)
      .in('external_name', missing);
    for (const a of existing ?? []) {
      mappingMap.set(a.external_name as string, a.machine_id as string);
    }
  }

  // Monta as vendas a inserir
  const salesToInsert: Array<Record<string, unknown>> = [];
  const unmapped = new Set<string>();
  for (const s of parsed.sales) {
    const machineId = mappingMap.get(s.machine_code);
    if (!machineId) {
      unmapped.add(s.machine_code);
      continue;
    }
    salesToInsert.push({
      tenant_id: ctx.tenantId,
      machine_id: machineId,
      sale_date: s.sale_date,
      sale_time: s.sale_time,
      sale_datetime: s.sale_datetime,
      product_name: s.product_name,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total_price: s.total_price,
      payment_method: s.payment_method,
      raw_data: {
        product_code: s.product_code,
        barcode: s.barcode,
        category: s.category,
        import_source: system,
        external_machine_name: s.machine_code,
        ...s.raw_data,
      },
    });
  }

  // Insert em lotes (de-duplica via upsert no índice sale_datetime+product_name)
  let inserted = 0;
  let errorBatches = 0;
  const batchSize = 500;
  for (let i = 0; i < salesToInsert.length; i += batchSize) {
    const batch = salesToInsert.slice(i, i + batchSize);
    const { error } = await ctx.supabase.from('sales').upsert(batch as never, {
      onConflict: 'tenant_id,machine_id,sale_datetime,product_name',
      ignoreDuplicates: true,
    });
    if (error) {
      console.error('[import.confirm] batch error:', error);
      errorBatches++;
    } else {
      inserted += batch.length;
    }
  }

  // Registra a importação
  await ctx.supabase
    .from('imports')
    .insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      file_name: file.name,
      file_size: file.size,
      source_system: system,
      status: errorBatches === 0 ? 'completed' : 'partial',
      total_rows: parsed.summary.valid_records,
      processed_rows: inserted,
      error_rows: salesToInsert.length - inserted + unmapped.size,
      errors_detail: { unmapped: [...unmapped], error_batches: errorBatches },
      completed_at: new Date().toISOString(),
    });

  return NextResponse.json({
    data: {
      imported: inserted,
      total_in_file: parsed.summary.valid_records,
      aliases_saved: mappings.length,
      unmapped_machines: [...unmapped],
      date_range: parsed.summary.date_range,
      total_revenue: parsed.summary.total_revenue,
    },
  });
}
