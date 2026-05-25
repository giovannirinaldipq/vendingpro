import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';
import { IMPERSONATION_SESSION_COOKIE, IMPERSONATION_COOKIE } from '@/lib/admin/impersonate';

const bodySchema = z.object({
  reason: z.string().optional(),
});

const TWO_HOURS_SECONDS = 60 * 60 * 2;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Verifica tenant existe
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, subscription_status')
    .eq('id', id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } }, { status: 404 });
  }

  const meta = extractRequestMeta(request);

  // Encerra qualquer sessão anterior do mesmo admin
  await supabaseAdmin
    .schema('admin')
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('admin_user_id', auth.admin.id)
    .is('ended_at', null);

  const { data: session, error } = await supabaseAdmin
    .schema('admin')
    .from('impersonation_sessions')
    .insert({
      admin_user_id: auth.admin.id,
      tenant_id: id,
      reason: parsed.data.reason ?? null,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    })
    .select('id, expires_at, started_at')
    .single();

  if (error || !session) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error?.message ?? 'create_failed' } }, { status: 500 });
  }

  await logAudit({
    adminUserId: auth.admin.id,
    action: 'tenant.impersonate_start',
    entityType: 'tenants',
    entityId: id,
    newValues: { session_id: session.id, reason: parsed.data.reason ?? null, company_name: tenant.company_name },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TWO_HOURS_SECONDS,
  });
  cookieStore.set(IMPERSONATION_COOKIE, id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TWO_HOURS_SECONDS,
  });

  return NextResponse.json({
    success: true,
    data: {
      session_id: session.id,
      tenant_id: id,
      tenant_name: tenant.company_name,
      expires_at: session.expires_at,
      redirect_to: '/app',
    },
  });
}
