import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendInvoiceCreated,
  sendInvoiceOverdue,
  sendInvoiceReminder,
  sendSuspensionWarning,
  sendTenantSuspended,
  sendTrialActivated,
  sendTrialSuspended,
} from '@/lib/email';
import {
  createPayment,
  getOrCreateCustomer,
  getPixQrCode,
  isAsaasConfigured,
} from '@/lib/payments/asaas';
import { startCronRun, finishCronRun, type Trigger } from '@/lib/admin/cron-log';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

interface CronResults {
  trials_processed: number;
  invoices_generated: number;
  reminders_sent: number;
  invoices_marked_overdue: number;
  overdue_notices_sent: number;
  suspension_warnings_sent: number;
  tenants_suspended: number;
  emails_failed: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trigger = (request.headers.get('x-cron-trigger') as Trigger) ?? 'schedule';
  const adminId = request.headers.get('x-cron-admin-id') ?? undefined;
  const run = await startCronRun('billing', trigger, adminId);

  const results: CronResults = {
    trials_processed: 0,
    invoices_generated: 0,
    reminders_sent: 0,
    invoices_marked_overdue: 0,
    overdue_notices_sent: 0,
    suspension_warnings_sent: 0,
    tenants_suspended: 0,
    emails_failed: 0,
    errors: [],
  };

  try {
    await processExpiringTrials(results);
    await generateMonthlyInvoices(results);
    await sendBeforeDueReminders(results);
    await markOverdueInvoices(results);
    await sendOverdueNotices(results);
    await sendSuspensionWarnings(results);
    await suspendDelinquentTenants(results);

    await finishCronRun(run, {
      success: results.errors.length === 0,
      summary: { ...results, errors: undefined },
      errors: results.errors,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Billing cron error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    await finishCronRun(run, {
      success: false,
      summary: { ...results, errors: undefined },
      errors: [...results.errors, `Fatal: ${msg}`],
    });
    return NextResponse.json(
      { success: false, error: 'Internal error', details: results },
      { status: 500 }
    );
  }
}

// 1. Processar trials que estão expirando
async function processExpiringTrials(results: CronResults) {
  const today = new Date().toISOString().split('T')[0];

  const { data: expiredTrials, error } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, contact_name, contact_email, financial_email, plan_id')
    .eq('subscription_status', 'trial')
    .lte('trial_ends_at', today);

  if (error) {
    results.errors.push(`Erro ao buscar trials: ${error.message}`);
    return;
  }

  for (const tenant of expiredTrials || []) {
    const newStatus = tenant.plan_id ? 'active' : 'suspended';

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        subscription_status: newStatus,
        ...(newStatus === 'suspended' && { suspended_at: new Date().toISOString() }),
      })
      .eq('id', tenant.id);

    if (updateError) {
      results.errors.push(`Erro ao atualizar tenant ${tenant.id}: ${updateError.message}`);
      continue;
    }

    results.trials_processed++;

    const tCtx = { company_name: tenant.company_name, contact_name: tenant.contact_name };
    const to = tenant.contact_email;
    const send = newStatus === 'active' ? sendTrialActivated(tCtx, to) : sendTrialSuspended(tCtx, to);
    const r = await send;
    if (!r.ok && !r.skipped) results.emails_failed++;
  }
}

