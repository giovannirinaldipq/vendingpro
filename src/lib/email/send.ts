import { EMAIL_FROM, resend } from './client';
import type { InvoiceCtx, TenantCtx } from './templates';
import {
  tplInvoiceCreated,
  tplInvoiceOverdue,
  tplInvoiceReminder,
  tplSuspensionWarning,
  tplTenantSuspended,
  tplTrialActivated,
  tplTrialSuspended,
  tplWelcome,
} from './templates';

interface SendInput {
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendEmail({ to, subject, html, tags }: SendInput): Promise<SendResult> {
  if (!resend) {
    console.warn('[email] Resend não configurado — skip envio para', to);
    return { ok: false, skipped: true, error: 'resend_not_configured' };
  }
  if (!to) return { ok: false, error: 'destinatário vazio' };

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      ...(tags && { tags }),
    });
    if (error) {
      console.error('[email] erro Resend:', error);
      return { ok: false, error: error.message ?? 'resend_error' };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] exceção Resend:', msg);
    return { ok: false, error: msg };
  }
}

// High-level helpers — cada um sabe qual template aplicar

export function sendWelcome(t: TenantCtx, to: string) {
  const { subject, html } = tplWelcome(t);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'welcome' }] });
}

export function sendInvoiceCreated(t: TenantCtx, inv: InvoiceCtx, to: string) {
  const { subject, html } = tplInvoiceCreated(t, inv);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'invoice_created' }] });
}

export function sendInvoiceReminder(t: TenantCtx, inv: InvoiceCtx, to: string) {
  const { subject, html } = tplInvoiceReminder(t, inv);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'invoice_reminder' }] });
}

export function sendInvoiceOverdue(t: TenantCtx, inv: InvoiceCtx, daysOverdue: number, to: string) {
  const { subject, html } = tplInvoiceOverdue(t, inv, daysOverdue);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'invoice_overdue' }] });
}

export function sendSuspensionWarning(t: TenantCtx, inv: InvoiceCtx, to: string) {
  const { subject, html } = tplSuspensionWarning(t, inv);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'suspension_warning' }] });
}

export function sendTenantSuspended(t: TenantCtx, to: string) {
  const { subject, html } = tplTenantSuspended(t);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'tenant_suspended' }] });
}

export function sendTrialActivated(t: TenantCtx, to: string) {
  const { subject, html } = tplTrialActivated(t);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'trial_activated' }] });
}

export function sendTrialSuspended(t: TenantCtx, to: string) {
  const { subject, html } = tplTrialSuspended(t);
  return sendEmail({ to, subject, html, tags: [{ name: 'type', value: 'trial_suspended' }] });
}
