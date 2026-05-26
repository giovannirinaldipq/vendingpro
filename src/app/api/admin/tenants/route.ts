import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createTenantSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from('tenants')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('subscription_status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Enriquece cada tenant com machines_count + estimated_monthly_value
  type TenantRow = {
    id: string;
    plan_id?: string | null;
  } & Record<string, unknown>;
  const rows = (data ?? []) as unknown as TenantRow[];
  const tenantIds = rows.map(t => t.id);

  // Buscar planos via supabaseAdmin (cross-schema)
  const planIds = [...new Set(rows.map(t => t.plan_id).filter(Boolean))] as string[];
  const plansMap = new Map<string, { price_per_machine?: number; minimum_value?: number; minimum_machines?: number }>();
  if (planIds.length > 0) {
    const { data: plans } = await supabaseAdmin
      .schema('billing')
      .from('plans')
      .select('id, price_per_machine, minimum_value, minimum_machines')
      .in('id', planIds);
    for (const p of (plans ?? []) as { id: string; price_per_machine?: number; minimum_value?: number; minimum_machines?: number }[]) {
      plansMap.set(p.id, p);
    }
  }

  const countsByTenant = new Map<string, number>();
  if (tenantIds.length > 0) {
    const { data: machineCounts } = await supabase
      .from('machines')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('status', 'active');
    for (const m of (machineCounts ?? []) as { tenant_id: string }[]) {
      countsByTenant.set(m.tenant_id, (countsByTenant.get(m.tenant_id) ?? 0) + 1);
    }
  }

  const enrichedTenants = rows.map(t => {
    const machinesCount = countsByTenant.get(t.id) ?? 0;
    const plan = t.plan_id ? plansMap.get(t.plan_id) ?? null : null;
    const pricePerMachine = plan?.price_per_machine ? Number(plan.price_per_machine) : 0;
    const minimum = plan?.minimum_value ? Number(plan.minimum_value) : 0;
    const raw = machinesCount * pricePerMachine;
    const estimatedMonthlyValue = Math.max(raw, minimum);
    return {
      ...t,
      plan: plan ?? null,
      machines_count: machinesCount,
      estimated_monthly_value: estimatedMonthlyValue,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      tenants: enrichedTenants,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin', 'commercial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const supabase = await createClient();
  const body = await request.json();

  const validation = createTenantSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      ...validation.data,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Já existe um cliente com este documento' } },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'tenant.created',
    entityType: 'tenants',
    entityId: data.id,
    newValues: validation.data as unknown as Record<string, unknown>,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
