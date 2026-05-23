import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '30d';
  const sortBy = searchParams.get('sort') || 'revenue'; // revenue, sales, ticket

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: {
        machines: [],
        products: [],
        health_scores: [],
      },
    });
  }

  // Calcular data inicial
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Buscar vendas com máquinas
  const { data: sales } = await supabase
    .from('sales')
    .select('machine_id, total_price, quantity, product_name')
    .eq('tenant_id', tenantId)
    .gte('sale_date', startDateStr);

  // Buscar máquinas
  const { data: machines } = await supabase
    .from('machines')
    .select('id, code, name, status, location:locations(name)')
    .eq('tenant_id', tenantId)
    .neq('status', 'deactivated');

  // Agregar por máquina
  const machineStats: Record<string, { revenue: number; sales: number; products: Set<string> }> = {};
  const productStats: Record<string, { revenue: number; sales: number; machines: Set<string> }> = {};

  (sales || []).forEach((sale) => {
    const machineId = sale.machine_id;
    const revenue = Number(sale.total_price) || 0;
    const qty = Number(sale.quantity) || 1;
    const product = sale.product_name || 'Desconhecido';

    // Machine stats
    if (!machineStats[machineId]) {
      machineStats[machineId] = { revenue: 0, sales: 0, products: new Set() };
    }
    machineStats[machineId].revenue += revenue;
    machineStats[machineId].sales += qty;
    machineStats[machineId].products.add(product);

    // Product stats
    if (!productStats[product]) {
      productStats[product] = { revenue: 0, sales: 0, machines: new Set() };
    }
    productStats[product].revenue += revenue;
    productStats[product].sales += qty;
    productStats[product].machines.add(machineId);
  });

  // Calcular médias para health score
  const allRevenues = Object.values(machineStats).map(s => s.revenue);
  const avgRevenue = allRevenues.length > 0 ? allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length : 0;

  // Formatar ranking de máquinas
  const machineRanking = (machines || []).map((machine) => {
    const stats = machineStats[machine.id] || { revenue: 0, sales: 0, products: new Set() };
    const ticket = stats.sales > 0 ? stats.revenue / stats.sales : 0;

    // Health score (0-100)
    let healthScore = 50; // Base
    if (stats.revenue > 0) {
      const revenueRatio = avgRevenue > 0 ? stats.revenue / avgRevenue : 1;
      healthScore = Math.min(100, Math.max(0, Math.round(revenueRatio * 50 + 25)));
    }
    if (machine.status === 'maintenance') healthScore = Math.min(healthScore, 30);
    if (machine.status === 'inactive') healthScore = Math.min(healthScore, 10);

    return {
      id: machine.id,
      code: machine.code,
      name: machine.name,
      location: (machine.location as { name: string } | { name: string }[] | null)
        ? (Array.isArray(machine.location) ? machine.location[0]?.name : (machine.location as { name: string })?.name) || 'Sem local'
        : 'Sem local',
      status: machine.status,
      revenue: Math.round(stats.revenue * 100) / 100,
      sales: stats.sales,
      ticket: Math.round(ticket * 100) / 100,
      products_count: stats.products.size,
      health_score: healthScore,
    };
  });

  // Ordenar
  machineRanking.sort((a, b) => {
    switch (sortBy) {
      case 'sales':
        return b.sales - a.sales;
      case 'ticket':
        return b.ticket - a.ticket;
      case 'health':
        return b.health_score - a.health_score;
      default:
        return b.revenue - a.revenue;
    }
  });

  // Formatar ranking de produtos
  const productRanking = Object.entries(productStats)
    .map(([name, stats]) => ({
      name,
      revenue: Math.round(stats.revenue * 100) / 100,
      sales: stats.sales,
      machines_count: stats.machines.size,
      ticket: stats.sales > 0 ? Math.round((stats.revenue / stats.sales) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  // Health scores summary
  const healthScores = machineRanking.map(m => ({
    id: m.id,
    code: m.code,
    name: m.name,
    score: m.health_score,
    status: m.status,
    issues: [] as string[],
  }));

  // Adicionar issues
  healthScores.forEach(m => {
    if (m.score < 30) m.issues.push('Receita muito baixa');
    if (m.status === 'maintenance') m.issues.push('Em manutenção');
    if (m.status === 'inactive') m.issues.push('Inativa');
    const machineData = machineRanking.find(mr => mr.id === m.id);
    if (machineData && machineData.sales === 0) m.issues.push('Sem vendas no período');
  });

  return NextResponse.json({
    success: true,
    data: {
      machines: machineRanking,
      products: productRanking,
      health_scores: healthScores.sort((a, b) => a.score - b.score),
      summary: {
        total_machines: machineRanking.length,
        active_machines: machineRanking.filter(m => m.status === 'active').length,
        avg_revenue: avgRevenue,
        machines_with_issues: healthScores.filter(h => h.score < 50).length,
      },
    },
  });
}
