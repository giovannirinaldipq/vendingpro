-- Motor de alertas automático: thresholds por tenant, distinção auto/manual e dedup

-- 1) Settings por tenant
CREATE TABLE IF NOT EXISTS public.alert_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  machine_stopped_hours INT NOT NULL DEFAULT 24 CHECK (machine_stopped_hours BETWEEN 1 AND 240),
  sales_drop_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (sales_drop_threshold_percent BETWEEN 1 AND 100),
  sales_drop_period_days INT NOT NULL DEFAULT 7 CHECK (sales_drop_period_days BETWEEN 2 AND 90),
  rupture_estimate_days INT NOT NULL DEFAULT 3 CHECK (rupture_estimate_days BETWEEN 1 AND 30),
  product_stale_days INT NOT NULL DEFAULT 14 CHECK (product_stale_days BETWEEN 3 AND 180),
  contract_expiring_days INT NOT NULL DEFAULT 30 CHECK (contract_expiring_days BETWEEN 7 AND 180),

  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_min_severity VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (email_min_severity IN ('low', 'medium', 'high', 'critical')),
  email_recipients TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Trigger: ao criar tenant, garante settings default
CREATE OR REPLACE FUNCTION public.ensure_alert_settings() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.alert_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_alert_settings_default ON public.tenants;
CREATE TRIGGER tenants_alert_settings_default
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.ensure_alert_settings();

-- 3) Backfill para tenants já existentes
INSERT INTO public.alert_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 4) Distinção auto/manual + dedup nos alerts
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto')),
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Único por (tenant, dedup_key) enquanto active
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup_active
  ON public.alerts(tenant_id, dedup_key)
  WHERE dedup_key IS NOT NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_alerts_source ON public.alerts(source);
