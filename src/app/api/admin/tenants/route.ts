import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createTenantSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';
import { sendOnboarding } from '@/lib/email';

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
      .from('billing_plans_view')
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

  const body = await request.json();

  const validation = createTenantSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
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

  // Gera primeira fatura pro-rata se tem plano e máquinas contratadas
  if (data.plan_id && data.contracted_machines > 0) {
    try {
      await generateFirstInvoice(data);
    } catch (e) {
      console.error('Erro ao gerar primeira fatura:', e);
    }
  }

  // Cria auth user + registro em public.users + envia email de onboarding
  try {
    await onboardTenantUser(data);
  } catch (e) {
    console.error('Erro ao criar usuário do tenant:', e);
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function generateFirstInvoice(tenant: {
  id: string;
  plan_id: string;
  contracted_machines: number;
  billing_day: number;
  company_name: string;
}) {
  const { data: plan } = await supabaseAdmin
    .from('billing_plans_view')
    .select('price_per_machine')
    .eq('id', tenant.plan_id)
    .single();

  if (!plan) return;

  const today = new Date();
  const billingDay = tenant.billing_day || 10;
  const machines = tenant.contracted_machines;
  const pricePerMachine = Number(plan.price_per_machine);

  // Calcula pro-rata: dias restantes até o próximo billing_day
  let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (nextBillingDate <= today) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const msPerDay = 86400000;
  const daysRemaining = Math.ceil((nextBillingDate.getTime() - today.getTime()) / msPerDay);
  const proRataFactor = daysRemaining / daysInMonth;

  const subtotal = Math.round(machines * pricePerMachine * proRataFactor * 100) / 100;
  if (subtotal <= 0) return;

  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 5);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const referenceMonth = today.toISOString().slice(0, 7);
  const invoiceNumber = `INV-${referenceMonth.replace('-', '')}-${tenant.id.slice(0, 8).toUpperCase()}-PRO`;

  await supabaseAdmin
    .from('billing_invoices_view')
    .insert({
      tenant_id: tenant.id,
      invoice_number: invoiceNumber,
      reference_month: `${referenceMonth}-01`,
      due_date: dueDateStr,
      subtotal,
      discount: 0,
      total: subtotal,
      machines_count: machines,
      price_per_machine: pricePerMachine,
      status: 'pending',
    });

  // Atualiza last_billed_machines
  await supabaseAdmin
    .from('tenants')
    .update({ last_billed_machines: machines })
    .eq('id', tenant.id);
}

async function onboardTenantUser(tenant: {
  id: string;
  contact_name: string;
  contact_email: string;
  company_name: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vendingpro.vercel.app';

  // 1. Cria auth user no Supabase (sem senha — será definida via link)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: tenant.contact_email,
    email_confirm: true,
    user_metadata: { name: tenant.contact_name, tenant_id: tenant.id },
  });

  if (authError) {
    console.error('[onboard] Erro ao criar auth user:', authError.message);
    return;
  }

  // 2. Cria registro em public.users vinculando ao tenant
  await supabaseAdmin.from('users').insert({
    auth_user_id: authUser.user.id,
    email: tenant.contact_email,
    name: tenant.contact_name,
    tenant_id: tenant.id,
    role: 'owner',
    is_active: true,
  });

  // 3. Gera link de reset de senha (funciona como "definir senha" para user novo)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: tenant.contact_email,
    options: { redirectTo: `${appUrl}/reset-password` },
  });

  if (linkError || !linkData) {
    console.error('[onboard] Erro ao gerar link:', linkError?.message);
    return;
  }

  // O link gerado pelo Supabase contém o token — extrair e montar URL final
  const actionLink = linkData.properties?.action_link;
  if (!actionLink) return;

  // 4. Envia email de onboarding via Resend
  await sendOnboarding(
    { company_name: tenant.company_name, contact_name: tenant.contact_name },
    actionLink,
    tenant.contact_email,
  );
}
