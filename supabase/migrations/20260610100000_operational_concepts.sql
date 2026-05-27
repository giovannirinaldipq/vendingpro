-- ============================================================
-- Conceitos Operacionais: Planograma + Estoque por MÃ¡quina
-- ============================================================
-- Evolui o sistema para suportar:
-- 1. Capacidade por posiÃ§Ã£o (planograma)
-- 2. Estoque individual por mÃ¡quina (machine_inventory)
-- 3. Pick list baseada em capacidade - estoque = levar
-- 4. Ajuste de inventÃ¡rio por mÃ¡quina com rastreabilidade
-- ============================================================

-- 1) Adiciona max_capacity em machine_products (planograma por posiÃ§Ã£o)
ALTER TABLE public.machine_products
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0);

COMMENT ON COLUMN public.machine_products.max_capacity IS
  'Capacidade mÃ¡xima do slot/posiÃ§Ã£o (unidades). NULL = usa machines.slot_capacity como fallback.';

-- 2) Tabela machine_inventory (estoque por mÃ¡quina, trigger-maintained)
CREATE TABLE IF NOT EXISTS public.machine_inventory (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (machine_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_machine_inventory_tenant
  ON public.machine_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_machine_inventory_machine
  ON public.machine_inventory(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_inventory_product
  ON public.machine_inventory(product_id);

ALTER TABLE public.machine_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY machine_inventory_tenant_isolation ON public.machine_inventory
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

GRANT ALL ON public.machine_inventory TO service_role;
GRANT SELECT ON public.machine_inventory TO authenticated;

-- 3) FunÃ§Ã£o que recomputa estoque de uma mÃ¡quina+produto via SUM(movements)
CREATE OR REPLACE FUNCTION public.recompute_machine_inventory(
  p_tenant UUID, p_machine UUID, p_product UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_total
  FROM public.inventory_movements
  WHERE tenant_id = p_tenant
    AND machine_id = p_machine
    AND product_id = p_product;

  v_total := GREATEST(v_total, 0);

  INSERT INTO public.machine_inventory (tenant_id, machine_id, product_id, current_quantity, last_updated_at)
  VALUES (p_tenant, p_machine, p_product, v_total, NOW())
  ON CONFLICT (machine_id, product_id)
  DO UPDATE SET current_quantity = v_total, last_updated_at = NOW();

  RETURN v_total;
END;
$$;

-- 4) Estende trigger existente para manter machine_inventory
CREATE OR REPLACE FUNCTION public.inventory_movements_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_inventory_quantity(OLD.tenant_id, OLD.product_id);
    IF OLD.machine_id IS NOT NULL THEN
      PERFORM public.recompute_machine_inventory(OLD.tenant_id, OLD.machine_id, OLD.product_id);
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_inventory_quantity(NEW.tenant_id, NEW.product_id);
    IF NEW.machine_id IS NOT NULL THEN
      PERFORM public.recompute_machine_inventory(NEW.tenant_id, NEW.machine_id, NEW.product_id);
    END IF;
    IF NEW.product_id <> OLD.product_id OR NEW.tenant_id <> OLD.tenant_id THEN
      PERFORM public.recompute_inventory_quantity(OLD.tenant_id, OLD.product_id);
    END IF;
    IF OLD.machine_id IS NOT NULL AND (OLD.machine_id IS DISTINCT FROM NEW.machine_id OR OLD.product_id <> NEW.product_id) THEN
      PERFORM public.recompute_machine_inventory(OLD.tenant_id, OLD.machine_id, OLD.product_id);
    END IF;
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.recompute_inventory_quantity(NEW.tenant_id, NEW.product_id);
    IF NEW.machine_id IS NOT NULL THEN
      PERFORM public.recompute_machine_inventory(NEW.tenant_id, NEW.machine_id, NEW.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- 5) Backfill: popula machine_inventory a partir de movements existentes
INSERT INTO public.machine_inventory (tenant_id, machine_id, product_id, current_quantity, last_updated_at)
SELECT
  tenant_id,
  machine_id,
  product_id,
  GREATEST(COALESCE(SUM(quantity), 0)::INTEGER, 0),
  NOW()
FROM public.inventory_movements
WHERE machine_id IS NOT NULL
GROUP BY tenant_id, machine_id, product_id
ON CONFLICT (machine_id, product_id)
DO UPDATE SET
  current_quantity = EXCLUDED.current_quantity,
  last_updated_at = NOW();
