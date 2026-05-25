import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getActiveImpersonation } from '@/lib/admin/impersonate';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const impersonation = await getActiveImpersonation();
  if (!impersonation || impersonation.session.admin_user_id !== auth.admin.id) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      session_id: impersonation.session.id,
      tenant_id: impersonation.tenant.id,
      tenant_name: impersonation.tenant.company_name,
      contact_name: impersonation.tenant.contact_name,
      subscription_status: impersonation.tenant.subscription_status,
      expires_at: impersonation.session.expires_at,
      started_at: impersonation.session.started_at,
    },
  });
}
