-- Sprint C Step 21: Capacidade operacional no tenant
-- Permite ao schedule capacity-aware distribuir visitas sem sobrecarregar reabastecedores

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS active_restockers_count INTEGER,
  ADD COLUMN IF NOT EXISTS avg_visits_per_day_per_restocker NUMERIC(4,1) DEFAULT 4.0;

COMMENT ON COLUMN public.tenants.active_restockers_count IS
  'Cache: quantidade de reabastecedores ativos. NULL = usar contagem real via trigger.';
COMMENT ON COLUMN public.tenants.avg_visits_per_day_per_restocker IS
  'Quantas visitas/dia cada reabastecedor consegue fazer em média. Default 4.';

-- Trigger para manter active_restockers_count sincronizado
CREATE OR REPLACE FUNCTION public.recompute_active_restockers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET active_restockers_count = (
    SELECT COUNT(*)::int FROM public.restockers
    WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND is_active = true
  )
  WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_restockers ON public.restockers;
CREATE TRIGGER trg_recompute_restockers
  AFTER INSERT OR UPDATE OF is_active OR DELETE
  ON public.restockers
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_active_restockers();

-- Backfill: set initial count for all tenants
UPDATE public.tenants t
SET active_restockers_count = sub.cnt
FROM (
  SELECT tenant_id, COUNT(*)::int AS cnt
  FROM public.restockers
  WHERE is_active = true
  GROUP BY tenant_id
) sub
WHERE t.id = sub.tenant_id;

-- Tenants sem reabastecedores ficam com 0
UPDATE public.tenants
SET active_restockers_count = 0
WHERE active_restockers_count IS NULL;
