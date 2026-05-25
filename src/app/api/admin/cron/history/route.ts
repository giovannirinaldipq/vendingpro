import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const kind = request.nextUrl.searchParams.get('kind');
  const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') || '20'));

  let query = supabaseAdmin
    .schema('admin')
    .from('cron_runs')
    .select('id, kind, triggered_by, started_at, finished_at, success, summary, errors, duration_ms, admin:triggered_by_admin(name, email)')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
