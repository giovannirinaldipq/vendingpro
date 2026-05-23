import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .schema('billing')
    .from('invoices')
    .select('*, tenant:tenants(company_name, contact_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      invoices: data,
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

  const { tenant_id, reference_month, due_date, machines_count, price_per_machine, discount = 0, adjustments = [] } = body;

  // Calcular valores
  const subtotal = machines_count * price_per_machine;
  const adjustmentsTotal = adjustments.reduce((sum: number, adj: { amount: number }) => sum + adj.amount, 0);
  const total = Math.max(subtotal - discount + adjustmentsTotal, 0);

  // Gerar número da fatura
  const year = new Date().getFullYear();
  const { count } = await supabase
    .schema('billing')
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);

  const invoiceNumber = `FAT-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .schema('billing')
    .from('invoices')
    .insert({
      tenant_id,
      invoice_number: invoiceNumber,
      reference_month,
      due_date,
      subtotal,
      discount,
      total,
      machines_count,
      price_per_machine,
      adjustments,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
