/**
 * Confirma setup do 2FA WhatsApp:
 * Valida OTP, marca is_verified=true.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashCode, MAX_ATTEMPTS } from '@/lib/auth/whatsapp-otp';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
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
      { success: false, error: { code: 'INVALID_CODE', message: v.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data: otp } = await supabaseAdmin
    .from('whatsapp_otp_codes')
    .select('id, code_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .eq('purpose', 'setup')
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_OTP', message: 'Nenhum código pendente — solicite um novo' } },
      { status: 400 }
    );
  }

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from('whatsapp_otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otp.id);
    return NextResponse.json(
      { success: false, error: { code: 'EXPIRED', message: 'Código expirou — solicite um novo' } },
      { status: 400 }
    );
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await supabaseAdmin
      .from('whatsapp_otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otp.id);
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas — solicite um novo código' } },
      { status: 429 }
    );
  }

  const isMatch = otp.code_hash === hashCode(v.data.code);
  if (!isMatch) {
    await supabaseAdmin
      .from('whatsapp_otp_codes')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id);
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CODE', message: 'Código inválido' } },
      { status: 400 }
    );
  }

  // Marca OTP como usado e ativa 2FA
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('whatsapp_otp_codes')
    .update({ used_at: now })
    .eq('id', otp.id);

  await supabaseAdmin
    .from('user_whatsapp_2fa')
    .update({ is_verified: true, verified_at: now, updated_at: now })
    .eq('user_id', user.id);

  return NextResponse.json({
    success: true,
    data: { message: '2FA via WhatsApp ativado com sucesso' },
  });
}
