/**
 * POST /api/auth/2fa/login/send
 * Envia OTP de login pelo WhatsApp para o usuário autenticado.
 * Pré-requisito: user_whatsapp_2fa.is_verified = true para esse user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWhatsApp, isWhatsappConfigured } from '@/lib/notify/whatsapp';
import { generateCode, hashCode, otpExpiresAt } from '@/lib/auth/whatsapp-otp';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { data: factor } = await supabaseAdmin
    .from('user_whatsapp_2fa')
    .select('phone, is_verified')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!factor?.is_verified) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_2FA', message: '2FA WhatsApp não está ativo para este usuário' } },
      { status: 400 }
    );
  }

  // Invalida OTPs login ainda pendentes pra esse usuário
  await supabaseAdmin
    .from('whatsapp_otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('purpose', 'login')
    .is('used_at', null);

  const code = generateCode();
  const expiresAt = otpExpiresAt();

  const { error: insErr } = await supabaseAdmin.from('whatsapp_otp_codes').insert({
    user_id: user.id,
    phone: factor.phone,
    purpose: 'login',
    code_hash: hashCode(code),
    expires_at: expiresAt.toISOString(),
  });

  if (insErr) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: insErr.message } },
      { status: 500 }
    );
  }

  let sendResult: { ok: boolean; skipped?: boolean; error?: string };
  if (isWhatsappConfigured()) {
    sendResult = await sendWhatsApp(
      factor.phone,
      `Vending Pro: seu código de login é ${code}. Válido por 10 minutos.`
    );
  } else {
    console.info(`[2FA-WA login dev] Código para ${factor.phone}: ${code}`);
    sendResult = { ok: false, skipped: true, error: 'whatsapp_not_configured' };
  }

  return NextResponse.json({
    success: true,
    data: {
      sent: sendResult.ok,
      skipped: sendResult.skipped ?? false,
      expires_at: expiresAt.toISOString(),
      phone_hint: factor.phone.slice(0, 3) + '****' + factor.phone.slice(-2),
      dev_code: process.env.NODE_ENV === 'production' ? undefined : code,
    },
  });
}
