import { cookies } from 'next/headers';
import { getActiveImpersonation, IMPERSONATION_SESSION_COOKIE } from '@/lib/admin/impersonate';
import { ImpersonationBannerClient } from './ImpersonationBannerClient';

/**
 * Server component que decide se renderiza o banner.
 * O banner aparece apenas quando há uma sessão de impersonação válida
 * para o admin atualmente logado.
 */
export async function ImpersonationBanner() {
  const cookieStore = await cookies();
  if (!cookieStore.get(IMPERSONATION_SESSION_COOKIE)) return null;

  const impersonation = await getActiveImpersonation();
  if (!impersonation) return null;

  return (
    <ImpersonationBannerClient
      tenantName={impersonation.tenant.company_name}
      contactName={impersonation.tenant.contact_name}
      expiresAt={impersonation.session.expires_at}
    />
  );
}
