import { EMAIL_FROM, resend, APP_URL } from './client';
import { renderLayout, button } from './layout';

export async function sendMonthlyReportEmail(
  to: string,
  tenantName: string,
  periodLabel: string,
  pdfBuffer: Buffer
): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  if (!resend) return { ok: false, skipped: true, error: 'resend_not_configured' };

  const title = `Relatório mensal · ${periodLabel}`;
  const content = `
    <p style="margin:0 0 16px;">Olá,</p>
    <p style="margin:0 0 16px;">O relatório de ${periodLabel} da <strong>${escapeHtml(tenantName)}</strong> está em anexo.</p>
    <p style="margin:0 0 16px;">Ele traz: resultado líquido, top 5 máquinas, produtos campeões, alertas e visitas do período.</p>
    ${button(`${APP_URL}/app/relatorios`, 'Ver no app')}`;

  const html = renderLayout({ title, preheader: `Resultado de ${periodLabel}.`, content });

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: title,
      html,
      attachments: [{
        filename: `relatorio-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
      }],
      tags: [{ name: 'type', value: 'monthly_report' }],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
