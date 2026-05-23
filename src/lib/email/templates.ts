import { button, formatBRL, formatDate, renderLayout } from './layout';
import { APP_URL } from './client';

export interface TenantCtx {
  company_name: string;
  contact_name: string;
}

export interface InvoiceCtx {
  invoice_number: string;
  total: number;
  due_date: string;
  boleto_url?: string | null;
  pix_code?: string | null;
}

export function tplWelcome(t: TenantCtx) {
  const title = `Bem-vindo à VendingPro, ${firstName(t.contact_name)}`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))} 👋</p>
    <p style="margin:0 0 16px;">Sua conta da <strong>${escape(t.company_name)}</strong> está ativa. Agora é só entrar, cadastrar suas máquinas e começar a importar seus dados de vendas.</p>
    ${button(`${APP_URL}/app`, 'Acessar minha conta')}
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Algumas coisas que recomendamos no primeiro acesso:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#475569;font-size:14px;line-height:1.7;">
      <li>Cadastrar pelo menos um <em>local</em> (ponto comercial)</li>
      <li>Adicionar suas máquinas</li>
      <li>Importar uma planilha do VM PAY para ver dashboards reais</li>
    </ul>`;
  return { subject: title, html: renderLayout({ title, preheader: 'Sua conta VendingPro está pronta.', content }) };
}

export function tplInvoiceCreated(t: TenantCtx, inv: InvoiceCtx) {
  const title = `Nova fatura ${inv.invoice_number}`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">Geramos a fatura de <strong>${formatBRL(inv.total)}</strong> com vencimento em <strong>${formatDate(inv.due_date)}</strong>.</p>
    ${inv.boleto_url ? button(inv.boleto_url, 'Ver boleto / PIX') : button(`${APP_URL}/app/faturas`, 'Acessar minhas faturas')}
    ${inv.pix_code ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;">Código PIX (copia e cola):</p><pre style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${escape(inv.pix_code)}</pre>` : ''}
    <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Em caso de dúvida sobre cobrança, responda este email.</p>`;
  return { subject: title, html: renderLayout({ title, preheader: `Vence em ${formatDate(inv.due_date)}.`, content }) };
}

export function tplInvoiceReminder(t: TenantCtx, inv: InvoiceCtx) {
  const title = `Lembrete: fatura ${inv.invoice_number} vence em breve`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">Passando para lembrar que sua fatura de <strong>${formatBRL(inv.total)}</strong> vence em <strong>${formatDate(inv.due_date)}</strong>.</p>
    ${inv.boleto_url ? button(inv.boleto_url, 'Pagar agora') : button(`${APP_URL}/app/faturas`, 'Ver minha fatura')}`;
  return { subject: title, html: renderLayout({ title, preheader: `Vence em ${formatDate(inv.due_date)}.`, content }) };
}

export function tplInvoiceOverdue(t: TenantCtx, inv: InvoiceCtx, daysOverdue: number) {
  const title = `Fatura ${inv.invoice_number} em atraso (${daysOverdue}d)`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">Sua fatura de <strong>${formatBRL(inv.total)}</strong> está em atraso há <strong>${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}</strong> (venceu em ${formatDate(inv.due_date)}).</p>
    <p style="margin:0 0 16px;">Para evitar a suspensão do acesso, regularize o pagamento o quanto antes.</p>
    ${inv.boleto_url ? button(inv.boleto_url, 'Pagar fatura') : button(`${APP_URL}/app/faturas`, 'Ver minha fatura')}`;
  return { subject: title, html: renderLayout({ title, preheader: `Em atraso há ${daysOverdue}d.`, content }) };
}

export function tplSuspensionWarning(t: TenantCtx, inv: InvoiceCtx) {
  const title = `Aviso final: acesso será suspenso`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">Sua fatura <strong>${escape(inv.invoice_number)}</strong> (${formatBRL(inv.total)}) continua em aberto desde ${formatDate(inv.due_date)}.</p>
    <p style="margin:0 0 16px;">Se não houver regularização, <strong>o acesso à plataforma será suspenso</strong> em breve. Seus dados ficarão preservados — basta pagar para reativar.</p>
    ${inv.boleto_url ? button(inv.boleto_url, 'Pagar para manter o acesso') : button(`${APP_URL}/app/faturas`, 'Ver minha fatura')}`;
  return { subject: title, html: renderLayout({ title, preheader: 'Última chance antes da suspensão.', content }) };
}

export function tplTenantSuspended(t: TenantCtx) {
  const title = `Acesso suspenso — VendingPro`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">O acesso da <strong>${escape(t.company_name)}</strong> à VendingPro foi suspenso por inadimplência.</p>
    <p style="margin:0 0 16px;"><strong>Seus dados continuam preservados.</strong> Assim que você quitar as faturas em aberto, o acesso volta automaticamente.</p>
    ${button(`${APP_URL}/app/faturas`, 'Ver faturas em aberto')}`;
  return { subject: title, html: renderLayout({ title, preheader: 'Acesso suspenso. Dados preservados.', content }) };
}

export function tplTrialActivated(t: TenantCtx) {
  const title = `Seu plano VendingPro está ativo`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">Seu período de avaliação terminou e o plano da <strong>${escape(t.company_name)}</strong> foi ativado com sucesso. A próxima fatura será gerada no dia configurado.</p>
    ${button(`${APP_URL}/app`, 'Ir para a plataforma')}`;
  return { subject: title, html: renderLayout({ title, preheader: 'Trial convertido em plano ativo.', content }) };
}

export function tplTrialSuspended(t: TenantCtx) {
  const title = `Seu trial terminou — escolha um plano`;
  const content = `
    <p style="margin:0 0 16px;">Olá, ${escape(firstName(t.contact_name))}.</p>
    <p style="margin:0 0 16px;">O período de avaliação da <strong>${escape(t.company_name)}</strong> chegou ao fim e nenhum plano foi escolhido. Por isso, o acesso foi suspenso temporariamente.</p>
    <p style="margin:0 0 16px;">Para retomar o uso, basta escolher um plano. Seus dados continuam preservados.</p>
    ${button(`${APP_URL}/app/configuracoes`, 'Escolher plano')}`;
  return { subject: title, html: renderLayout({ title, preheader: 'Escolha um plano para reativar o acesso.', content }) };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
