import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

const bodySchema = z.object({
  reason: z.string().min(3, 'Informe o motivo do cancelamento'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin']);
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
    .select('id, subscription_status')
    .eq('id', id)
    .maybeSingle();

  if (!prev) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({
      subscription_status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: parsed.data.reason,
      status_changed_at: now,
      status_changed_by: auth.admin.id,
      status_change_reason: parsed.data.reason,
      is_active: false,
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
    action: 'tenant.cancelled',
    entityType: 'tenants',
    entityId: id,
    oldValues: { subscription_status: prev.subscription_status },
    newValues: { subscription_status: 'cancelled', reason: parsed.data.reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data });
}
