import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AdminRole } from './roles';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
}

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  // Quem é o usuário logado (cookie do navegador)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Busca o perfil admin via service_role (não depende de RLS)
  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('id, email, name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.is_active) return null;
  return data as AdminProfile;
}

export async function requireAdmin(allowed?: AdminRole[]): Promise<
  { ok: true; admin: AdminProfile } | { ok: false; status: number; error: string }
> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, status: 401, error: 'unauthorized' };
  if (allowed && allowed.length > 0 && !allowed.includes(admin.role)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  return { ok: true, admin };
}

export type { AdminRole };
export { ALL_ADMIN_ROLES, ROLE_LABELS } from './roles';
