-- Sprint 4: módulo Financeiro — taxa cartão/PIX por tenant + suporte ao detector machine_loss

CREATE TABLE IF NOT EXISTS public.finance_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Taxas sobre receita (%)
  card_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 4.0 CHECK (card_fee_percent BETWEEN 0 AND 30),
  pix_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (pix_fee_percent BETWEEN 0 AND 10),
  cash_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (cash_fee_percent BETWEEN 0 AND 10),

  -- Threshold para alerta de prejuízo
  loss_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  loss_alert_period_days INT NOT NULL DEFAULT 30 CHECK (loss_alert_period_days BETWEEN 7 AND 90),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.ensure_finance_settings() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.finance_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_finance_settings_default ON public.tenants;
CREATE TRIGGER tenants_finance_settings_default
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.ensure_finance_settings();

INSERT INTO public.finance_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Garantir índice para queries de custos por máquina
CREATE INDEX IF NOT EXISTS idx_machine_costs_machine_active
  ON public.machine_costs(machine_id, is_active)
  WHERE is_active = true;
