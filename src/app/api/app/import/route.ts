import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseVMPayFile } from '@/lib/parsers/vmpay';
import { parseVendPagoFile } from '@/lib/parsers/vendpago';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return userProfile?.tenant_id || null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const system = formData.get('system') as string; // 'vmpay' ou 'vendpago'

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado' } },
        { status: 400 }
      );
    }

    // Ler arquivo
    const buffer = await file.arrayBuffer();

    // Parsear baseado no sistema
    let parseResult;
    let importSource: 'vmpay' | 'vendpago';
    if (system === 'vendpago') {
      parseResult = parseVendPagoFile(buffer);
      importSource = 'vendpago';
    } else if (system === 'vmpay' || !system) {
      parseResult = parseVMPayFile(buffer);
      importSource = 'vmpay';
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'UNSUPPORTED', message: `Sistema "${system}" não suportado. Use 'vmpay' ou 'vendpago'.` } },
        { status: 400 }
      );
    }

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'PARSE_ERROR', message: parseResult.errors.join(', ') } },
        { status: 400 }
      );
    }

    // Buscar máquinas do tenant para mapear códigos
    const { data: machines } = await supabase
      .from('machines')
      .select('id, code, telemetry_id')
      .eq('tenant_id', tenantId);

    const machineMap = new Map<string, string>();
    machines?.forEach(m => {
      machineMap.set(m.code, m.id);
      if (m.telemetry_id) {
        machineMap.set(m.telemetry_id, m.id);
      }
    });

    // Preparar vendas para inserção
    const salesToInsert: Array<{
      tenant_id: string;
      machine_id: string;
      sale_date: string;
      sale_time: string;
      sale_datetime: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      payment_method: string;
      raw_data: Record<string, unknown>;
    }> = [];

    const unmappedMachines = new Set<string>();
    const duplicatesSkipped = 0;

    for (const sale of parseResult.sales) {
      const machineId = machineMap.get(sale.machine_code);

      if (!machineId) {
        unmappedMachines.add(sale.machine_code);
        continue;
      }

      salesToInsert.push({
        tenant_id: tenantId,
        machine_id: machineId,
        sale_date: sale.sale_date,
        sale_time: sale.sale_time,
        sale_datetime: sale.sale_datetime,
        product_name: sale.product_name,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        total_price: sale.total_price,
        payment_method: sale.payment_method,
        raw_data: {
          product_code: sale.product_code,
          barcode: sale.barcode,
          category: sale.category,
          import_source: importSource,
          ...sale.raw_data,
        },
      });
    }

    // Inserir em lotes de 500
    let insertedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < salesToInsert.length; i += batchSize) {
      const batch = salesToInsert.slice(i, i + batchSize);

      const { error } = await supabase
        .from('sales')
        .upsert(batch, {
          onConflict: 'tenant_id,machine_id,sale_datetime,product_name',
          ignoreDuplicates: true,
        });

      if (error) {
        console.error('Erro ao inserir lote:', error);
        // Continuar mesmo com erro
      } else {
        insertedCount += batch.length;
      }
    }

    // Registrar importação
    const importRecord = {
      tenant_id: tenantId,
      filename: file.name,
      system: system || 'vmpay',
      total_records: parseResult.summary.total_records,
      imported_records: insertedCount,
      skipped_records: parseResult.summary.skipped_records + unmappedMachines.size * (parseResult.sales.length / parseResult.summary.machines.length),
      date_range_start: parseResult.summary.date_range.start,
      date_range_end: parseResult.summary.date_range.end,
      machines_found: parseResult.summary.machines,
      unmapped_machines: Array.from(unmappedMachines),
    };

    return NextResponse.json({
      success: true,
      data: {
        imported: insertedCount,
        total_in_file: parseResult.summary.valid_records,
        skipped: parseResult.summary.skipped_records,
        duplicates: duplicatesSkipped,
        unmapped_machines: Array.from(unmappedMachines),
        date_range: parseResult.summary.date_range,
        total_revenue: parseResult.summary.total_revenue,
        machines_in_file: parseResult.summary.machines,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao processar importação' } },
      { status: 500 }
    );
  }
}
