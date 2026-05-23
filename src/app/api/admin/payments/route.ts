import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerPaymentSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const method = searchParams.get('method') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .schema('billing')
    .from('payments')
    .select('*, invoice:invoices(invoice_number), tenant:tenants(company_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (method && method !== 'all') {
    query = query.eq('payment_method', method);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      payments: data,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const validation = registerPaymentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Buscar fatura
  const { data: invoice, error: invoiceError } = await supabase
    .schema('billing')
    .from('invoices')
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
  const { data: payment, error: paymentError } = await supabase
    .schema('billing')
    .from('payments')
    .insert({
      invoice_id: validation.data.invoice_id,
      tenant_id: invoice.tenant_id,
      amount: validation.data.amount,
      payment_method: validation.data.payment_method,
      payment_date: validation.data.payment_date,
      is_manual: true,
      notes: validation.data.notes,
    })
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: paymentError.message } }, { status: 500 });
  }

  // Atualizar fatura
  await supabase
    .schema('billing')
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: validation.data.amount,
      payment_method: validation.data.payment_method,
    })
    .eq('id', validation.data.invoice_id);

  // Atualizar status do tenant se estava inadimplente
  await supabase
    .from('tenants')
    .update({ subscription_status: 'active' })
    .eq('id', invoice.tenant_id)
    .in('subscription_status', ['overdue', 'suspended']);

  return NextResponse.json({ success: true, data: payment }, { status: 201 });
}