// 2. Gerar faturas mensais
async function generateMonthlyInvoices(results: CronResults) {
  const today = new Date();
  const currentDay = today.getDate();
  const referenceMonth = today.toISOString().slice(0, 7);

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, contact_name, contact_email, financial_email, contact_phone, document_number, document_type, asaas_customer_id, plan_id, billing_day')
    .eq('subscription_status', 'active')
    .eq('billing_day', currentDay)
    .not('plan_id', 'is', null);

  if (error) {
    results.errors.push(`Erro ao buscar tenants para faturamento: ${error.message}`);
    return;
  }

  for (const tenant of tenants || []) {
    const { data: existingInvoice } = await supabaseAdmin
      .schema('billing')
      .from('invoices')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('reference_month', `${referenceMonth}-01`)
      .single();

    if (existingInvoice) continue;

    const { data: plan } = await supabaseAdmin
      .schema('billing')
      .from('plans')
      .select('price_per_machine, minimum_value')
      .eq('id', tenant.plan_id)
      .single();

    if (!plan) continue;

    const { count: machinesCount } = await supabaseAdmin
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'active');

    const machines = machinesCount || 0;
    const subtotal = Math.max(machines * plan.price_per_machine, plan.minimum_value);

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 10);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const invoiceNumber = `INV-${referenceMonth.replace('-', '')}-${tenant.id.slice(0, 8).toUpperCase()}`;

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .schema('billing')
      .from('invoices')
      .insert({
        tenant_id: tenant.id,
        invoice_number: invoiceNumber,
        reference_month: `${referenceMonth}-01`,
        due_date: dueDateStr,
        subtotal,
        discount: 0,
        total: subtotal,
        machines_count: machines,
        price_per_machine: plan.price_per_machine,
        status: 'pending',
      })
      .select('id, invoice_number, total, due_date, gateway_boleto_url, gateway_pix_code')
      .single();

    if (invoiceError || !invoice) {
      results.errors.push(`Erro ao criar fatura para ${tenant.id}: ${invoiceError?.message}`);
      continue;
    }

    results.invoices_generated++;

    let boletoUrl: string | null = invoice.gateway_boleto_url ?? null;
    let pixCode: string | null = invoice.gateway_pix_code ?? null;

    // Cria payment no Asaas se configurado
    if (isAsaasConfigured() && tenant.document_number) {
      try {
        let asaasCustomerId = tenant.asaas_customer_id;
        if (!asaasCustomerId) {
          const customer = await getOrCreateCustomer({
            name: tenant.company_name,
            email: tenant.financial_email || tenant.contact_email,
            cpfCnpj: tenant.document_number,
            mobilePhone: tenant.contact_phone,
            externalReference: tenant.id,
          });
          asaasCustomerId = customer.id;
          await supabaseAdmin
            .from('tenants')
            .update({ asaas_customer_id: asaasCustomerId })
            .eq('id', tenant.id);
        }

        const payment = await createPayment({
          customerId: asaasCustomerId,
          value: subtotal,
          dueDate: dueDateStr,
          description: `VendingPro · Fatura ${invoiceNumber} (${referenceMonth})`,
          externalReference: invoice.id,
        });

        const pix = await getPixQrCode(payment.id);

        boletoUrl = payment.bankSlipUrl ?? payment.invoiceUrl ?? null;
        pixCode = pix?.payload ?? null;

        await supabaseAdmin
          .schema('billing')
          .from('invoices')
          .update({
            gateway_invoice_id: payment.id,
            gateway_boleto_url: boletoUrl,
            gateway_pix_code: pixCode,
          })
          .eq('id', invoice.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.errors.push(`Asaas falhou para fatura ${invoice.invoice_number}: ${msg}`);
        // Segue para enviar email mesmo sem URL — cliente pode pagar pela plataforma depois
      }
    }

    const tCtx = { company_name: tenant.company_name, contact_name: tenant.contact_name };
    const invCtx = {
      invoice_number: invoice.invoice_number,
      total: Number(invoice.total),
      due_date: invoice.due_date,
      boleto_url: boletoUrl,
      pix_code: pixCode,
    };
    const to = tenant.financial_email || tenant.contact_email;
    const r = await sendInvoiceCreated(tCtx, invCtx, to);
    await logCollectionEvent(invoice.id, 'invoice_sent', r.ok, r.error);
    if (!r.ok && !r.skipped) results.emails_failed++;
  }
}

