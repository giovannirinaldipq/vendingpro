import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPlanSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const supabase = await createClient();

  const { data, error } = await supabase
    .schema('billing')
    .from('plans')
    .select('*')
    .order('price_per_machine', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Contar clientes por plano
  const { data: tenantCounts } = await supabase
    .from('tenants')
    .select('plan_id')
    .not('plan_id', 'is', null);

  const countsMap = (tenantCounts || []).reduce((acc, t) => {
    acc[t.plan_id] = (acc[t.plan_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const plansWithCounts = data?.map(plan => ({
    ...plan,
    clients_count: countsMap[plan.id] || 0,
  }));

  return NextResponse.json({ success: true, data: plansWithCounts });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const supabase = await createClient();
  const body = await request.json();

  const validation = createPlanSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .schema('billing')
    .from('plans')
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Já existe um plano com este slug' } },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'plan.created',
    entityType: 'billing.plans',
    entityId: data.id,
    newValues: validation.data as unknown as Record<string, unknown>,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
