/**
 * Cookie httpOnly que comprova que o usuário passou pelo desafio 2FA WhatsApp
 * nessa sessão. Validade: 12h. Assinatura HMAC-SHA256 com SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usa WebCrypto API (globalThis.crypto.subtle) — compatível com Edge Runtime
 * (middleware) e Node Runtime (route handlers).
 */
export const TWO_FA_COOKIE = 'vp_2fa_passed';
export const TWO_FA_TTL_HOURS = 12;

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('[2fa-cookie] SUPABASE_SERVICE_ROLE_KEY ausente');
  return s;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bufToHex(sig);
}

export async function makeTwoFaCookieValue(userId: string): Promise<{ value: string; maxAge: number }> {
  const expiresAt = Date.now() + TWO_FA_TTL_HOURS * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const sig = await sign(payload);
  return {
    value: `${payload}.${sig}`,
    maxAge: TWO_FA_TTL_HOURS * 60 * 60,
  };
}

/**
 * Devolve userId se cookie válido + não-expirado; caso contrário null.
 */
export async function verifyTwoFaCookie(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  let expected: string;
  try {
    expected = await sign(`${userId}.${expiresAtStr}`);
  } catch {
    return null;
  }
  return timingSafeEqualHex(sig, expected) ? userId : null;
}
