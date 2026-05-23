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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  // Verificar se a máquina pertence ao tenant
  const { data: machine } = await supabase
    .from('machines')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!machine) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  // Buscar vendas recentes
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, sale_date, product_name, quantity, unit_price, total_price, payment_method')
    .eq('machine_id', id)
    .eq('tenant_id', tenantId)
    .order('sale_date', { ascending: false })
    .limit(limit);

  if (salesError) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: salesError.message } },
      { status: 500 }
    );
  }

  // Calcular estatísticas dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: statsData } = await supabase
    .from('sales')
    .select('product_name, quantity, total_price')
    .eq('machine_id', id)
    .eq('tenant_id', tenantId)
    .gte('sale_date', startDate);

  // Agregar estatísticas
  let totalRevenue = 0;
  let totalSales = 0;
  const productStats: Record<string, { count: number; revenue: number }> = {};

  (statsData || []).forEach((sale) => {
    const revenue = Number(sale.total_price) || 0;
    const qty = Number(sale.quantity) || 1;
    const product = sale.product_name || 'Desconhecido';

    totalRevenue += revenue;
    totalSales += qty;

    if (!productStats[product]) {
      productStats[product] = { count: 0, revenue: 0 };
    }
    productStats[product].count += qty;
    productStats[product].revenue += revenue;
  });

  const topProducts = Object.entries(productStats)
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      revenue: Math.round(stats.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: {
      sales: sales || [],
      stats: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_sales: totalSales,
        average_ticket: totalSales > 0 ? Math.round((totalRevenue / totalSales) * 100) / 100 : 0,
        top_products: topProducts,
      },
    },
  });
}