// 3. Enviar lembretes D-3 antes do vencimento
async function sendBeforeDueReminders(results: CronResults) {
  const target = new Date();
  target.setDate(target.getDate() + 3);
  const targetStr = target.toISOString().split('T')[0];

  const { data: invoices, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select('id, tenant_id, invoice_number, total, due_date, gateway_boleto_url, gateway_pix_code')
    .eq('status', 'pending')
    .eq('due_date', targetStr);

  if (error) {
    results.errors.push(`Erro ao buscar lembretes: ${error.message}`);
    return;
  }
  if (!invoices?.length) return;

  for (const inv of invoices) {
    if (await alreadySent(inv.id, 'reminder_before')) continue;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('company_name, contact_name, contact_email, financial_email')
      .eq('id', inv.tenant_id)
      .single();
    if (!tenant) continue;

    const r = await sendInvoiceReminder(
      { company_name: tenant.company_name, contact_name: tenant.contact_name },
      {
        invoice_number: inv.invoice_number,
        total: Number(inv.total),
        due_date: inv.due_date,
        boleto_url: inv.gateway_boleto_url,
        pix_code: inv.gateway_pix_code,
      },
      tenant.financial_email || tenant.contact_email
    );
    await logCollectionEvent(inv.id, 'reminder_before', r.ok, r.error);
    if (r.ok) results.reminders_sent++;
    else if (!r.skipped) results.emails_failed++;
  }
}

// 4. Marcar faturas vencidas como overdue
async function markOverdueInvoices(results: CronResults) {
  const today = new Date().toISOString().split('T')[0];

  const { data: overdueInvoices, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today)
    .select('id, tenant_id');

  if (error) {
    results.errors.push(`Erro ao marcar faturas vencidas: ${error.message}`);
    return;
  }

  results.invoices_marked_overdue = overdueInvoices?.length || 0;

  const tenantIds = [...new Set(overdueInvoices?.map(i => i.tenant_id) || [])];
  if (tenantIds.length > 0) {
    await supabaseAdmin
      .from('tenants')
      .update({ subscription_status: 'overdue' })
      .in('id', tenantIds)
      .eq('subscription_status', 'active');
  }
}

// 5. Enviar avisos de atraso em D+1 e D+7
async function sendOverdueNotices(results: CronResults) {
  const today = new Date();

  for (const daysOverdue of [1, 7]) {
    const target = new Date(today);
    target.setDate(today.getDate() - daysOverdue);
    const targetStr = target.toISOString().split('T')[0];

    const { data: invoices, error } = await supabaseAdmin
      .schema('billing')
      .from('invoices')
      .select('id, tenant_id, invoice_number, total, due_date, gateway_boleto_url, gateway_pix_code')
      .eq('status', 'overdue')
      .eq('due_date', targetStr);

    if (error) {
      results.errors.push(`Erro ao buscar overdue D+${daysOverdue}: ${error.message}`);
      continue;
    }
    if (!invoices?.length) continue;

    const eventType = daysOverdue === 1 ? 'reminder_overdue_1' : 'reminder_overdue_2';

    for (const inv of invoices) {
      if (await alreadySent(inv.id, eventType)) continue;

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('company_name, contact_name, contact_email, financial_email')
        .eq('id', inv.tenant_id)
        .single();
      if (!tenant) continue;

      const r = await sendInvoiceOverdue(
        { company_name: tenant.company_name, contact_name: tenant.contact_name },
        {
          invoice_number: inv.invoice_number,
          total: Number(inv.total),
          due_date: inv.due_date,
          boleto_url: inv.gateway_boleto_url,
          pix_code: inv.gateway_pix_code,
        },
        daysOverdue,
        tenant.financial_email || tenant.contact_email
      );
      await logCollectionEvent(inv.id, eventType, r.ok, r.error);
      if (r.ok) results.overdue_notices_sent++;
      else if (!r.skipped) results.emails_failed++;
    }
  }
}

// 6. Aviso final de suspensão (D+15)
async function sendSuspensionWarnings(results: CronResults) {
  const target = new Date();
  target.setDate(target.getDate() - 15);
  const targetStr = target.toISOString().split('T')[0];

  const { data: invoices, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select('id, tenant_id, invoice_number, total, due_date, gateway_boleto_url, gateway_pix_code')
    .eq('status', 'overdue')
    .lte('due_date', targetStr);

  if (error) {
    results.errors.push(`Erro warning suspensão: ${error.message}`);
    return;
  }
  if (!invoices?.length) return;

  for (const inv of invoices) {
    if (await alreadySent(inv.id, 'suspension_warning')) continue;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('company_name, contact_name, contact_email, financial_email')
      .eq('id', inv.tenant_id)
      .single();
    if (!tenant) continue;

    const r = await sendSuspensionWarning(
      { company_name: tenant.company_name, contact_name: tenant.contact_name },
      {
        invoice_number: inv.invoice_number,
        total: Number(inv.total),
        due_date: inv.due_date,
        boleto_url: inv.gateway_boleto_url,
        pix_code: inv.gateway_pix_code,
      },
      tenant.financial_email || tenant.contact_email
    );
    await logCollectionEvent(inv.id, 'suspension_warning', r.ok, r.error);
    if (r.ok) results.suspension_warnings_sent++;
    else if (!r.skipped) results.emails_failed++;
  }
}

// 7. Suspender clientes muito inadimplentes (30+ dias)
async function suspendDelinquentTenants(results: CronResults) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  const { data: oldOverdueInvoices, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select('id, tenant_id')
    .eq('status', 'overdue')
    .lt('due_date', cutoffDate);

  if (error) {
    results.errors.push(`Erro ao buscar faturas antigas: ${error.message}`);
    return;
  }

  const tenantIds = [...new Set(oldOverdueInvoices?.map(i => i.tenant_id) || [])];
  if (tenantIds.length === 0) return;

  const { data: suspended } = await supabaseAdmin
    .from('tenants')
    .update({
      subscription_status: 'suspended',
      suspended_at: new Date().toISOString(),
    })
    .in('id', tenantIds)
    .eq('subscription_status', 'overdue')
    .select('id, company_name, contact_name, contact_email, financial_email');

  results.tenants_suspended = suspended?.length || 0;

  for (const tenant of suspended || []) {
    const invoiceIds = oldOverdueInvoices?.filter(i => i.tenant_id === tenant.id).map(i => i.id) || [];
    const r = await sendTenantSuspended(
      { company_name: tenant.company_name, contact_name: tenant.contact_name },
      tenant.financial_email || tenant.contact_email
    );
    for (const invId of invoiceIds) {
      await logCollectionEvent(invId, 'suspended', r.ok, r.error);
    }
    if (!r.ok && !r.skipped) results.emails_failed++;
  }
}

async function alreadySent(invoiceId: string, eventType: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .schema('billing')
    .from('collection_events')
    .select('id')
    .eq('invoice_id', invoiceId)
    .eq('event_type', eventType)
    .eq('success', true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function logCollectionEvent(
  invoiceId: string,
  eventType: string,
  success: boolean,
  errorMessage?: string
) {
  await supabaseAdmin
    .schema('billing')
    .from('collection_events')
    .insert({
      invoice_id: invoiceId,
      event_type: eventType,
      scheduled_for: new Date().toISOString(),
      executed_at: new Date().toISOString(),
      channel: 'email',
      success,
      error_message: errorMessage ?? null,
    });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Billing cron endpoint ready',
    timestamp: new Date().toISOString(),
  });
}
