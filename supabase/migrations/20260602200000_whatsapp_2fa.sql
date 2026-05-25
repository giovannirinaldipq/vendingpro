-- 2FA via WhatsApp — V1 (setup do número + verificação)
-- V2 (hijack do login com challenge) fica pra próximo round

-- Cadastro do telefone WhatsApp por usuário (1:1)
CREATE TABLE IF NOT EXISTS public.user_whatsapp_2fa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_whatsapp_2fa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_wa_2fa_self_read ON public.user_whatsapp_2fa;
CREATE POLICY user_wa_2fa_self_read
  ON public.user_whatsapp_2fa
  FOR SELECT
  USING (user_id = auth.uid());

-- OTPs temporários (válidos por ~10min, 1 ativo por user/purpose)
CREATE TABLE IF NOT EXISTS public.whatsapp_otp_codes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  -- 'setup' = confirmação inicial do número, 'login' = challenge no login
  purpose TEXT NOT NULL CHECK (purpose IN ('setup', 'login')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_otp_user_purpose
  ON public.whatsapp_otp_codes(user_id, purpose, used_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wa_otp_expires
  ON public.whatsapp_otp_codes(expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.whatsapp_otp_codes ENABLE ROW LEVEL SECURITY;
-- Sem policy de leitura — só service-role acessa (não vaza code_hash)
