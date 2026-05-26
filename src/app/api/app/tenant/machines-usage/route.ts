import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  return data?.tenant_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [{ data: tenant }, { count }] = await Promise.all([
    supabase.from('tenants').select('contracted_machines').eq('id', tenantId).single(),
    supabase.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['active', 'inactive', 'maintenance', 'installing']),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      used: count ?? 0,
      limit: tenant?.contracted_machines ?? 5,
    },
  });
}
