import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';
import { sendTrialActivated } from '@/lib/email/send';

const bodySchema = z.object({
  reason: z.string().optional(),
  notify_email: z.boolean().optional().default(true),
  new_status: z.enum(['active', 'trial']).optional().default('active'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin', 'financial', 'commercial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data: prev } = await supabaseAdmin
    .from('tenants')
    .select('id, subscription_status, company_name, contact_name, contact_email')
    .eq('id', id)
    .maybeSingle();

  if (!prev) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } }, { status: 404 });
  }
  if (!['suspended', 'cancelled', 'overdue'].includes(prev.subscription_status)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_STATE', message: `Cliente já está em "${prev.subscription_status}"` } },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({
      subscription_status: parsed.data.new_status,
      suspended_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      reactivated_at: now,
      status_changed_at: now,
      status_changed_by: auth.admin.id,
      status_change_reason: parsed.data.reason ?? 'Reativação manual via admin',
      is_active: true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'tenant.reactivated',
    entityType: 'tenants',
    entityId: id,
    oldValues: { subscription_status: prev.subscription_status },
    newValues: { subscription_status: parsed.data.new_status, reason: parsed.data.reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (parsed.data.notify_email && prev.contact_email) {
    void sendTrialActivated(
      { company_name: prev.company_name, contact_name: prev.contact_name },
      prev.contact_email
    );
  }

  return NextResponse.json({ success: true, data });
}
