import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPlanSchema } from '@/lib/validators';

export async function GET() {
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

  return NextResponse.json({ success: true, data }, { status: 201 });
}
