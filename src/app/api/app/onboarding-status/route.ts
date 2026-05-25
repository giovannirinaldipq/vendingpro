import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [loc, mach, prod, sales] = await Promise.all([
    ctx.supabase.from('locations').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('sales').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).limit(1),
  ]);

  return NextResponse.json({
    data: {
      locations: loc.count ?? 0,
      machines: mach.count ?? 0,
      products: prod.count ?? 0,
      sales: sales.count ?? 0,
    },
  });
}
