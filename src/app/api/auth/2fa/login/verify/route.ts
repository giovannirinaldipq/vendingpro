/**
 * POST /api/auth/2fa/login/verify
 * Valida código OTP de login e seta cookie httpOnly vp_2fa_passed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashCode, MAX_ATTEMPTS } from '@/lib/auth/whatsapp-otp';
import { TWO_FA_COOKIE, makeTwoFaCookieValue } from '@/lib/auth/2fa-cookie';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data: otp } = await supabaseAdmin
    .from('whatsapp_otp_codes')
    .select('id, code_hash, expires_at, attempts, used_at')
    .eq('user_id', user.id)
    .eq('purpose', 'login')
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_OTP', message: 'Nenhum código ativo. Reenvie.' } },
      { status: 400 }
    );
  }
  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json(
      { success: false, error: { code: 'EXPIRED', message: 'Código expirado. Reenvie.' } },
      { status: 400 }
    );
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Limite de tentativas atingido. Reenvie.' } },
      { status: 429 }
    );
  }

  if (otp.code_hash !== hashCode(parsed.data.code)) {
    await supabaseAdmin
      .from('whatsapp_otp_codes')
      .update({ attempts: (otp.attempts ?? 0) + 1 })
      .eq('id', otp.id);
    return NextResponse.json(
      { success: false, error: { code: 'INVALID', message: 'Código incorreto' } },
      { status: 400 }
    );
  }

  // Sucesso — marca usado e seta cookie
  await supabaseAdmin
    .from('whatsapp_otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otp.id);

  const { value, maxAge } = await makeTwoFaCookieValue(user.id);
  const cookieStore = await cookies();
  cookieStore.set(TWO_FA_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  return NextResponse.json({ success: true });
}
