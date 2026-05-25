import { APP_URL, EMAIL_SUPPORT } from './client';

interface LayoutInput {
  title: string;
  preheader?: string;
  content: string;
}

export function renderLayout({ title, preheader = '', content }: LayoutInput): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;">
<div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #eaeaea;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">VendingPro</div>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1a1a1a;">
        ${content}
      </td></tr>
      <tr><td style="padding:24px 32px;background:#fafafa;border-top:1px solid #eaeaea;font-size:12px;color:#64748b;line-height:1.5;">
        Precisa de ajuda? Fale com a gente em <a href="mailto:${EMAIL_SUPPORT}" style="color:#0f172a;text-decoration:underline;">${EMAIL_SUPPORT}</a><br/>
        <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">${APP_URL}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="background:#0f172a;border-radius:8px;"><a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
