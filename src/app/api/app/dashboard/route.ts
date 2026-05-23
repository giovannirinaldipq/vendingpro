import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Verificar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
  }

  // Buscar tenant do usuário
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = userProfile?.tenant_id;

  if (!tenantId) {
    // Usuário admin sem tenant - retornar dados vazios
    return NextResponse.json({
      success: true,
      data: {
        total_revenue: 0,
        revenue_growth: 0,
        total_sales: 0,
        sales_growth: 0,
        average_ticket: 0,
        ticket_growth: 0,
        active_machines: 0,
        machines_with_issues: 0,
        pending_alerts: 0,
      },
    });
  }

  // Datas para cálculos
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Buscar dados em paralelo
  const [
    currentMonthSales,
    lastMonthSales,
    machinesResult,
    alertsResult,
  ] = await Promise.all([
    // Vendas do mês atual
    supabase
      .from('sales')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .gte('sale_date', startOfMonth.toISOString().split('T')[0]),

    // Vendas do mês anterior
    supabase
      .from('sales')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .gte('sale_date', startOfLastMonth.toISOString().split('T')[0])
      .lte('sale_date', endOfLastMonth.toISOString().split('T')[0]),

    // Máquinas
    supabase
      .from('machines')
      .select('status')
      .eq('tenant_id', tenantId),

    // Alertas pendentes
    supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ]);

  // Calcular métricas do mês atual
  const currentSales = currentMonthSales.data || [];
  const totalRevenue = currentSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalSalesCount = currentSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Calcular métricas do mês anterior
  const lastSales = lastMonthSales.data || [];
  const lastRevenue = lastSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const lastSalesCount = lastSales.length;
  const lastAverageTicket = lastSalesCount > 0 ? lastRevenue / lastSalesCount : 0;

  // Calcular crescimento
  const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
  const salesGrowth = lastSalesCount > 0 ? ((totalSalesCount - lastSalesCount) / lastSalesCount) * 100 : 0;
  const ticketGrowth = lastAverageTicket > 0 ? ((averageTicket - lastAverageTicket) / lastAverageTicket) * 100 : 0;

  // Máquinas
  const machines = machinesResult.data || [];
  const activeMachines = machines.filter(m => m.status === 'active').length;
  const machinesWithIssues = machines.filter(m => m.status === 'maintenance' || m.status === 'inactive').length;

  return NextResponse.json({
    success: true,
    data: {
      total_revenue: totalRevenue,
      revenue_growth: Math.round(revenueGrowth * 10) / 10,
      total_sales: totalSalesCount,
      sales_growth: Math.round(salesGrowth * 10) / 10,
      average_ticket: averageTicket,
      ticket_growth: Math.round(ticketGrowth * 10) / 10,
      active_machines: activeMachines,
      machines_with_issues: machinesWithIssues,
      pending_alerts: alertsResult.count || 0,
    },
  });
}
