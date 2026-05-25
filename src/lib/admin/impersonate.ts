import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const IMPERSONATION_COOKIE = 'vp_impersonating_tenant';
export const IMPERSONATION_SESSION_COOKIE = 'vp_impersonation_session';

export interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  tenant_id: string;
  started_at: string;
  expires_at: string;
  reason: string | null;
}

export interface ActiveImpersonation {
  session: ImpersonationSession;
  tenant: {
    id: string;
    company_name: string;
    contact_name: string;
    subscription_status: string;
  };
}

/**
 * Lê a sessão de impersonação ativa a partir dos cookies.
 * Retorna null se não houver cookie, sessão expirou, ou sessão foi encerrada.
 * O caller é responsável por checar se o usuário atual é o admin dono da sessão.
 */
export async function getActiveImpersonation(): Promise<ActiveImpersonation | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(IMPERSONATION_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const { data: session } = await supabaseAdmin
    .schema('admin')
    .from('impersonation_sessions')
    .select('id, admin_user_id, tenant_id, started_at, expires_at, reason, ended_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return null;
  if (session.ended_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, contact_name, subscription_status')
    .eq('id', session.tenant_id)
    .maybeSingle();

  if (!tenant) return null;

  return {
    session: session as ImpersonationSession,
    tenant: tenant as ActiveImpersonation['tenant'],
  };
}

/**
 * Verifica em middleware (sem ler full DB) se o cookie indica impersonação ativa.
 * Faz uma única query rápida pra validar a sessão.
 */
export async function isImpersonationActiveForAdmin(
  sessionId: string,
  adminUserId: string
): Promise<{ tenantId: string } | null> {
  const { data } = await supabaseAdmin
    .schema('admin')
    .from('impersonation_sessions')
    .select('tenant_id, ended_at, expires_at')
    .eq('id', sessionId)
    .eq('admin_user_id', adminUserId)
    .maybeSingle();

  if (!data || data.ended_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return { tenantId: data.tenant_id };
}
