-- Adiciona vínculo do tenant com o customer no Asaas
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_tenants_asaas_customer
  ON public.tenants(asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;
