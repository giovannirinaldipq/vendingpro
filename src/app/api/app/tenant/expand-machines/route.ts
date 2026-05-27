import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const additional = Number(body.additional_machines);
  if (!Number.isFinite(additional) || additional < 1 || additional > 20) {
    return NextResponse.json(
      { error: 'additional_machines deve ser entre 1 e 20' },
      { status: 400 }
    );
  }

  const { data: tenant } = await ctx.supabase
    .from('tenants')
    .select('id, plan_id, contracted_machines, billing_day, company_name')
    .eq('id', ctx.tenantId)
    .single();

  if (!tenant || !tenant.plan_id) {
    return NextResponse.json(
      { error: 'Tenant sem plano ativo. Entre em contato com o suporte.' },
      { status: 400 }
    );
  }

  const { data: plan } = await supabaseAdmin
    .from('billing_plans_view')
    .select('price_per_machine')
    .eq('id', tenant.plan_id)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 500 });
  }

  const pricePerMachine = Number(plan.price_per_machine);
  const billingDay = tenant.billing_day || 10;
  const today = new Date();

  // Calcula pro-rata: dias restantes ate proximo billing_day
  let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (nextBillingDate <= today) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const msPerDay = 86400000;
  const daysRemaining = Math.ceil((nextBillingDate.getTime() - today.getTime()) / msPerDay);
  const proRataFactor = daysRemaining / daysInMonth;

  const subtotal = Math.round(additional * pricePerMachine * proRataFactor * 100) / 100;
  if (subtotal <= 0) {
    return NextResponse.json({ error: 'Valor calculado invalido' }, { status: 400 });
  }

  // Gera fatura pro-rata
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 5);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const referenceMonth = today.toISOString().slice(0, 7);
  const invoiceNumber = `INV-${referenceMonth.replace('-', '')}-${tenant.id.slice(0, 8).toUpperCase()}-EXP`;

  const { error: invoiceErr } = await supabaseAdmin
    .from('billing_invoices_view')
    .insert({
      tenant_id: tenant.id,
      invoice_number: invoiceNumber,
      reference_month: `${referenceMonth}-01`,
      due_date: dueDateStr,
      subtotal,
      discount: 0,
      total: subtotal,
      machines_count: additional,
      price_per_machine: pricePerMachine,
      status: 'pending',
    });

  if (invoiceErr) {
    return NextResponse.json({ error: invoiceErr.message }, { status: 500 });
  }

  // Incrementa contracted_machines
  const newLimit = (tenant.contracted_machines ?? 5) + additional;
  const { error: updateErr } = await supabaseAdmin
    .from('tenants')
    .update({ contracted_machines: newLimit })
    .eq('id', tenant.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      new_limit: newLimit,
      additional_machines: additional,
      invoice_total: subtotal,
      due_date: dueDateStr,
      days_remaining: daysRemaining,
      pro_rata_factor: proRataFactor,
    },
  });
}
