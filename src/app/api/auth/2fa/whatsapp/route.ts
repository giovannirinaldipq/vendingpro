/**
 * GET — Status do 2FA WhatsApp do usuário logado
 * DELETE — Desativa o 2FA WhatsApp
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from('user_whatsapp_2fa')
    .select('phone, is_verified, verified_at, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    data: data ?? null,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { error: factorErr } = await supabaseAdmin
    .from('user_whatsapp_2fa')
    .delete()
    .eq('user_id', user.id);

  if (factorErr) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: `Falha ao remover fator 2FA: ${factorErr.message}` } },
      { status: 500 }
    );
  }

  const { error: otpErr } = await supabaseAdmin
    .from('whatsapp_otp_codes')
    .delete()
    .eq('user_id', user.id);

  if (otpErr) {
    // Fator já foi removido, mas OTPs antigos seguem — não é crítico, mas reporta.
    return NextResponse.json(
      { success: false, error: { code: 'PARTIAL', message: `2FA desativado, mas códigos antigos não foram limpos: ${otpErr.message}` } },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true });
}
