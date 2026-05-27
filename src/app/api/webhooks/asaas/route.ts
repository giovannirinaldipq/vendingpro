import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AsaasWebhookPayload } from '@/lib/payments/asaas';

const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

export async function POST(req: NextRequest) {
  if (WEBHOOK_TOKEN) {
    const token = req.headers.get('asaas-access-token');
    if (token !== WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await req.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { event, payment } = payload;
  if (!event || !payment?.id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // Localiza fatura: preferimos externalReference (invoice_id), fallback gateway_invoice_id
  const invoiceId = payment.externalReference;
  let { data: invoice } = invoiceId
    ? await supabaseAdmin
        .from('billing_invoices_view')
        .select('id, tenant_id, status, total, gateway_invoice_id')
        .eq('id', invoiceId)
        .maybeSingle()
    : { data: null };

  if (!invoice) {
    const { data: byGw } = await supabaseAdmin
      .from('billing_invoices_view')
      .select('id, tenant_id, status, total, gateway_invoice_id')
      .eq('gateway_invoice_id', payment.id)
      .maybeSingle();
    invoice = byGw;
  }

  if (!invoice) {
    // Recebemos webhook de pagamento que não conseguimos linkar — ainda assim respondemos 200
    // para que o Asaas não fique reenviando.
    console.warn('[asaas-webhook] payment sem invoice vinculado:', payment.id, event);
    return NextResponse.json({ ok: true, warning: 'invoice_not_found' });
  }

  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED': {
      await supabaseAdmin
        .from('billing_invoices_view')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: payment.value,
          payment_method: mapBillingType(payment.billingType),
        })
        .eq('id', invoice.id);

      await supabaseAdmin
        .from('billing_payments_view')
        .insert({
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          amount: payment.value,
          payment_method: mapBillingType(payment.billingType),
          payment_date: payment.paymentDate ?? new Date().toISOString().split('T')[0],
          gateway_payment_id: payment.id,
          gateway_data: payment as unknown as Record<string, unknown>,
        });

      // Reativa tenant se estava overdue/suspended e não tem mais nenhuma fatura aberta
      const { count } = await supabaseAdmin
        .from('billing_invoices_view')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', invoice.tenant_id)
        .in('status', ['pending', 'overdue']);

      if (count === 0) {
        await supabaseAdmin
          .from('tenants')
          .update({ subscription_status: 'active', suspended_at: null })
          .eq('id', invoice.tenant_id)
          .in('subscription_status', ['overdue', 'suspended']);
      }
      break;
    }
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED': {
      await supabaseAdmin
        .from('billing_invoices_view')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id);
      break;
    }
    case 'PAYMENT_OVERDUE': {
      // cron já trata isso; só registramos evento
      break;
    }
    default:
      // ignora demais eventos
      break;
  }

  return NextResponse.json({ ok: true });
}

function mapBillingType(t: string): string {
  switch (t) {
    case 'BOLETO': return 'boleto';
    case 'CREDIT_CARD': return 'credit_card';
    case 'PIX': return 'pix';
    case 'UNDEFINED': return 'undefined';
    default: return t.toLowerCase();
  }
}
