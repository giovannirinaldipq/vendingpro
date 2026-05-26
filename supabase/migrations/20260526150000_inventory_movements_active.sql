-- ============================================================
-- Inventory Movements como source-of-truth
-- ============================================================
-- public.inventory.current_quantity vira derived de SUM(quantity) dos
-- movements desse produto+tenant. Vendas geram movements negativos,
-- visitas (restock) e ajustes manuais positivos/negativos.
--
-- Endereça o "Problema #1" da auditoria sênior (25/05/2026):
-- antes, estoque era informação morta — só editado manualmente.
-- ============================================================

-- 1) Estende schema existente da tabela inventory_movements
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_kind VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_ref UUID;

-- Preenche occurred_at com created_at pra linhas antigas
UPDATE public.inventory_movements
SET occurred_at = created_at
WHERE occurred_at IS NULL;

ALTER TABLE public.inventory_movements
  ALTER COLUMN occurred_at SET NOT NULL,
  ALTER COLUMN occurred_at SET DEFAULT NOW();

-- 2) Expande os kinds permitidos (preserva os antigos pra compat)
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN (
    'sale', 'restock', 'manual_adjust', 'initial',
    'purchase', 'transfer_out', 'adjustment', 'return'
  ));

-- 3) Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_inv_movements_tenant_product_occurred
  ON public.inventory_movements(tenant_id, product_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_movements_source
  ON public.inventory_movements(source_kind, source_ref)
  WHERE source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_movements_machine
  ON public.inventory_movements(machine_id)
  WHERE machine_id IS NOT NULL;

-- 4) Função que recomputa current_quantity de um produto via SUM(movements)
CREATE OR REPLACE FUNCTION public.recompute_inventory_quantity(p_tenant UUID, p_product UUID)
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
  WHERE tenant_id = p_tenant AND product_id = p_product;

  -- Não permite negativo (defensivo: se vendas excedem estoque, fica 0)
  v_total := GREATEST(v_total, 0);

  INSERT INTO public.inventory (tenant_id, product_id, current_quantity, last_updated_at)
  VALUES (p_tenant, p_product, v_total, NOW())
  ON CONFLICT (tenant_id, product_id)
  DO UPDATE SET current_quantity = v_total, last_updated_at = NOW();

  RETURN v_total;
END;
$$;

-- 5) Trigger que recalcula sempre que movements muda
CREATE OR REPLACE FUNCTION public.inventory_movements_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_inventory_quantity(OLD.tenant_id, OLD.product_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_inventory_quantity(NEW.tenant_id, NEW.product_id);
    -- Se mudou produto, recalcula o antigo também
    IF NEW.product_id <> OLD.product_id OR NEW.tenant_id <> OLD.tenant_id THEN
      PERFORM public.recompute_inventory_quantity(OLD.tenant_id, OLD.product_id);
    END IF;
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.recompute_inventory_quantity(NEW.tenant_id, NEW.product_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_recompute ON public.inventory_movements;
CREATE TRIGGER inventory_movements_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.inventory_movements_after_change();

-- 6) Função auxiliar: pega cutoff (último 'initial' ou 'manual_adjust') por produto.
--    Usada pelo import: vendas com sale_datetime <= cutoff não geram movements
--    (já estão refletidas no estado snapshot do operador).
CREATE OR REPLACE FUNCTION public.inventory_cutoff(p_tenant UUID, p_product UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(occurred_at)
  FROM public.inventory_movements
  WHERE tenant_id = p_tenant
    AND product_id = p_product
    AND movement_type IN ('initial', 'manual_adjust');
$$;

COMMENT ON TABLE public.inventory_movements IS
  'Source-of-truth do estoque. inventory.current_quantity = SUM(quantity desta tabela). Trigger recalcula em cada mudança.';

COMMENT ON FUNCTION public.inventory_cutoff IS
  'Retorna a data do último ajuste explícito (initial ou manual_adjust). Vendas com sale_datetime <= cutoff já estão refletidas no snapshot, NÃO devem gerar movements.';
