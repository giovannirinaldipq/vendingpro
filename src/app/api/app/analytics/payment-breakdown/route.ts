import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/app/analytics/payment-breakdown
 *
 * Query:
 *  - days: 7 | 30 | 90 | 180 | 365 | all (default 30)
 *  - machine_id (opcional)
 *
 * Retorna:
 *  - rows: [{ payment_method, transaction_count, items_sold, revenue, share_percent }]
 *  - total_revenue, total_transactions
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return NextResponse.json({ success: false, error: { code: 'NO_TENANT' } }, { status: 403 });
  }
  const tenantId = profile.tenant_id;

  const daysParam = req.nextUrl.searchParams.get('days') ?? '30';
  const machineId = req.nextUrl.searchParams.get('machine_id') ?? '';
  const days = daysParam === 'all' ? null : Math.max(1, Math.min(365, parseInt(daysParam, 10) || 30));

  let q = supabaseAdmin
    .from('sales')
    .select('payment_method, quantity, total_price')
    .eq('tenant_id', tenantId);

  if (days) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    q = q.gte('sale_date', since.toISOString().slice(0, 10));
  }
  if (machineId) q = q.eq('machine_id', machineId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

  // Agrega em memória — sales pode ter milhares de rows, é OK pra 1 ano
  const agg = new Map<string, { transaction_count: number; items_sold: number; revenue: number }>();
  let totalRevenue = 0;
  let totalTx = 0;
  for (const s of (data ?? [])) {
    const pm = (s.payment_method ?? 'unknown') as string;
    const prev = agg.get(pm) ?? { transaction_count: 0, items_sold: 0, revenue: 0 };
    prev.transaction_count += 1;
    prev.items_sold += Number(s.quantity ?? 1);
    prev.revenue += Number(s.total_price ?? 0);
    agg.set(pm, prev);
    totalRevenue += Number(s.total_price ?? 0);
    totalTx += 1;
  }

  const rows = [...agg.entries()]
    .map(([payment_method, v]) => ({
      payment_method,
      transaction_count: v.transaction_count,
      items_sold: v.items_sold,
      revenue: Math.round(v.revenue * 100) / 100,
      share_percent: totalRevenue > 0
        ? Math.round((v.revenue / totalRevenue) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    success: true,
    data: {
      rows,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_transactions: totalTx,
      days,
    },
  });
}
