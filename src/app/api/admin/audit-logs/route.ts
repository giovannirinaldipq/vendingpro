import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') || '50')));
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entity_type') || '';
  const entityId = searchParams.get('entity_id') || '';
  const adminUserId = searchParams.get('admin_user_id') || '';
  const fromDate = searchParams.get('from') || '';
  const toDate = searchParams.get('to') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .schema('admin')
    .from('audit_logs')
    .select(`
      id, action, entity_type, entity_id,
      old_values, new_values, ip_address, user_agent, created_at,
      admin:admin_user_id(id, name, email, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action) query = query.ilike('action', `%${action}%`);
  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  if (adminUserId) query = query.eq('admin_user_id', adminUserId);
  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate) query = query.lte('created_at', toDate);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      logs: data,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    },
  });
}
