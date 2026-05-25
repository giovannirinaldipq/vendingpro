import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';

function monthStartIso(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const supabase = await createClient();

  const now = new Date();
  const currentMonthStart = monthStartIso(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthStart = monthStartIso(prevDate.getUTCFullYear(), prevDate.getUTCMonth() + 1);

  // Buscar dados em paralelo
  const [tenantsResult, currentInvoicesResult, prevInvoicesResult, machinesResult] = await Promise.all([
    supabase
      .from('tenants')
      .select('subscription_status, plan_id')
      .eq('is_active', true),

    supabase
      .schema('billing')
      .from('invoices')
      .select('status, total')
      .gte('reference_month', currentMonthStart),

    supabase
      .schema('billing')
      .from('invoices')
      .select('status, total')
      .gte('reference_month', prevMonthStart)
      .lt('reference_month', currentMonthStart),

    supabase
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  const tenants = tenantsResult.data || [];
  const currentInvoices = currentInvoicesResult.data || [];
  const prevInvoices = prevInvoicesResult.data || [];
  const machinesCount = machinesResult.count || 0;

  const activeTenants = tenants.filter(t => t.subscription_status === 'active').length;
  const trialTenants = tenants.filter(t => t.subscription_status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspended').length;
  const overdueTenants = tenants.filter(t => t.subscription_status === 'overdue').length;

  const mrr = currentInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0);

  const prevMrr = prevInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0);

  // Crescimento real: (current - previous) / previous * 100
  // Se mês anterior foi 0, evita divisão por zero — retorna 100 se houve faturamento, 0 se não
  let mrrGrowth: number;
  if (prevMrr === 0) {
    mrrGrowth = mrr > 0 ? 100 : 0;
  } else {
    mrrGrowth = Math.round(((mrr - prevMrr) / prevMrr) * 1000) / 10; // 1 casa decimal
  }

  const overdueInvoices = currentInvoices.filter(i => i.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.total), 0);

  const totalTenants = tenants.length;
  const cancelledThisMonth = tenants.filter(t => t.subscription_status === 'cancelled').length;
  const churnRate = totalTenants > 0 ? (cancelledThisMonth / totalTenants) * 100 : 0;

  const averageTicket = activeTenants > 0 ? mrr / activeTenants : 0;

  return NextResponse.json({
    success: true,
    data: {
      mrr,
      mrr_growth: mrrGrowth,
      mrr_previous: prevMrr,
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      trial_tenants: trialTenants,
      suspended_tenants: suspendedTenants,
      overdue_tenants: overdueTenants,
      total_machines: machinesCount,
      churn_rate: churnRate,
      average_ticket: averageTicket,
      overdue_amount: overdueAmount,
      overdue_count: overdueInvoices.length,
    },
  });
}
