import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
/**
 * Retorna informações sobre o usuário logado e a rota apropriada
 * para redirecionar após login.
 * - Admin (tem perfil em admin.users com is_active=true) → /admin
 * - Cliente (tem perfil em public.users com tenant_id) → /app
 * - Nenhum dos dois → /login com erro
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ logged_in: false, redirect_to: '/login' }, { status: 200 });
  }

  // Checa em paralelo: admin profile + client profile
  const [adminRes, clientRes] = await Promise.all([
    supabaseAdmin
      .schema('admin')
      .from('users')
      .select('id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('id, tenant_id, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const isAdmin = !!adminRes.data;
  const hasTenant = !!clientRes.data?.tenant_id;

  let redirect_to: string;
  if (isAdmin) redirect_to = '/admin';
  else if (hasTenant) redirect_to = '/app';
  else redirect_to = '/login?error=no_profile';

  return NextResponse.json({
    logged_in: true,
    user_id: user.id,
    email: user.email,
    is_admin: isAdmin,
    has_tenant: hasTenant,
    tenant_id: clientRes.data?.tenant_id ?? null,
    redirect_to,
  });
}
