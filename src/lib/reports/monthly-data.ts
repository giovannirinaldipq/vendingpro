import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateTenantResult } from '@/lib/finance';

export interface MonthlyReportData {
  tenant_id: string;
  tenant_name: string;
  reference_month: string; // YYYY-MM
  generated_at: string;
  period_label: string;
  totals: {
    revenue: number;
    fees: number;
    cmv: number;
    fixed_costs: number;
    net_result: number;
    sales_count: number;
  };
  top_machines: Array<{ name: string; revenue: number; net_result: number; sales_count: number; }>;
  bottom_machines: Array<{ name: string; revenue: number; net_result: number; sales_count: number; }>;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  alerts: { active: number; critical: number; high: number; resolved_in_period: number };
  visits_count: number;
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export async function buildMonthlyReport(tenantId: string, monthYYYYMM: string): Promise<MonthlyReportData> {
  const [yearStr, monthStr] = monthYYYYMM.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const periodDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / 86400000);

  const { data: tenant } = await supabaseAdmin
    .from('tenants').select('company_name').eq('id', tenantId).single();

  // Resultado consolidado (usa lib finance)
  const summary = await calculateTenantResult(tenantId, periodDays);

  // Top/bottom máquinas
  const sorted = [...summary.per_machine].sort((a, b) => b.revenue - a.revenue);
  const top = sorted.slice(0, 5).map(m => ({ name: m.machine_name ?? '?', revenue: m.revenue, net_result: m.net_result, sales_count: m.sales_count }));
  const bottom = sorted.filter(m => m.sales_count > 0).slice(-3).reverse().map(m => ({ name: m.machine_name ?? '?', revenue: m.revenue, net_result: m.net_result, sales_count: m.sales_count }));

  // Top produtos do mês
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('product_name, quantity, total_price')
    .eq('tenant_id', tenantId)
    .gte('sale_datetime', monthStart.toISOString())
    .lte('sale_datetime', monthEnd.toISOString());
  const productAgg = new Map<string, { quantity: number; revenue: number }>();
  for (const s of sales ?? []) {
    const name = (s.product_name as string) || 'Desconhecido';
    const cur = productAgg.get(name) ?? { quantity: 0, revenue: 0 };
    cur.quantity += Number(s.quantity ?? 1);
    cur.revenue += Number(s.total_price ?? 0);
    productAgg.set(name, cur);
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Alertas
  const { count: activeCount } = await supabaseAdmin
    .from('alerts').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('status', 'active');
  const { count: criticalCount } = await supabaseAdmin
    .from('alerts').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('status', 'active').eq('severity', 'critical');
  const { count: highCount } = await supabaseAdmin
    .from('alerts').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('status', 'active').eq('severity', 'high');
  const { count: resolvedCount } = await supabaseAdmin
    .from('alerts').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('status', 'resolved')
    .gte('resolved_at', monthStart.toISOString()).lte('resolved_at', monthEnd.toISOString());

  // Visitas
  const { count: visitsCount } = await supabaseAdmin
    .from('restocking_visits').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('checkin_at', monthStart.toISOString())
    .lte('checkin_at', monthEnd.toISOString());

  return {
    tenant_id: tenantId,
    tenant_name: tenant?.company_name ?? 'Cliente',
    reference_month: monthYYYYMM,
    generated_at: new Date().toISOString(),
    period_label: `${MONTH_LABELS[month - 1]} de ${year}`,
    totals: summary.total,
    top_machines: top,
    bottom_machines: bottom,
    top_products: topProducts,
    alerts: {
      active: activeCount ?? 0,
      critical: criticalCount ?? 0,
      high: highCount ?? 0,
      resolved_in_period: resolvedCount ?? 0,
    },
    visits_count: visitsCount ?? 0,
  };
}

export async function listActiveTenants(): Promise<{ id: string; financial_email: string | null; contact_email: string }[]> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, financial_email, contact_email')
    .in('subscription_status', ['active', 'overdue']);
  return data ?? [];
}
