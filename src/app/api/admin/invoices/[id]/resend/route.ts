import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';
import {
  sendInvoiceCreated,
  sendInvoiceReminder,
  sendInvoiceOverdue,
  sendSuspensionWarning,
} from '@/lib/email/send';

const bodySchema = z.object({
  template: z.enum(['created', 'reminder', 'overdue', 'suspension_warning']).optional().default('reminder'),
  override_email: z.string().email().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(['super_admin', 'financial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data: invoice } = await supabaseAdmin
    .schema('billing')
    .from('invoices')
    .select('id, invoice_number, total, due_date, status, gateway_boleto_url, gateway_pix_code, tenant_id')
    .eq('id', id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Fatura não encontrada' } }, { status: 404 });
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, contact_name, contact_email, financial_email')
    .eq('id', invoice.tenant_id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente da fatura não encontrado' } }, { status: 404 });
  }

  const to = parsed.data.override_email || tenant.financial_email || tenant.contact_email;
  if (!to) {
    return NextResponse.json({ success: false, error: { code: 'NO_EMAIL', message: 'Cliente sem email cadastrado' } }, { status: 400 });
  }

  const tCtx = { company_name: tenant.company_name, contact_name: tenant.contact_name };
  const iCtx = {
    invoice_number: invoice.invoice_number,
    total: Number(invoice.total),
    due_date: invoice.due_date,
    boleto_url: invoice.gateway_boleto_url,
    pix_code: invoice.gateway_pix_code,
  };

  let result;
  switch (parsed.data.template) {
    case 'created':
      result = await sendInvoiceCreated(tCtx, iCtx, to);
      break;
    case 'reminder':
      result = await sendInvoiceReminder(tCtx, iCtx, to);
      break;
    case 'overdue': {
      const days = Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000));
      result = await sendInvoiceOverdue(tCtx, iCtx, days, to);
      break;
    }
    case 'suspension_warning':
      result = await sendSuspensionWarning(tCtx, iCtx, to);
      break;
  }

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: { code: 'EMAIL_FAILED', message: result.error ?? 'Falha ao enviar email', skipped: result.skipped } },
      { status: 502 }
    );
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'invoice.resent',
    entityType: 'billing.invoices',
    entityId: invoice.id,
    newValues: { template: parsed.data.template, to, message_id: result.id },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data: { message_id: result.id, to, template: parsed.data.template } });
}
