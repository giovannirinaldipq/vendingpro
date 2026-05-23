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
  const machineId = searchParams.get('machine_id');

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: {
        heatmap: [],
        daily_sales: [],
        weekday_sales: [],
        top_products: [],
        summary: { total_revenue: 0, total_sales: 0, average_ticket: 0 },
      },
    });
  }

  // Calcular data inicial baseado no período
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default: // 30d
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Query base
  let query = supabase
    .from('sales')
    .select('sale_date, sale_time, total_price, quantity, product_name')
    .eq('tenant_id', tenantId)
    .gte('sale_date', startDateStr);

  if (machineId) {
    query = query.eq('machine_id', machineId);
  }

  const { data: sales, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Processar dados para heatmap (hora x dia da semana)
  const heatmapData: Record<string, number> = {};
  const dailySales: Record<string, { revenue: number; count: number }> = {};
  const weekdaySales: Record<number, { revenue: number; count: number }> = {};
  const productSales: Record<string, { revenue: number; count: number }> = {};

  let totalRevenue = 0;
  let totalSalesCount = 0;

  (sales || []).forEach((sale) => {
    const date = new Date(sale.sale_date);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const hour = parseInt(sale.sale_time?.split(':')[0] || '0', 10);
    const revenue = Number(sale.total_price) || 0;
    const qty = Number(sale.quantity) || 1;

    totalRevenue += revenue;
    totalSalesCount += qty;

    // Heatmap
    const heatmapKey = `${dayOfWeek}-${hour}`;
    heatmapData[heatmapKey] = (heatmapData[heatmapKey] || 0) + qty;

    // Daily sales
    const dateKey = sale.sale_date;
    if (!dailySales[dateKey]) {
      dailySales[dateKey] = { revenue: 0, count: 0 };
    }
    dailySales[dateKey].revenue += revenue;
    dailySales[dateKey].count += qty;

    // Weekday sales
    if (!weekdaySales[dayOfWeek]) {
      weekdaySales[dayOfWeek] = { revenue: 0, count: 0 };
    }
    weekdaySales[dayOfWeek].revenue += revenue;
    weekdaySales[dayOfWeek].count += qty;

    // Product sales
    const productName = sale.product_name || 'Desconhecido';
    if (!productSales[productName]) {
      productSales[productName] = { revenue: 0, count: 0 };
    }
    productSales[productName].revenue += revenue;
    productSales[productName].count += qty;
  });

  // Formatar heatmap
  const heatmap = Object.entries(heatmapData).map(([key, value]) => {
    const [day, hour] = key.split('-').map(Number);
    return { day, hour, value };
  });

  // Formatar daily sales (ordenado por data)
  const daily_sales = Object.entries(dailySales)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Formatar weekday sales
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekday_sales = weekdayNames.map((name, index) => ({
    day: name,
    revenue: weekdaySales[index]?.revenue || 0,
    count: weekdaySales[index]?.count || 0,
  }));

  // Top 10 produtos
  const top_products = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: {
      heatmap,
      daily_sales,
      weekday_sales,
      top_products,
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_sales: totalSalesCount,
        average_ticket: totalSalesCount > 0 ? Math.round((totalRevenue / totalSalesCount) * 100) / 100 : 0,
      },
    },
  });
}
