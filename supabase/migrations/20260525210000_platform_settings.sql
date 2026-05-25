-- ============================================================
-- Platform settings (singleton) — usadas pelo /admin/configuracoes
-- ============================================================

CREATE TABLE IF NOT EXISTS admin.platform_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT,
  company_cnpj TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  default_trial_days INTEGER NOT NULL DEFAULT 14,
  billing_reminder_days_before INTEGER NOT NULL DEFAULT 3,
  billing_first_overdue_reminder_days INTEGER NOT NULL DEFAULT 3,
  billing_suspension_days INTEGER NOT NULL DEFAULT 15,
  billing_cancellation_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin.users(id)
);

INSERT INTO admin.platform_settings (id, company_name, company_email)
VALUES (1, 'VendingPro', 'contato@vendingpro.com.br')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE admin.platform_settings IS
  'Configurações globais da plataforma SaaS. Singleton (id sempre = 1). Editáveis pelo super_admin via /admin/configuracoes.';
