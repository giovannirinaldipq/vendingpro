import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [{ data: tenant }, { count }] = await Promise.all([
    ctx.supabase.from('tenants').select('contracted_machines, billing_day, plan_id').eq('id', ctx.tenantId).single(),
    ctx.supabase.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).in('status', ['active', 'inactive', 'maintenance', 'installing']),
  ]);

  let pricPerMachine: number | null = null;
  let planName: string | null = null;

  if (tenant?.plan_id) {
    const { data: plan } = await supabaseAdmin
      .from('billing_plans_view')
      .select('name, price_per_machine')
      .eq('id', tenant.plan_id)
      .single();
    if (plan) {
      pricPerMachine = Number(plan.price_per_machine) || null;
      planName = plan.name as string ?? null;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      used: count ?? 0,
      limit: tenant?.contracted_machines ?? 5,
      billing_day: tenant?.billing_day ?? 10,
      price_per_machine: pricPerMachine,
      plan_name: planName,
    },
  });
}
