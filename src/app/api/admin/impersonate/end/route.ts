import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';
import { IMPERSONATION_SESSION_COOKIE, IMPERSONATION_COOKIE } from '@/lib/admin/impersonate';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(IMPERSONATION_SESSION_COOKIE)?.value;

  if (sessionId) {
    const { data: session } = await supabaseAdmin
      .schema('admin')
      .from('impersonation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('admin_user_id', auth.admin.id)
      .is('ended_at', null)
      .select('tenant_id')
      .maybeSingle();

    if (session) {
      const meta = extractRequestMeta(request);
      await logAudit({
        adminUserId: auth.admin.id,
        action: 'tenant.impersonate_end',
        entityType: 'tenants',
        entityId: session.tenant_id,
        newValues: { session_id: sessionId },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }
  }

  cookieStore.delete(IMPERSONATION_SESSION_COOKIE);
  cookieStore.delete(IMPERSONATION_COOKIE);

  return NextResponse.json({ success: true, data: { redirect_to: '/admin' } });
}
