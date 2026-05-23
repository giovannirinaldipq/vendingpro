/**
 * Wrapper Twilio WhatsApp Business — apenas via fetch REST, sem SDK.
 * Ativado apenas se TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM existirem.
 */

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+14155238886

export function isWhatsappConfigured(): boolean {
  return !!(SID && TOKEN && FROM);
}

export interface WaSendResult {
  ok: boolean;
  sid?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendWhatsApp(to: string, body: string): Promise<WaSendResult> {
  if (!isWhatsappConfigured()) return { ok: false, skipped: true, error: 'whatsapp_not_configured' };
  if (!to) return { ok: false, error: 'destinatário vazio' };

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\D/g, '').replace(/^/, '+')}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const params = new URLSearchParams({
    From: FROM!,
    To: toFormatted,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const json = await res.json() as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: json.message ?? `twilio_${res.status}` };
    return { ok: true, sid: json.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
