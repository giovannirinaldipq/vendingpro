import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const restockerId = sp.get('restocker_id');
  const machineId = sp.get('machine_id');
  const from = sp.get('from');
  const to = sp.get('to');
  const status = sp.get('status'); // 'open' | 'closed' | 'all'
  const page = parseInt(sp.get('page') || '1');
  const perPage = parseInt(sp.get('per_page') || '50');

  let query = ctx.supabase
    .from('restocking_visits')
    .select(`
      *,
      machine:machines(id, name, code),
      restocker:restockers(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('checkin_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (restockerId) query = query.eq('restocker_id', restockerId);
  if (machineId) query = query.eq('machine_id', machineId);
  if (from) query = query.gte('checkin_at', from);
  if (to) query = query.lte('checkin_at', to);
  if (status === 'open') query = query.is('checkout_at', null);
  else if (status === 'closed') query = query.not('checkout_at', 'is', null);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
