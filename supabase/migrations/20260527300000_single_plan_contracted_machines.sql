-- Plano unico VendingPro: desativa planos antigos, cria o definitivo
-- e adiciona contracted_machines ao tenant para controle de limite

-- 1. Desativar planos antigos
UPDATE billing.plans SET is_active = false WHERE slug IN ('essencial', 'profissional', 'completo');

-- 2. Criar plano unico "VendingPro"
INSERT INTO billing.plans (name, slug, price_per_machine, minimum_value, minimum_machines, trial_days, features, limits, is_active)
VALUES (
  'VendingPro',
  'vendingpro',
  69.90,
  69.90,
  1,
  14,
  '["dashboard", "heatmap", "ranking", "products", "alerts", "restocking", "suggestions", "inventory", "financial", "conciliation", "reports"]',
  '{"max_machines": null, "max_users": null, "max_restockers": null, "history_months": null}',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_per_machine = EXCLUDED.price_per_machine,
  minimum_value = EXCLUDED.minimum_value,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  is_active = EXCLUDED.is_active;

-- 3. Adicionar contracted_machines ao tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contracted_machines INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.tenants.contracted_machines IS 'Numero maximo de maquinas ativas que o tenant pode cadastrar. Controlado pelo admin.';
