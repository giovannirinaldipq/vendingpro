import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderInvoicePdf } from '@/lib/pdf';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: invoice, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select(`
      invoice_number, reference_month, due_date, total, subtotal, discount,
      machines_count, price_per_machine, status, paid_at,
      gateway_boleto_url, gateway_pix_code, tenant_id
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select(`
      company_name, trade_name, document_type, document_number, contact_email,
      address_street, address_number, address_city, address_state, address_zipcode,
      plan_id
    `)
    .eq('id', invoice.tenant_id)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  let plan_name: string | undefined;
  if (tenant.plan_id) {
    const { data: plan } = await supabaseAdmin
      .schema('billing')
      .from('plans')
      .select('name')
      .eq('id', tenant.plan_id)
      .single();
    plan_name = plan?.name;
  }

  const pdf = await renderInvoicePdf({
    invoice_number: invoice.invoice_number,
    reference_month: invoice.reference_month,
    due_date: invoice.due_date,
    total: Number(invoice.total),
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    machines_count: invoice.machines_count,
    price_per_machine: Number(invoice.price_per_machine),
    status: invoice.status,
    paid_at: invoice.paid_at,
    gateway_boleto_url: invoice.gateway_boleto_url,
    gateway_pix_code: invoice.gateway_pix_code,
    tenant: {
      company_name: tenant.company_name,
      trade_name: tenant.trade_name,
      document_type: tenant.document_type,
      document_number: tenant.document_number,
      contact_email: tenant.contact_email,
      address_street: tenant.address_street,
      address_number: tenant.address_number,
      address_city: tenant.address_city,
      address_state: tenant.address_state,
      address_zipcode: tenant.address_zipcode,
    },
    plan_name,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
