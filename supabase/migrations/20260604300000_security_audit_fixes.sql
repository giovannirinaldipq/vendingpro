-- ============================================================================
-- Migration: correções do pente fino de segurança/performance (Fase 3)
-- ----------------------------------------------------------------------------
-- Origem: Supabase Advisors (security + performance) em 2026-05-24
-- Fixes:
--  1. View sales_payment_breakdown estava com SECURITY DEFINER → recriar
--     com SECURITY INVOKER (herda RLS do usuário, não do criador)
--  2. Tabela whatsapp_otp_codes tinha RLS sem policies → bloqueia tudo;
--     adicionar policy "service-role only" explícita
--  3. Funções com search_path mutável → fixar pra public, pg_temp
--  4. Revogar EXECUTE de anon em SECURITY DEFINER que checam identidade
--  5. Auth RLS init plan: trocar auth.uid() por (select auth.uid())
--     pra evitar re-evaluation por row em policies hot
--  6. Adicionar índices nas FKs hot (sales, machine_costs, etc)
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1) View sales_payment_breakdown SECURITY INVOKER
-- ───────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.sales_payment_breakdown;

CREATE VIEW public.sales_payment_breakdown
WITH (security_invoker = true) AS
SELECT
  s.tenant_id,
  s.machine_id,
  s.payment_method,
  s.sale_date,
  COUNT(*)                                       AS transaction_count,
  COALESCE(SUM(s.quantity), 0)::integer          AS items_sold,
  COALESCE(SUM(s.total_price), 0)::numeric(12,2) AS revenue
FROM public.sales s
GROUP BY s.tenant_id, s.machine_id, s.payment_method, s.sale_date;

COMMENT ON VIEW public.sales_payment_breakdown IS
  'Breakdown de vendas por forma de pagamento. SECURITY INVOKER — respeita RLS de sales.';

-- ───────────────────────────────────────────────────────────────────
-- 2) whatsapp_otp_codes — policy service-role only (impede leitura via API)
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wa_otp_service_only" ON public.whatsapp_otp_codes;

CREATE POLICY "wa_otp_service_only"
  ON public.whatsapp_otp_codes
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "wa_otp_service_only" ON public.whatsapp_otp_codes IS
  'Bloqueia leitura/escrita via API; OTP só pode ser criado/consultado via service-role no servidor.';

-- ───────────────────────────────────────────────────────────────────
-- 3) Funções: fixar search_path
-- ───────────────────────────────────────────────────────────────────
ALTER FUNCTION public.touch_machine_products_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.ensure_alert_settings()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.ensure_finance_settings()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

-- ───────────────────────────────────────────────────────────────────
-- 4) Revogar EXECUTE de anon nas SECURITY DEFINER que checam identidade.
--    `current_tenant_id` é tolerante (retorna null se sem auth), mas as outras
--    expõem se um user_id existe → revogar.
-- ───────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_restocker_for_user(uuid) FROM anon;
-- current_tenant_id fica acessível: usado em policies como current_tenant_id()
-- e retorna NULL se sem JWT — não vaza info.

-- ───────────────────────────────────────────────────────────────────
-- 5) Auth RLS init plan: substituir auth.uid() por (select auth.uid())
--    pra evitar re-eval por row. Aplicar nas 2 policies flagadas.
-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'admin' AND tablename = 'users' AND policyname = 'admin_users_self_or_super'
  ) THEN
    DROP POLICY "admin_users_self_or_super" ON admin.users;
    CREATE POLICY "admin_users_self_or_super"
      ON admin.users
      FOR SELECT
      USING (
        id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM admin.users u
          WHERE u.id = (SELECT auth.uid()) AND u.role = 'super_admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_whatsapp_2fa' AND policyname = 'user_wa_2fa_self_read'
  ) THEN
    DROP POLICY "user_wa_2fa_self_read" ON public.user_whatsapp_2fa;
    CREATE POLICY "user_wa_2fa_self_read"
      ON public.user_whatsapp_2fa
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 6) Índices nas FKs hot (impacto direto em queries comuns).
--    Pulamos os FKs de admin/billing pouco usados em runtime.
-- ───────────────────────────────────────────────────────────────────
-- sales: usado em todo dashboard, analytics, suggestions
CREATE INDEX IF NOT EXISTS idx_sales_machine_id ON public.sales (machine_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_import_id  ON public.sales (import_id) WHERE import_id IS NOT NULL;

-- alerts: dashboard mostra alertas por máquina
CREATE INDEX IF NOT EXISTS idx_alerts_machine_id ON public.alerts (machine_id) WHERE machine_id IS NOT NULL;

-- machine_costs: tela financeiro/custos filtra por tenant + machine
CREATE INDEX IF NOT EXISTS idx_machine_costs_tenant_id ON public.machine_costs (tenant_id);

-- machines: location_id é usado em joins (lista de máquinas, contratos)
CREATE INDEX IF NOT EXISTS idx_machines_location_id ON public.machines (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_machines_restocker_id ON public.machines (restocker_id) WHERE restocker_id IS NOT NULL;

-- locations: usado em get tenant locations
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON public.locations (tenant_id);

-- restockers: lookup por tenant
CREATE INDEX IF NOT EXISTS idx_restockers_tenant_id ON public.restockers (tenant_id);

-- restocking_visits: histórico de visitas por reabastecedor
CREATE INDEX IF NOT EXISTS idx_restocking_visits_restocker_id
  ON public.restocking_visits (restocker_id);

-- inventory: lookup por produto
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory (product_id);

-- imports: histórico por tenant/user
CREATE INDEX IF NOT EXISTS idx_imports_tenant_id ON public.imports (tenant_id);
CREATE INDEX IF NOT EXISTS idx_imports_user_id   ON public.imports (user_id);
