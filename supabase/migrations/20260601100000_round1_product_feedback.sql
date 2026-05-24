-- Round 1 de feedback do Giovanni (2026-05-24):
-- 1. Tipo de máquina: combinar 'snack'+'beverage'+'combo' em 'snack_beverage'
-- 2. machine_products: preço de venda POR máquina (mesmo produto pode ter preços diferentes)
-- 3. finance_settings: taxas de débito, vale alimentação/refeição e outros vouchers

-- ============================================
-- 1) Normalizar machine_type
-- ============================================
-- Drop o check constraint antigo, normaliza valores, recria mais permissivo
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_machine_type_check;

UPDATE public.machines
   SET machine_type = 'snack_beverage'
 WHERE machine_type IN ('snack', 'beverage', 'combo');

ALTER TABLE public.machines
  ADD CONSTRAINT machines_machine_type_check
  CHECK (machine_type IS NULL OR machine_type IN ('snack_beverage', 'coffee', 'other'));

COMMENT ON COLUMN public.machines.machine_type IS
  'Valores: snack_beverage | coffee | other';

-- ============================================
-- 1b) Produto: adicionar unit_size (peso/gramatura/volume)
-- ============================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_size VARCHAR(20);

COMMENT ON COLUMN public.products.unit_size IS
  'Tamanho/gramatura/volume (ex: "350ml", "41,5g", "500ml"). Texto livre.';
COMMENT ON COLUMN public.products.barcode IS
  'Código de barras — DEPRECATED na UI mas mantido para parsers de telemetria (VMPay/Vendpago).';

-- ============================================
-- 2) machine_products: preço por máquina
-- ============================================
CREATE TABLE IF NOT EXISTS public.machine_products (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Preço de venda específico desta máquina (override sobre o default do produto)
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  -- Preço de custo opcional por máquina (logística diferente, etc)
  cost_price NUMERIC(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),

  -- Posição/canaleta opcional (ex: "A1", "B3")
  slot_code VARCHAR(20),

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (machine_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_machine_products_tenant
  ON public.machine_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_machine_products_machine
  ON public.machine_products(machine_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_machine_products_product
  ON public.machine_products(product_id) WHERE is_active = true;

-- RLS
ALTER TABLE public.machine_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_products_tenant_isolation ON public.machine_products;
CREATE POLICY machine_products_tenant_isolation
  ON public.machine_products
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_machine_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_machine_products_touch ON public.machine_products;
CREATE TRIGGER trg_machine_products_touch
  BEFORE UPDATE ON public.machine_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_machine_products_updated_at();

-- ============================================
-- 3) finance_settings: novas taxas (débito + vouchers)
-- ============================================
ALTER TABLE public.finance_settings
  ADD COLUMN IF NOT EXISTS debit_card_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 2.0
    CHECK (debit_card_fee_percent BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS meal_voucher_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 5.0
    CHECK (meal_voucher_fee_percent BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS other_voucher_fees JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Rename: o "card_fee_percent" original passa a ser tratado como CRÉDITO
COMMENT ON COLUMN public.finance_settings.card_fee_percent IS
  'Taxa sobre receita de cartão de CRÉDITO (%). Débito é debit_card_fee_percent.';
COMMENT ON COLUMN public.finance_settings.debit_card_fee_percent IS
  'Taxa sobre receita de cartão de DÉBITO (%).';
COMMENT ON COLUMN public.finance_settings.meal_voucher_fee_percent IS
  'Taxa sobre receita de Vale Alimentação/Refeição (Alelo, Sodexo, VR, Ticket) (%).';
COMMENT ON COLUMN public.finance_settings.other_voucher_fees IS
  'Outras taxas de vouchers/meios alternativos. Formato: [{"label":"Nome","percent":3.5}].';
