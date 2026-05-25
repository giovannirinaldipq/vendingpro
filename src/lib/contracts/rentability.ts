import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateMachineResult, getFinanceSettings } from '@/lib/finance';

export interface ContractRow {
  location_id: string;
  location_name: string;
  contract_type: string | null;
  contract_value: number | null;
  commission_percent: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  days_until_end: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'no_contract';
  machine_count: number;
  net_result_30d: number;        // resultado das máquinas neste local
  rent_for_period: number;        // aluguel/comissão proporcional 30d
  rentability_30d: number;        // resultado - aluguel
  is_profitable: boolean;
}

export async function listContractsWithRentability(tenantId: string): Promise<ContractRow[]> {
  const periodDays = 30;
  const today = new Date();

  const { data: locations } = await supabaseAdmin
    .from('locations')
    .select(`
      id, name, contract_type, contract_value, commission_percent,
      contract_start_date, contract_end_date
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (!locations?.length) return [];

  const settings = await getFinanceSettings(tenantId);
  const results: ContractRow[] = [];

  for (const loc of locations) {
    const { data: machines } = await supabaseAdmin
      .from('machines')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('location_id', loc.id)
      .eq('status', 'active');

    let netResult = 0;
    for (const m of machines ?? []) {
      const r = await calculateMachineResult(tenantId, m.id, periodDays, settings);
      netResult += r.net_result;
    }

    let rentForPeriod = 0;
    if (loc.contract_type === 'rent' && loc.contract_value) {
      rentForPeriod = Number(loc.contract_value); // valor mensal
    } else if (loc.contract_type === 'commission' && loc.commission_percent) {
      // Para comissão precisamos da receita bruta — recalcular
      const { data: salesAgg } = await supabaseAdmin
        .from('sales')
        .select('total_price')
        .eq('tenant_id', tenantId)
        .in('machine_id', (machines ?? []).map(m => m.id))
        .gte('sale_datetime', new Date(today.getTime() - periodDays * 86400000).toISOString());
      const revenue = (salesAgg ?? []).reduce((s, x) => s + Number(x.total_price ?? 0), 0);
      rentForPeriod = revenue * (Number(loc.commission_percent) / 100);
    }

    let daysUntilEnd: number | null = null;
    let status: ContractRow['status'] = 'no_contract';
    if (loc.contract_end_date) {
      const end = new Date(loc.contract_end_date);
      daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / 86400000);
      if (daysUntilEnd < 0) status = 'expired';
      else if (daysUntilEnd <= 30) status = 'expiring_soon';
      else status = 'active';
    } else if (loc.contract_type) {
      status = 'active';
    }

    const rentability = netResult - rentForPeriod;

    results.push({
      location_id: loc.id,
      location_name: loc.name,
      contract_type: loc.contract_type,
      contract_value: loc.contract_value != null ? Number(loc.contract_value) : null,
      commission_percent: loc.commission_percent != null ? Number(loc.commission_percent) : null,
      contract_start_date: loc.contract_start_date,
      contract_end_date: loc.contract_end_date,
      days_until_end: daysUntilEnd,
      status,
      machine_count: (machines ?? []).length,
      net_result_30d: round2(netResult),
      rent_for_period: round2(rentForPeriod),
      rentability_30d: round2(rentability),
      is_profitable: rentability >= 0,
    });
  }

  // Ordena: prejuízo > vencendo > resto
  results.sort((a, b) => {
    if (a.is_profitable !== b.is_profitable) return a.is_profitable ? 1 : -1;
    const order = { expired: 0, expiring_soon: 1, active: 2, no_contract: 3 };
    return order[a.status] - order[b.status];
  });

  return results;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
