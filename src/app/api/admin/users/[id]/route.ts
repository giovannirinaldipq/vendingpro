import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin, ALL_ADMIN_ROLES, type AdminRole } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ALL_ADMIN_ROLES as [AdminRole, ...AdminRole[]]).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('id, email, name, role, is_active, last_login_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  const { data: before } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('email, name, role, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, email, name, role, is_active, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = extractRequestMeta(req);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'admin_user.updated',
    entityType: 'admin.users',
    entityId: id,
    oldValues: before,
    newValues: body,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  if (id === auth.admin.id) {
    return NextResponse.json({ error: 'cannot_disable_self' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = extractRequestMeta(req);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'admin_user.deactivated',
    entityType: 'admin.users',
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
