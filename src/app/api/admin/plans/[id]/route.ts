import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updatePlanSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;
  const parsed = updatePlanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('billing_plans_view')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'plan.updated',
    entityType: 'billing.plans',
    entityId: id,
    newValues: parsed.data as unknown as Record<string, unknown>,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;

  const { count, error: countErr } = await supabaseAdmin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', id);

  if (countErr) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: countErr.message } }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    // Soft-disable se houver clientes vinculados
    const { error: updErr } = await supabaseAdmin
      .from('billing_plans_view')
      .update({ is_active: false })
      .eq('id', id);

    if (updErr) {
      return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: updErr.message } }, { status: 500 });
    }

    const meta = extractRequestMeta(request);
    await logAudit({
      adminUserId: auth.admin.id,
      action: 'plan.deactivated',
      entityType: 'billing.plans',
      entityId: id,
      newValues: { reason: `${count} clientes vinculados — desativado em vez de excluído` },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      success: true,
      data: { soft_deleted: true, clients_using: count },
    });
  }

  const { error } = await supabaseAdmin
    .from('billing_plans_view')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'plan.deleted',
    entityType: 'billing.plans',
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
