-- Sprint reabastecedor (auth): linkar restocker à auth.users via magic link
-- Reabastecedor passa a fazer login real pra usar fluxo de check-in/out com fotos

ALTER TABLE public.restockers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.restockers.user_id IS
  'Linka o reabastecedor ao auth.users quando ele aceita o convite e completa o setup.';

CREATE INDEX IF NOT EXISTS idx_restockers_user_id ON public.restockers(user_id) WHERE user_id IS NOT NULL;

-- Função pra resolver "qual restocker é este auth.user?" — usada nas APIs /r/*
CREATE OR REPLACE FUNCTION public.get_restocker_for_user(p_user_id UUID)
RETURNS TABLE (
  id UUID, tenant_id UUID, name TEXT, email TEXT, phone TEXT, is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, name::text, email::text, phone::text, is_active
  FROM public.restockers
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_restocker_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restocker_for_user(UUID) TO authenticated;
