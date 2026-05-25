-- ============================================================
-- Admin "Definitivo": impersonation + lifecycle audit + helpers
-- ============================================================
-- 1. Tabela de sessões de impersonação (admin loga como tenant)
-- 2. Colunas de auditoria de mudanças de status em tenants
-- 3. Índices auxiliares pra views de admin
-- ============================================================

-- 1) Sessões de impersonação
CREATE TABLE IF NOT EXISTS admin.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  CONSTRAINT impersonation_dates_valid CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin_active
  ON admin.impersonation_sessions(admin_user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_impersonation_tenant
  ON admin.impersonation_sessions(tenant_id, started_at DESC);

COMMENT ON TABLE admin.impersonation_sessions IS
  'Rastreia quando um admin acessa o /app como um cliente específico. Sessão ativa = ended_at IS NULL AND expires_at > NOW().';

-- 2) Auditoria de lifecycle do tenant (quem suspendeu/reativou e por quê)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES admin.users(id),
  ADD COLUMN IF NOT EXISTS status_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ;

-- 3) Índice pra listagem de audit_logs por entidade
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON admin.audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user
  ON admin.audit_logs(admin_user_id, created_at DESC);

-- 4) Helper view para últimas atividades por tenant
CREATE OR REPLACE VIEW admin.tenant_activity_summary
WITH (security_invoker = true)
AS
SELECT
  t.id AS tenant_id,
  t.company_name,
  t.subscription_status,
  (SELECT COUNT(*) FROM public.machines m WHERE m.tenant_id = t.id) AS machines_count,
  (SELECT COUNT(*) FROM public.users u WHERE u.tenant_id = t.id AND u.is_active = true) AS users_count,
  (SELECT MAX(u.last_login_at) FROM public.users u WHERE u.tenant_id = t.id) AS last_user_login,
  (SELECT COUNT(*) FROM billing.invoices i WHERE i.tenant_id = t.id AND i.status IN ('pending','overdue')) AS open_invoices_count,
  (SELECT COALESCE(SUM(i.total), 0) FROM billing.invoices i WHERE i.tenant_id = t.id AND i.status IN ('pending','overdue')) AS open_invoices_total
FROM public.tenants t;

COMMENT ON VIEW admin.tenant_activity_summary IS
  'Agregados de uso por tenant para o dashboard admin. SECURITY INVOKER respeita RLS do caller.';
