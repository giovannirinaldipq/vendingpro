import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { registerPaymentSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const method = searchParams.get('method') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .from('billing_payments_view')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (method && method !== 'all') {
    query = query.eq('payment_method', method);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Enriquecer com invoice_number e tenant company_name
  const invoiceIds = [...new Set((data ?? []).map((p: { invoice_id: string }) => p.invoice_id).filter(Boolean))];
  const tenantIds = [...new Set((data ?? []).map((p: { tenant_id: string }) => p.tenant_id).filter(Boolean))];

  const invoicesMap = new Map<string, string>();
  const tenantsMap = new Map<string, string>();

  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabaseAdmin
      .from('billing_invoices_view')
      .select('id, invoice_number')
      .in('id', invoiceIds);
    for (const inv of (invoices ?? []) as { id: string; invoice_number: string }[]) {
      invoicesMap.set(inv.id, inv.invoice_number);
    }
  }
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, company_name')
      .in('id', tenantIds);
    for (const t of (tenants ?? []) as { id: string; company_name: string }[]) {
      tenantsMap.set(t.id, t.company_name);
    }
  }

  const payments = (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    invoice: p.invoice_id ? { invoice_number: invoicesMap.get(p.invoice_id as string) ?? null } : null,
    tenant: p.tenant_id ? { company_name: tenantsMap.get(p.tenant_id as string) ?? null } : null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      payments,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin', 'financial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const body = await request.json();

  const validation = registerPaymentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Buscar fatura
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('billing_invoices_view')
    .select('tenant_id, total, status')
    .eq('id', validation.data.invoice_id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Fatura não encontrada' } },
      { status: 404 }
    );
  }

  if (invoice.status === 'paid') {
    return NextResponse.json(
      { success: false, error: { code: 'ALREADY_PAID', message: 'Fatura já está paga' } },
      { status: 400 }
    );
  }

  // Registrar pagamento
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('billing_payments_view')
    .insert({
      invoice_id: validation.data.invoice_id,
      tenant_id: invoice.tenant_id,
      amount: validation.data.amount,
      payment_method: validation.data.payment_method,
      payment_date: validation.data.payment_date,
      is_manual: true,
      notes: validation.data.notes,
      created_by: auth.admin.id,
    })
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: paymentError.message } }, { status: 500 });
  }

  // Atualizar fatura
  await supabaseAdmin
    .from('billing_invoices_view')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: validation.data.amount,
      payment_method: validation.data.payment_method,
    })
    .eq('id', validation.data.invoice_id);

  // Atualizar status do tenant se estava inadimplente
  await supabaseAdmin
    .from('tenants')
    .update({ subscription_status: 'active' })
    .eq('id', invoice.tenant_id)
    .in('subscription_status', ['overdue', 'suspended']);

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'payment.registered_manual',
    entityType: 'billing.payments',
    entityId: payment.id,
    newValues: { invoice_id: validation.data.invoice_id, amount: validation.data.amount, payment_method: validation.data.payment_method },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data: payment }, { status: 201 });
}
