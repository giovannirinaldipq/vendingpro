/**
 * Helpers de autenticação do Reabastecedor (papel separado de admin/cliente).
 * Reabastecedor faz login via Supabase Auth (magic link enviado por email)
 * e está linkado em public.restockers.user_id.
 */
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export interface RestockerContext {
  userId: string;
  restockerId: string;
  tenantId: string;
  name: string;
  email: string | null;
}

/**
 * Resolve o reabastecedor da sessão atual.
 * Retorna null se não houver sessão OU se o usuário não for um reabastecedor.
 */
export async function getRestockerContext(): Promise<RestockerContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Usa service-role pra evitar RLS / cross-schema
  const { data, error } = await supabaseAdmin
    .from('restockers')
    .select('id, tenant_id, name, email')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: user.id,
    restockerId: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    email: data.email,
  };
}

/**
 * Checagem rápida sem buscar o registro inteiro — usado em middleware.
 */
export async function isRestockerUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('restockers')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

export { supabaseAdmin as restockerSupabaseAdmin };
