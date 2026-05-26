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

  // Período unificado: últimos 30 dias vs 30-60 dias anteriores.
  // Antes era "mês atual" vs "mês anterior", o que conflitava com o hero
  // de "Lucro líquido 30D" que vem de /api/app/financeiro/summary?period_days=30.
  const now = new Date();
  const startCurrent = new Date(now.getTime() - 30 * 86400000);
  const startPrevious = new Date(now.getTime() - 60 * 86400000);
  const startCurrentStr = startCurrent.toISOString().split('T')[0];
  const startPreviousStr = startPrevious.toISOString().split('T')[0];

  const [
    currentSales,
    previousSales,
    machinesResult,
    alertsResult,
    lastSaleResult,
  ] = await Promise.all([
    // Vendas dos últimos 30 dias
    supabase
      .from('sales')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .gte('sale_date', startCurrentStr),

    // Vendas dos 30 dias anteriores (30-60d atrás) para comparação
    supabase
      .from('sales')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .gte('sale_date', startPreviousStr)
      .lt('sale_date', startCurrentStr),

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

    // Última venda importada (pra lembrar de subir planilha do dia)
    supabase
      .from('sales')
      .select('sale_date')
      .eq('tenant_id', tenantId)
      .order('sale_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Calcular métricas dos últimos 30 dias
  const cur = currentSales.data || [];
  const totalRevenue = cur.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalSalesCount = cur.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Calcular métricas dos 30 dias anteriores
  const prev = previousSales.data || [];
  const lastRevenue = prev.reduce((sum, s) => sum + Number(s.total_price), 0);
  const lastSalesCount = prev.length;
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
      last_sale_date: lastSaleResult.data?.sale_date ?? null,
    },
  });
}
