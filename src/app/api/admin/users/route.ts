import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin, ALL_ADMIN_ROLES, type AdminRole } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(ALL_ADMIN_ROLES as [AdminRole, ...AdminRole[]]),
  password: z.string().min(8).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  // Cria conta no Auth + envia convite ou senha temporária
  const tempPassword = body.password ?? generateTempPassword();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: body.name, role: body.role },
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'auth_create_failed' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .insert({
      id: authUser.user.id,
      email: body.email,
      name: body.name,
      role: body.role,
      is_active: true,
    })
    .select('id, email, name, role, is_active, created_at')
    .single();

  if (profileError) {
    // rollback do auth user
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'admin_user.created',
    entityType: 'admin.users',
    entityId: profile.id,
    newValues: { email: profile.email, name: profile.name, role: profile.role },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    data: profile,
    tempPassword: body.password ? undefined : tempPassword,
  }, { status: 201 });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
