import { supabaseAdmin } from '@/lib/supabase/admin';

export interface FinanceSettings {
  card_fee_percent: number;
  pix_fee_percent: number;
  cash_fee_percent: number;
}

export interface MachineResult {
  machine_id: string;
  machine_name?: string;
  period_days: number;
  revenue: number;
  fees: number;
  cmv: number;
  fixed_costs: number;
  gross_profit: number;
  net_result: number;
  is_loss: boolean;
  sales_count: number;
}

const DEFAULT_SETTINGS: FinanceSettings = {
  card_fee_percent: 4,
  pix_fee_percent: 0,
  cash_fee_percent: 0,
};

export async function getFinanceSettings(tenantId: string): Promise<FinanceSettings> {
  const { data } = await supabaseAdmin
    .from('finance_settings')
    .select('card_fee_percent, pix_fee_percent, cash_fee_percent')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) {
    // cria default se trigger não rodou ainda
    await supabaseAdmin.from('finance_settings').insert({ tenant_id: tenantId }).select();
    return DEFAULT_SETTINGS;
  }
  return {
    card_fee_percent: Number(data.card_fee_percent),
    pix_fee_percent: Number(data.pix_fee_percent),
    cash_fee_percent: Number(data.cash_fee_percent),
  };
}

/**
 * Calcula resultado financeiro de UMA máquina no período (dias).
 */
export async function calculateMachineResult(
  tenantId: string,
  machineId: string,
  periodDays = 30,
  settings?: FinanceSettings
): Promise<MachineResult> {
  const since = new Date(Date.now() - periodDays * 86400000).toISOString();
  const cfg = settings ?? (await getFinanceSettings(tenantId));

  // Vendas do período
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('quantity, total_price, payment_method, product_id, products(default_cost_price)')
    .eq('tenant_id', tenantId)
    .eq('machine_id', machineId)
    .gte('sale_datetime', since);

  let revenue = 0;
  let cmv = 0;
  let fees = 0;
  let salesCount = 0;
  for (const s of sales ?? []) {
    const total = Number(s.total_price ?? 0);
    const qty = Number(s.quantity ?? 1);
    revenue += total;
    salesCount++;
    const products = Array.isArray(s.products) ? s.products[0] : s.products;
    const cost = products?.default_cost_price != null ? Number(products.default_cost_price) : 0;
    cmv += qty * cost;
    const pm = String(s.payment_method ?? '').toLowerCase();
    if (pm.includes('credit') || pm.includes('cart') || pm.includes('card')) {
      fees += total * (cfg.card_fee_percent / 100);
    } else if (pm.includes('pix')) {
      fees += total * (cfg.pix_fee_percent / 100);
    } else {
      fees += total * (cfg.cash_fee_percent / 100);
    }
  }

  // Custos fixos ativos
  const { data: costs } = await supabaseAdmin
    .from('machine_costs')
    .select('amount, frequency')
    .eq('tenant_id', tenantId)
    .eq('machine_id', machineId)
    .eq('is_active', true);

  let fixedCostsForPeriod = 0;
  for (const c of costs ?? []) {
    const amount = Number(c.amount ?? 0);
    const freq = String(c.frequency);
    if (freq === 'monthly') fixedCostsForPeriod += (amount / 30) * periodDays;
    else if (freq === 'yearly') fixedCostsForPeriod += (amount / 365) * periodDays;
    else if (freq === 'one_time') fixedCostsForPeriod += 0; // ignora pra calculo recorrente
  }

  const grossProfit = revenue - fees - cmv;
  const netResult = grossProfit - fixedCostsForPeriod;

  return {
    machine_id: machineId,
    period_days: periodDays,
    revenue: round2(revenue),
    fees: round2(fees),
    cmv: round2(cmv),
    fixed_costs: round2(fixedCostsForPeriod),
    gross_profit: round2(grossProfit),
    net_result: round2(netResult),
    is_loss: netResult < 0,
    sales_count: salesCount,
  };
}

export async function calculateTenantResult(tenantId: string, periodDays = 30) {
  const settings = await getFinanceSettings(tenantId);

  const { data: machines } = await supabaseAdmin
    .from('machines')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  const results: MachineResult[] = [];
  for (const m of machines ?? []) {
    const r = await calculateMachineResult(tenantId, m.id, periodDays, settings);
    r.machine_name = m.name;
    results.push(r);
  }

  const total = results.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.fees += r.fees;
      acc.cmv += r.cmv;
      acc.fixed_costs += r.fixed_costs;
      acc.net_result += r.net_result;
      acc.sales_count += r.sales_count;
      return acc;
    },
    { revenue: 0, fees: 0, cmv: 0, fixed_costs: 0, net_result: 0, sales_count: 0 }
  );

  return {
    period_days: periodDays,
    total,
    per_machine: results,
    machines_in_loss: results.filter(r => r.is_loss).length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { supabaseAdmin as supabaseAdminFinance };
