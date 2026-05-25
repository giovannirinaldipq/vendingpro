import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfWeek = new Date(today.getTime() - 7 * 86400000).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [todayRes, weekRes, monthRes] = await Promise.all([
    supabaseAdmin.schema('billing').from('payments').select('amount').gte('payment_date', startOfDay.slice(0, 10)),
    supabaseAdmin.schema('billing').from('payments').select('amount').gte('payment_date', startOfWeek.slice(0, 10)),
    supabaseAdmin.schema('billing').from('payments').select('amount').gte('payment_date', startOfMonth.slice(0, 10)),
  ]);

  const sum = (rows: { amount: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const count = (rows: { amount: number | null }[] | null) => (rows ?? []).length;

  return NextResponse.json({
    success: true,
    data: {
      today: { total: sum(todayRes.data), count: count(todayRes.data) },
      week: { total: sum(weekRes.data), count: count(weekRes.data) },
      month: { total: sum(monthRes.data), count: count(monthRes.data) },
    },
  });
}
