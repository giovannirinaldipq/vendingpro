-- Remove planos inativos (sem clientes vinculados)
DELETE FROM billing.plans WHERE is_active = false AND id NOT IN (
  SELECT DISTINCT plan_id FROM public.tenants WHERE plan_id IS NOT NULL
);

-- Rastreia maquinas no momento do faturamento anterior (pro-rata de novas maquinas)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_billed_machines INTEGER DEFAULT 0;

COMMENT ON COLUMN public.tenants.last_billed_machines IS 'Quantidade de maquinas ativas no ultimo faturamento. Usado para calcular pro-rata de maquinas novas.';

-- View publica para collection_events (mesmo pattern das demais views)
CREATE OR REPLACE VIEW public.billing_collection_events_view AS
SELECT * FROM billing.collection_events;

-- Garante que as views existentes suportam INSERT/UPDATE/DELETE
GRANT ALL ON public.billing_invoices_view TO service_role;
GRANT ALL ON public.billing_payments_view TO service_role;
GRANT ALL ON public.billing_plans_view TO service_role;
GRANT ALL ON public.billing_collection_events_view TO service_role;
GRANT ALL ON billing.collection_events TO service_role;
GRANT SELECT ON public.billing_collection_events_view TO authenticated;
