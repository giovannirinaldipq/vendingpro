-- 🔒 Segurança crítica: habilita Row Level Security em todas as tabelas
-- e cria policies de tenant isolation.
--
-- IMPORTANTE: rotas server-side (cron, webhooks, /api/admin/*) usam
-- SUPABASE_SERVICE_ROLE_KEY que BYPASSA RLS — continuam funcionando.
-- Rotas /api/app/* usam o token do usuário logado e respeitam RLS.

-- ============================================================
-- Helper: pega tenant_id do usuário autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS UUID
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = admin
AS $$
  SELECT EXISTS(SELECT 1 FROM admin.users WHERE id = auth.uid() AND is_active);
$$;

-- ============================================================
-- public.tenants — user vê só o próprio
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
CREATE POLICY tenants_select_own ON public.tenants FOR SELECT
  USING (id = public.current_tenant_id() OR public.is_admin_user());

-- ============================================================
-- public.users — vê só users do próprio tenant
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select_same_tenant ON public.users;
CREATE POLICY users_select_same_tenant ON public.users FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user());

-- ============================================================
-- Tabelas de dados do tenant — isolamento total por tenant_id
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'locations', 'machines', 'products', 'sales', 'imports',
    'restockers', 'restocking_visits', 'restocking_items',
    'machine_costs', 'alerts', 'inventory', 'inventory_movements',
    'alert_settings', 'finance_settings'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL
       USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
       WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user())',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- Schema billing — apenas admins via API ou service_role
-- ============================================================
ALTER TABLE billing.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_admin_only ON billing.plans;
CREATE POLICY plans_read_all ON billing.plans FOR SELECT
  USING (true); -- planos são públicos (catálogo)

ALTER TABLE billing.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant_or_admin ON billing.invoices;
CREATE POLICY invoices_tenant_or_admin ON billing.invoices FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user());

ALTER TABLE billing.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_tenant_or_admin ON billing.payments;
CREATE POLICY payments_tenant_or_admin ON billing.payments FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user());

ALTER TABLE billing.collection_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collection_admin ON billing.collection_events;
CREATE POLICY collection_admin ON billing.collection_events FOR SELECT
  USING (public.is_admin_user());

-- ============================================================
-- Schema admin — apenas admins
-- ============================================================
ALTER TABLE admin.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_users_self_or_super ON admin.users;
CREATE POLICY admin_users_self_or_super ON admin.users FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS(SELECT 1 FROM admin.users u WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active)
  );

ALTER TABLE admin.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin_only ON admin.audit_logs;
CREATE POLICY audit_admin_only ON admin.audit_logs FOR SELECT
  USING (public.is_admin_user());
