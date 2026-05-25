import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const supabase = await createClient();

  // Buscar dados em paralelo
  const [tenantsResult, invoicesResult, machinesResult] = await Promise.all([
    // Tenants por status
    supabase
      .from('tenants')
      .select('subscription_status, plan_id')
      .eq('is_active', true),

    // Faturas do mês atual
    supabase
      .schema('billing')
      .from('invoices')
      .select('status, total')
      .gte('reference_month', new Date().toISOString().slice(0, 7) + '-01'),

    // Total de máquinas
    supabase
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  const tenants = tenantsResult.data || [];
  const invoices = invoicesResult.data || [];
  const machinesCount = machinesResult.count || 0;

  // Calcular métricas
  const activeTenants = tenants.filter(t => t.subscription_status === 'active').length;
  const trialTenants = tenants.filter(t => t.subscription_status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspended').length;
  const overdueTenants = tenants.filter(t => t.subscription_status === 'overdue').length;

  // MRR (simplificado - soma das faturas pagas do mês)
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const mrr = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);

  // Inadimplência
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.total), 0);

  // Churn (simplificado)
  const totalTenants = tenants.length;
  const cancelledThisMonth = tenants.filter(t => t.subscription_status === 'cancelled').length;
  const churnRate = totalTenants > 0 ? (cancelledThisMonth / totalTenants) * 100 : 0;

  // Ticket médio
  const averageTicket = activeTenants > 0 ? mrr / activeTenants : 0;

  return NextResponse.json({
    success: true,
    data: {
      mrr,
      mrr_growth: 12, // TODO: calcular real comparando com mês anterior
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
