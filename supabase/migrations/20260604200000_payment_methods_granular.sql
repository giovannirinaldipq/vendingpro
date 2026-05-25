-- ============================================================================
-- Migration: padronização de formas de pagamento (granular)
-- ----------------------------------------------------------------------------
-- Hoje sales.payment_method aceita qualquer string. Padronizar pra:
--   cash, debit, credit, pix, meal_voucher (VR/VA), transport_voucher (VT),
--   other_voucher, cashless, unknown
--
-- Backfill: valores legados são normalizados antes da check constraint.
-- ============================================================================

-- 1) Backfill: normaliza valores existentes
UPDATE public.sales
SET payment_method = CASE
  WHEN LOWER(payment_method) IN ('card', 'cartao', 'cartão') THEN 'credit'
  WHEN LOWER(payment_method) IN ('debit', 'débito', 'debito', 'cartao_debito') THEN 'debit'
  WHEN LOWER(payment_method) IN ('credit', 'credito', 'crédito', 'cartao_credito') THEN 'credit'
  WHEN LOWER(payment_method) IN ('pix') THEN 'pix'
  WHEN LOWER(payment_method) IN ('cash', 'dinheiro') THEN 'cash'
  WHEN LOWER(payment_method) IN ('cashless', 'cashless_aggregated') THEN 'cashless'
  WHEN LOWER(payment_method) LIKE '%vale%refeic%' OR LOWER(payment_method) LIKE '%vr%' THEN 'meal_voucher'
  WHEN LOWER(payment_method) LIKE '%vale%aliment%' OR LOWER(payment_method) LIKE '%va%' THEN 'meal_voucher'
  WHEN LOWER(payment_method) LIKE '%transport%' OR LOWER(payment_method) LIKE '%vt%' THEN 'transport_voucher'
  WHEN LOWER(payment_method) LIKE '%voucher%' OR LOWER(payment_method) LIKE '%vale%' THEN 'other_voucher'
  WHEN payment_method IS NULL OR payment_method = '' THEN 'unknown'
  ELSE 'unknown'
END
WHERE payment_method IS NULL
   OR payment_method NOT IN (
     'cash', 'debit', 'credit', 'pix', 'meal_voucher',
     'transport_voucher', 'other_voucher', 'cashless', 'unknown'
   );

-- 2) Drop check antigo se existir
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- 3) Adiciona check constraint
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN (
    'cash', 'debit', 'credit', 'pix', 'meal_voucher',
    'transport_voucher', 'other_voucher', 'cashless', 'unknown'
  ));

-- 4) Default = 'unknown' pra inserts futuros que esquecem
ALTER TABLE public.sales ALTER COLUMN payment_method SET DEFAULT 'unknown';
ALTER TABLE public.sales ALTER COLUMN payment_method SET NOT NULL;

-- 5) Index pra agrupamento rápido
CREATE INDEX IF NOT EXISTS idx_sales_payment_method
  ON public.sales (tenant_id, payment_method, sale_date);

-- ============================================================================
-- View materializada NÃO — view comum (sales mudam direto, precisa estar fresh)
-- ============================================================================

CREATE OR REPLACE VIEW public.sales_payment_breakdown AS
SELECT
  s.tenant_id,
  s.machine_id,
  s.payment_method,
  s.sale_date,
  COUNT(*)                                   AS transaction_count,
  COALESCE(SUM(s.quantity), 0)::integer       AS items_sold,
  COALESCE(SUM(s.total_price), 0)::numeric(12,2) AS revenue
FROM public.sales s
GROUP BY s.tenant_id, s.machine_id, s.payment_method, s.sale_date;

COMMENT ON VIEW public.sales_payment_breakdown IS
  'Breakdown de vendas por forma de pagamento. Use em /api/app/analytics/payment-breakdown.';

-- A view herda RLS da tabela sales — não precisa policy própria
