-- Seed de teste: 1 admin + 1 tenant cliente com location/máquinas/produtos/vendas mock.
-- Idempotente via ON CONFLICT DO NOTHING.
--
-- Usuários auth.users já criados via Supabase Auth Admin API:
--   admin@vendingpro.com    → 0fe50649-4d65-43b6-969e-9bc306f7e4ea
--   cliente@empresateste.com → b5411740-cd11-4ca3-89a1-351e843114d7

-- ============================================================
-- 1) ADMIN profile
-- ============================================================
INSERT INTO admin.users (id, email, name, role, is_active)
VALUES (
  '0fe50649-4d65-43b6-969e-9bc306f7e4ea',
  'admin@vendingpro.com',
  'Admin VendingPro',
  'super_admin',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2) TENANT cliente
-- ============================================================
INSERT INTO public.tenants (
  id, company_name, trade_name, document_type, document_number,
  contact_name, contact_email, contact_phone, financial_email,
  address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode,
  subscription_status, trial_ends_at, billing_day, is_active
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Empresa Teste Vending Ltda',
  'Empresa Teste',
  'cnpj',
  '12.345.678/0001-90',
  'João Silva',
  'cliente@empresateste.com',
  '(61) 99999-0001',
  'financeiro@empresateste.com',
  'Setor Comercial Sul', '100', 'Asa Sul', 'Brasília', 'DF', '70300-000',
  'active', -- evita bloqueio do middleware
  NOW() + INTERVAL '60 days',
  10,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3) USER cliente (vinculado ao tenant)
-- ============================================================
INSERT INTO public.users (
  id, tenant_id, email, name, phone, role, is_active,
  notification_email, notification_whatsapp
)
VALUES (
  'b5411740-cd11-4ca3-89a1-351e843114d7',
  '11111111-1111-1111-1111-111111111111',
  'cliente@empresateste.com',
  'João Silva',
  '(61) 99999-0001',
  'owner',
  true,
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4) LOCATION
-- ============================================================
INSERT INTO public.locations (
  id, tenant_id, name, location_type,
  address_street, address_city, address_state, address_zipcode,
  latitude, longitude,
  contact_name, contact_phone,
  contract_type, contract_value, contract_start_date, contract_end_date,
  is_active
)
VALUES (
  '22222222-2222-2222-2222-222222222221',
  '11111111-1111-1111-1111-111111111111',
  'Hospital de Base - Brasília',
  'hospital',
  'SMHS Quadra 101', 'Brasília', 'DF', '70335-900',
  -15.7942, -47.8822, -- centro de Brasília aprox
  'Maria (administração)', '(61) 3315-1200',
  'rent', 500.00, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '45 days',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5) MACHINES (2)
-- ============================================================
INSERT INTO public.machines (
  id, tenant_id, location_id, code, name, machine_type,
  manufacturer, model, total_slots, telemetry_system, status
)
VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'HB-TER-01',
    'Máquina Térreo - Recepção',
    'snack', 'Vendomatic', 'V-700', 36, 'vmpay', 'active'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'HB-2AND-01',
    'Máquina 2º Andar - UTI',
    'beverage', 'Vendomatic', 'V-500-BEV', 24, 'vmpay', 'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6) PRODUTOS (5) com custo
-- ============================================================
INSERT INTO public.products (
  id, tenant_id, name, category,
  default_sale_price, default_cost_price, is_active
)
VALUES
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Coca-Cola 350ml', 'Bebida', 6.00, 2.80, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Água Mineral 500ml', 'Bebida', 4.00, 1.20, true),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', 'Chocolate KitKat 41g', 'Snack', 5.50, 2.40, true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Bolacha Recheada 140g', 'Snack', 4.50, 1.80, true),
  ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111', 'Café Expresso', 'Bebida Quente', 3.50, 0.80, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7) INVENTORY central
-- ============================================================
INSERT INTO public.inventory (tenant_id, product_id, current_quantity, minimum_quantity)
VALUES
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444441', 24, 12),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444442', 48, 12),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444443', 6, 12),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 18, 8),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444445', 100, 30)
ON CONFLICT (tenant_id, product_id) DO NOTHING;

-- ============================================================
-- 8) MACHINE_COSTS (aluguel + telemetria por máquina)
-- ============================================================
INSERT INTO public.machine_costs (
  tenant_id, machine_id, cost_type, description, amount, frequency, start_date, is_active
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'telemetry', 'VM PAY mensal', 80.00, 'monthly', CURRENT_DATE - INTERVAL '6 months', true),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'telemetry', 'VM PAY mensal', 80.00, 'monthly', CURRENT_DATE - INTERVAL '6 months', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9) VENDAS MOCK — 30 dias, distribuição realista
-- ============================================================
DO $$
DECLARE
  i INT;
  ts TIMESTAMPTZ;
  machine_id UUID;
  product_id UUID;
  product_name TEXT;
  product_price NUMERIC;
  hour_int INT;
BEGIN
  -- Gera ~80 vendas espalhadas nos últimos 30 dias
  FOR i IN 1..80 LOOP
    ts := NOW() - (random() * INTERVAL '30 days');
    hour_int := 8 + floor(random() * 12)::INT; -- 8h às 19h
    ts := date_trunc('day', ts) + (hour_int || ' hours')::INTERVAL + (floor(random() * 60) || ' minutes')::INTERVAL;

    -- 60% térreo (mais movimento), 40% 2º andar
    IF random() < 0.6 THEN
      machine_id := '33333333-3333-3333-3333-333333333331';
    ELSE
      machine_id := '33333333-3333-3333-3333-333333333332';
    END IF;

    -- Distribui produtos
    CASE floor(random() * 5)::INT
      WHEN 0 THEN
        product_id := '44444444-4444-4444-4444-444444444441';
        product_name := 'Coca-Cola 350ml';
        product_price := 6.00;
      WHEN 1 THEN
        product_id := '44444444-4444-4444-4444-444444444442';
        product_name := 'Água Mineral 500ml';
        product_price := 4.00;
      WHEN 2 THEN
        product_id := '44444444-4444-4444-4444-444444444443';
        product_name := 'Chocolate KitKat 41g';
        product_price := 5.50;
      WHEN 3 THEN
        product_id := '44444444-4444-4444-4444-444444444444';
        product_name := 'Bolacha Recheada 140g';
        product_price := 4.50;
      ELSE
        product_id := '44444444-4444-4444-4444-444444444445';
        product_name := 'Café Expresso';
        product_price := 3.50;
    END CASE;

    INSERT INTO public.sales (
      tenant_id, machine_id, product_id, product_name,
      sale_date, sale_time, sale_datetime,
      quantity, unit_price, total_price, payment_method,
      raw_data
    )
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      machine_id, product_id, product_name,
      ts::DATE, ts::TIME, ts,
      1, product_price, product_price,
      CASE floor(random() * 3)::INT WHEN 0 THEN 'credit' WHEN 1 THEN 'pix' ELSE 'cash' END,
      jsonb_build_object('import_source', 'seed', 'mock', true)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
