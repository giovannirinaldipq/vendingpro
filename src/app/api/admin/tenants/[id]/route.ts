import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updateTenantSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Buscar plano separadamente (cross-schema)
  let plan = null;
  if (data.plan_id) {
    const { data: planData } = await supabaseAdmin
      .from('billing_plans_view')
      .select('*')
      .eq('id', data.plan_id)
      .maybeSingle();
    plan = planData;
  }

  return NextResponse.json({ success: true, data: { ...data, plan } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin', 'commercial', 'financial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const validation = updateTenantSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'tenant.updated',
    entityType: 'tenants',
    entityId: id,
    newValues: validation.data as unknown as Record<string, unknown>,
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
  const supabase = await createClient();

  // Soft delete - apenas marca como cancelado
  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'tenant.cancelled',
    entityType: 'tenants',
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data: { message: 'Cliente cancelado com sucesso' } });
}
