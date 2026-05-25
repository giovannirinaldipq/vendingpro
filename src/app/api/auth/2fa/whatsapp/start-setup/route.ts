/**
 * Inicia setup do 2FA WhatsApp:
 * 1. Recebe phone do usuário
 * 2. Gera OTP de 6 dígitos
 * 3. Envia via WhatsApp Business
 * 4. Salva código (hash) na tabela whatsapp_otp_codes com purpose='setup'
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWhatsApp, isWhatsappConfigured } from '@/lib/notify/whatsapp';
import { generateCode, hashCode, normalizePhone, isValidPhone, otpExpiresAt } from '@/lib/auth/whatsapp-otp';

const schema = z.object({
  phone: z.string().min(8).max(20),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const v = schema.safeParse(body);
  if (!v.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PHONE', message: 'Telefone inválido' } },
      { status: 400 }
    );
  }

  const phone = normalizePhone(v.data.phone);
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PHONE', message: 'Telefone com formato inválido' } },
      { status: 400 }
    );
  }

  // Upsert do registro com is_verified=false (zera flag se já existia ativo)
  await supabaseAdmin
    .from('user_whatsapp_2fa')
    .upsert({
      user_id: user.id,
      phone,
      is_verified: false,
      verified_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  // Invalida OTPs setup pendentes
  await supabaseAdmin
    .from('whatsapp_otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('purpose', 'setup')
    .is('used_at', null);

  const code = generateCode();
  const expiresAt = otpExpiresAt();

  await supabaseAdmin.from('whatsapp_otp_codes').insert({
    user_id: user.id,
    phone,
    purpose: 'setup',
    code_hash: hashCode(code),
    expires_at: expiresAt.toISOString(),
  });

  // Envia código (se WhatsApp configurado). Em dev pode logar no console.
  let sendResult;
  if (isWhatsappConfigured()) {
    sendResult = await sendWhatsApp(
      phone,
      `Vending Pro: seu código de verificação é ${code}. Válido por 10 minutos.`
    );
  } else {
     
    console.info(`[2FA-WA dev] Código para ${phone}: ${code}`);
    sendResult = { ok: false, skipped: true, error: 'whatsapp_not_configured' };
  }

  return NextResponse.json({
    success: true,
    data: {
      sent: sendResult.ok,
      skipped: sendResult.skipped ?? false,
      expires_at: expiresAt.toISOString(),
      message: sendResult.ok
        ? 'Código enviado por WhatsApp'
        : (sendResult.skipped
          ? 'WhatsApp não configurado — código no log do servidor (dev)'
          : `Falha ao enviar: ${sendResult.error}`),
      // Em dev, devolve o código pra facilitar teste. NÃO fazer isso em prod.
      dev_code: process.env.NODE_ENV === 'production' ? undefined : code,
    },
  });
}
