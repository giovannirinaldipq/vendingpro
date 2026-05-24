import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { runParser, salesCountByExternalName, type ImportSource } from '@/lib/import';

export interface PreviewResponse {
  data: {
    system: ImportSource;
    summary: {
      total_records: number;
      valid_records: number;
      skipped_records: number;
      total_revenue: number;
      date_range: { start: string; end: string };
      cnpj_operador?: string;
      periodo?: string;
      format?: 'sales_detailed' | 'cashless_aggregated';
      aggregated_transactions?: number;
    };
    machines: Array<{
      external_name: string;
      sales_count: number;
      // Se já houver alias salvo: id + nome amigável da máquina mapeada.
      mapped_machine_id: string | null;
      mapped_machine_name: string | null;
    }>;
    available_machines: Array<{ id: string; name: string; code: string }>;
  };
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const systemRaw = (form.get('system') as string | null) ?? 'vmpay';
  if (!file) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  if (systemRaw !== 'vmpay' && systemRaw !== 'vendpago') {
    return NextResponse.json({ error: 'invalid_system' }, { status: 400 });
  }
  const system = systemRaw as ImportSource;

  const buffer = await file.arrayBuffer();
  const parsed = runParser(buffer, system);

  if (!parsed.ok) {
    return NextResponse.json({ error: 'parse_failed', details: parsed.errors }, { status: 400 });
  }

  const externalNames = parsed.summary.machines;
  const salesCount = salesCountByExternalName(parsed.sales);

  // Busca aliases já cadastrados para este tenant/sistema/nomes
  let aliasMap = new Map<string, { machine_id: string; machine_name: string }>();
  if (externalNames.length > 0) {
    const { data: aliases } = await ctx.supabase
      .from('machine_aliases')
      .select('external_name, machine_id, machine:machines(name)')
      .eq('tenant_id', ctx.tenantId)
      .eq('source', system)
      .in('external_name', externalNames);

    for (const a of aliases ?? []) {
      const m = Array.isArray(a.machine) ? a.machine[0] : (a.machine as { name?: string } | null);
      aliasMap.set(a.external_name as string, {
        machine_id: a.machine_id as string,
        machine_name: m?.name ?? '(máquina removida)',
      });
    }
  }

  // Lista de máquinas do tenant para o dropdown
  const { data: availableMachines } = await ctx.supabase
    .from('machines')
    .select('id, name, code')
    .eq('tenant_id', ctx.tenantId)
    .order('name');

  const machines = externalNames.map(name => {
    const alias = aliasMap.get(name);
    return {
      external_name: name,
      sales_count: salesCount.get(name) ?? 0,
      mapped_machine_id: alias?.machine_id ?? null,
      mapped_machine_name: alias?.machine_name ?? null,
    };
  });

  return NextResponse.json({
    data: {
      system,
      summary: {
        total_records: parsed.summary.total_records,
        valid_records: parsed.summary.valid_records,
        skipped_records: parsed.summary.skipped_records,
        total_revenue: parsed.summary.total_revenue,
        date_range: parsed.summary.date_range,
        cnpj_operador: parsed.summary.cnpj_operador,
        periodo: parsed.summary.periodo,
        format: parsed.summary.format,
        aggregated_transactions: parsed.summary.aggregated_transactions,
      },
      machines,
      available_machines: availableMachines ?? [],
    },
  });
}
