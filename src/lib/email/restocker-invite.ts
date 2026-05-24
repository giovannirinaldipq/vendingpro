import { button, renderLayout } from './layout';

export function tplRestockerInvite(opts: {
  restockerName: string;
  companyName: string;
  acceptUrl: string;
}) {
  const title = `Você foi convidado para reabastecer máquinas da ${opts.companyName}`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(opts.restockerName))} 👋</p>
    <p style="margin:0 0 16px;">A <strong>${escape(opts.companyName)}</strong> te cadastrou como reabastecedor das máquinas dela na VendingPro.</p>
    <p style="margin:0 0 16px;">Use o link abaixo para acessar sua conta — você vai ver as máquinas atribuídas, o que precisa ser reposto, e poderá registrar fotos antes e depois do reabastecimento.</p>
    ${button(opts.acceptUrl, 'Acessar minha conta')}
    <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Este link é único e expira em 24 horas. Caso expire, peça um novo convite à empresa.</p>`;
  return { subject: title, html: renderLayout({ title, preheader: 'Acesse para ver suas máquinas e iniciar visitas.', content }) };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
