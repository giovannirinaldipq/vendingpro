import { createClient } from '@/lib/supabase/server';

export interface TenantContext {
  userId: string;
  tenantId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!data?.tenant_id) return null;
  return { userId: user.id, tenantId: data.tenant_id, supabase };
}
