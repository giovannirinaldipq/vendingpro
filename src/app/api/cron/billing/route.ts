import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente admin para operações de cron (sem contexto de usuário)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Chave secreta para proteger o endpoint de cron
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

interface CronResults {
  trials_processed: number;
  invoices_generated: number;
  invoices_marked_overdue: number;
  tenants_suspended: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  // Validar chave de segurança
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: CronResults = {
    trials_processed: 0,
    invoices_generated: 0,
    invoices_marked_overdue: 0,
    tenants_suspended: 0,
    errors: [],
  };

  try {
    // 1. Processar trials expirando
    await processExpiringTrials(results);

    // 2. Gerar faturas para o dia
    await generateMonthlyInvoices(results);

    // 3. Marcar faturas vencidas como overdue
    await markOverdueInvoices(results);

    // 4. Suspender clientes muito inadimplentes
    await suspendDelinquentTenants(results);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Billing cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error', details: results },
      { status: 500 }
    );
  }
}

// 1. Processar trials que estão expirando
async function processExpiringTrials(results: CronResults) {
  const today = new Date().toISOString().split('T')[0];

  // Buscar tenants em trial que expiraram
  const { data: expiredTrials, error } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, contact_email, plan_id')
    .eq('subscription_status', 'trial')
    .lte('trial_ends_at', today);

  if (error) {
    results.errors.push(`Erro ao buscar trials: ${error.message}`);
    return;
  }

  for (const tenant of expiredTrials || []) {
    // Se tem plano, ativa. Se não, suspende.
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
    } else {
      results.trials_processed++;
      // TODO: Enviar email de notificação
    }
  }
}

// 2. Gerar faturas mensais
async function generateMonthlyInvoices(results: CronResults) {
  const today = new Date();
  const currentDay = today.getDate();
  const referenceMonth = today.toISOString().slice(0, 7); // YYYY-MM

  // Buscar tenants ativos cujo dia de cobrança é hoje
  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, plan_id, billing_day')
    .eq('subscription_status', 'active')
    .eq('billing_day', currentDay)
    .not('plan_id', 'is', null);

  if (error) {
    results.errors.push(`Erro ao buscar tenants para faturamento: ${error.message}`);
    return;
  }

  for (const tenant of tenants || []) {
    // Verificar se já existe fatura para este mês
    const { data: existingInvoice } = await supabaseAdmin
      .schema('billing')
      .from('invoices')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('reference_month', `${referenceMonth}-01`)
      .single();

    if (existingInvoice) continue; // Já tem fatura

    // Buscar plano
    const { data: plan } = await supabaseAdmin
      .schema('billing')
      .from('plans')
      .select('price_per_machine, minimum_value')
      .eq('id', tenant.plan_id)
      .single();

    if (!plan) continue;

    // Contar máquinas ativas
    const { count: machinesCount } = await supabaseAdmin
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'active');

    const machines = machinesCount || 0;
    const subtotal = Math.max(machines * plan.price_per_machine, plan.minimum_value);

    // Calcular data de vencimento (billing_day do próximo mês ou 10 dias)
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 10);

    // Gerar número da fatura
    const invoiceNumber = `INV-${referenceMonth.replace('-', '')}-${tenant.id.slice(0, 8).toUpperCase()}`;

    // Criar fatura
    const { error: invoiceError } = await supabaseAdmin
      .schema('billing')
      .from('invoices')
      .insert({
        tenant_id: tenant.id,
        invoice_number: invoiceNumber,
        reference_month: `${referenceMonth}-01`,
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        discount: 0,
        total: subtotal,
        machines_count: machines,
        price_per_machine: plan.price_per_machine,
        status: 'pending',
      });

    if (invoiceError) {
      results.errors.push(`Erro ao criar fatura para ${tenant.id}: ${invoiceError.message}`);
    } else {
      results.invoices_generated++;
      // TODO: Enviar email com boleto/pix
    }
  }
}

// 3. Marcar faturas vencidas como overdue
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

  // Atualizar status dos tenants para overdue
  const tenantIds = [...new Set(overdueInvoices?.map(i => i.tenant_id) || [])];

  if (tenantIds.length > 0) {
    await supabaseAdmin
      .from('tenants')
      .update({ subscription_status: 'overdue' })
      .in('id', tenantIds)
      .eq('subscription_status', 'active');
  }
}

// 4. Suspender clientes muito inadimplentes (30+ dias)
async function suspendDelinquentTenants(results: CronResults) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

  // Buscar faturas overdue há mais de 30 dias
  const { data: oldOverdueInvoices, error } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select('tenant_id')
    .eq('status', 'overdue')
    .lt('due_date', cutoffDate);

  if (error) {
    results.errors.push(`Erro ao buscar faturas antigas: ${error.message}`);
    return;
  }

  const tenantIds = [...new Set(oldOverdueInvoices?.map(i => i.tenant_id) || [])];

  if (tenantIds.length > 0) {
    const { data: suspended } = await supabaseAdmin
      .from('tenants')
      .update({
        subscription_status: 'suspended',
        suspended_at: new Date().toISOString(),
      })
      .in('id', tenantIds)
      .eq('subscription_status', 'overdue')
      .select('id');

    results.tenants_suspended = suspended?.length || 0;
    // TODO: Enviar email de suspensão
  }
}

// GET para verificar status (útil para debug)
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
