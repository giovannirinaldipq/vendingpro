import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveImpersonation } from '@/lib/admin/impersonate';

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>;

export interface TenantContext {
  userId: string;
  tenantId: string;
  /**
   * Cliente Supabase — normalmente o autenticado (com RLS).
   * Durante impersonação, vira service-role para o admin acessar
   * o /app como o tenant (ainda escopado por tenant_id em cada query).
   */
  supabase: SupabaseClientLike;
  isImpersonating?: boolean;
  impersonatingAdminId?: string;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Se houver impersonação ativa do admin, devolve o cliente service-role
  const impersonation = await getActiveImpersonation();
  if (impersonation && impersonation.session.admin_user_id === user.id) {
    return {
      userId: user.id,
      tenantId: impersonation.tenant.id,
      supabase: supabaseAdmin as unknown as SupabaseClientLike,
      isImpersonating: true,
      impersonatingAdminId: user.id,
    };
  }

  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!data?.tenant_id) return null;
  return { userId: user.id, tenantId: data.tenant_id, supabase };
}
