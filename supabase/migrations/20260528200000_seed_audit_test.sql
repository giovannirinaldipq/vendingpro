-- ============================================================
-- Seed: Tenant de auditoria para teste completo do fluxo
-- Tenant: "Auditoria Vending" com 2 máquinas, 6 produtos,
-- machine_products, inventory, movements (vendas + restock)
-- ============================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_machine1_id UUID;
  v_machine2_id UUID;
  v_loc_id UUID;
  v_prod1 UUID; v_prod2 UUID; v_prod3 UUID;
  v_prod4 UUID; v_prod5 UUID; v_prod6 UUID;
BEGIN
  -- Tenant
  INSERT INTO public.tenants (id, name, document_number, email, phone, plan, status, contracted_machines)
  VALUES (extensions.uuid_generate_v4(), 'Auditoria Vending', '99.999.999/0001-99', 'audit@test.com', '11999999999', 'professional', 'active', 10)
  RETURNING id INTO v_tenant_id;

  -- User (sem auth_user_id — será vinculado via login)
  INSERT INTO public.users (id, tenant_id, email, name, role, is_active)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'audit@test.com', 'Auditor Teste', 'owner', true)
  RETURNING id INTO v_user_id;

  -- Location
  INSERT INTO public.locations (id, tenant_id, name, address, city, state)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Shopping Centro', 'Rua das Flores 100', 'São Paulo', 'SP')
  RETURNING id INTO v_loc_id;

  -- Machines
  INSERT INTO public.machines (id, tenant_id, location_id, code, name, machine_type, status, total_slots)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, v_loc_id, 'AUD-001', 'Máquina Lobby', 'snack_beverage', 'active', 12)
  RETURNING id INTO v_machine1_id;

  INSERT INTO public.machines (id, tenant_id, location_id, code, name, machine_type, status, total_slots)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, v_loc_id, 'AUD-002', 'Máquina Corredor', 'snack_beverage', 'active', 8)
  RETURNING id INTO v_machine2_id;

  -- Products
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Coca-Cola 350ml', 'snack_beverage', true, 6.00, 3.20)
  RETURNING id INTO v_prod1;
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Guaraná Antarctica 350ml', 'snack_beverage', true, 5.50, 2.80)
  RETURNING id INTO v_prod2;
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Ruffles Original 96g', 'snack_beverage', true, 8.00, 4.50)
  RETURNING id INTO v_prod3;
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Bis Lacta 100g', 'snack_beverage', true, 5.00, 2.50)
  RETURNING id INTO v_prod4;
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Água Mineral 500ml', 'snack_beverage', true, 4.00, 1.50)
  RETURNING id INTO v_prod5;
  INSERT INTO public.products (id, tenant_id, name, category, is_active, default_sale_price, default_cost_price)
  VALUES (extensions.uuid_generate_v4(), v_tenant_id, 'Monster Energy 473ml', 'snack_beverage', true, 12.00, 7.00)
  RETURNING id INTO v_prod6;

  -- Machine Products (vincula produtos às máquinas com capacidade)
  INSERT INTO public.machine_products (tenant_id, machine_id, product_id, sale_price, cost_price, slot_code, max_capacity, is_active) VALUES
    (v_tenant_id, v_machine1_id, v_prod1, 6.00, 3.20, 'A1', 10, true),
    (v_tenant_id, v_machine1_id, v_prod2, 5.50, 2.80, 'A2', 10, true),
    (v_tenant_id, v_machine1_id, v_prod3, 8.00, 4.50, 'B1', 8, true),
    (v_tenant_id, v_machine1_id, v_prod4, 5.00, 2.50, 'B2', 8, true),
    (v_tenant_id, v_machine1_id, v_prod5, 4.00, 1.50, 'C1', 12, true),
    (v_tenant_id, v_machine1_id, v_prod6, 12.00, 7.00, 'C2', 6, true),
    (v_tenant_id, v_machine2_id, v_prod1, 6.50, 3.20, 'A1', 8, true),
    (v_tenant_id, v_machine2_id, v_prod3, 8.50, 4.50, 'A2', 6, true),
    (v_tenant_id, v_machine2_id, v_prod5, 4.50, 1.50, 'B1', 10, true),
    (v_tenant_id, v_machine2_id, v_prod6, 12.00, 7.00, 'B2', 4, true);

  -- Inventory (estoque central)
  INSERT INTO public.inventory (tenant_id, product_id, current_quantity, minimum_quantity) VALUES
    (v_tenant_id, v_prod1, 15, 5),
    (v_tenant_id, v_prod2, 8, 4),
    (v_tenant_id, v_prod3, 3, 4),
    (v_tenant_id, v_prod4, 6, 3),
    (v_tenant_id, v_prod5, 20, 8),
    (v_tenant_id, v_prod6, 2, 3);

  -- Inventory Movements: initial + vendas dos últimos 14 dias
  -- Initial (estoque de partida)
  INSERT INTO public.inventory_movements (tenant_id, product_id, machine_id, movement_type, quantity, occurred_at, source_kind) VALUES
    (v_tenant_id, v_prod1, v_machine1_id, 'initial', 10, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod2, v_machine1_id, 'initial', 10, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod3, v_machine1_id, 'initial', 8, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod4, v_machine1_id, 'initial', 8, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod5, v_machine1_id, 'initial', 12, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod6, v_machine1_id, 'initial', 6, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod1, v_machine2_id, 'initial', 8, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod3, v_machine2_id, 'initial', 6, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod5, v_machine2_id, 'initial', 10, NOW() - INTERVAL '20 days', 'seed'),
    (v_tenant_id, v_prod6, v_machine2_id, 'initial', 4, NOW() - INTERVAL '20 days', 'seed');

  -- Vendas (movements negativos) espalhadas nos últimos 14 dias
  INSERT INTO public.inventory_movements (tenant_id, product_id, machine_id, movement_type, quantity, occurred_at, source_kind) VALUES
    -- Coca-Cola: ~3/dia na maq1
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '13 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -2, NOW() - INTERVAL '12 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -4, NOW() - INTERVAL '11 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '10 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -2, NOW() - INTERVAL '9 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '8 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -4, NOW() - INTERVAL '7 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '6 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -2, NOW() - INTERVAL '5 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '4 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '3 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -2, NOW() - INTERVAL '2 days', 'import'),
    (v_tenant_id, v_prod1, v_machine1_id, 'sale', -3, NOW() - INTERVAL '1 day', 'import'),
    -- Guaraná: ~2/dia
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -2, NOW() - INTERVAL '13 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -1, NOW() - INTERVAL '11 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -3, NOW() - INTERVAL '9 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -2, NOW() - INTERVAL '7 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -2, NOW() - INTERVAL '5 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -3, NOW() - INTERVAL '3 days', 'import'),
    (v_tenant_id, v_prod2, v_machine1_id, 'sale', -2, NOW() - INTERVAL '1 day', 'import'),
    -- Ruffles: ~1.5/dia
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -2, NOW() - INTERVAL '12 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -1, NOW() - INTERVAL '10 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -2, NOW() - INTERVAL '8 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -1, NOW() - INTERVAL '6 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -2, NOW() - INTERVAL '4 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -2, NOW() - INTERVAL '2 days', 'import'),
    (v_tenant_id, v_prod3, v_machine1_id, 'sale', -1, NOW() - INTERVAL '1 day', 'import'),
    -- Bis: ~1/dia
    (v_tenant_id, v_prod4, v_machine1_id, 'sale', -1, NOW() - INTERVAL '13 days', 'import'),
    (v_tenant_id, v_prod4, v_machine1_id, 'sale', -2, NOW() - INTERVAL '10 days', 'import'),
    (v_tenant_id, v_prod4, v_machine1_id, 'sale', -1, NOW() - INTERVAL '7 days', 'import'),
    (v_tenant_id, v_prod4, v_machine1_id, 'sale', -1, NOW() - INTERVAL '4 days', 'import'),
    (v_tenant_id, v_prod4, v_machine1_id, 'sale', -2, NOW() - INTERVAL '2 days', 'import'),
    -- Água: ~4/dia
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -4, NOW() - INTERVAL '13 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -5, NOW() - INTERVAL '11 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -3, NOW() - INTERVAL '9 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -4, NOW() - INTERVAL '7 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -5, NOW() - INTERVAL '5 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -4, NOW() - INTERVAL '3 days', 'import'),
    (v_tenant_id, v_prod5, v_machine1_id, 'sale', -3, NOW() - INTERVAL '1 day', 'import'),
    -- Monster: ~0.5/dia
    (v_tenant_id, v_prod6, v_machine1_id, 'sale', -1, NOW() - INTERVAL '12 days', 'import'),
    (v_tenant_id, v_prod6, v_machine1_id, 'sale', -1, NOW() - INTERVAL '8 days', 'import'),
    (v_tenant_id, v_prod6, v_machine1_id, 'sale', -1, NOW() - INTERVAL '4 days', 'import'),
    (v_tenant_id, v_prod6, v_machine1_id, 'sale', -1, NOW() - INTERVAL '1 day', 'import'),
    -- Maq2: Coca ~2/dia
    (v_tenant_id, v_prod1, v_machine2_id, 'sale', -2, NOW() - INTERVAL '12 days', 'import'),
    (v_tenant_id, v_prod1, v_machine2_id, 'sale', -3, NOW() - INTERVAL '9 days', 'import'),
    (v_tenant_id, v_prod1, v_machine2_id, 'sale', -2, NOW() - INTERVAL '6 days', 'import'),
    (v_tenant_id, v_prod1, v_machine2_id, 'sale', -2, NOW() - INTERVAL '3 days', 'import'),
    (v_tenant_id, v_prod1, v_machine2_id, 'sale', -1, NOW() - INTERVAL '1 day', 'import'),
    -- Maq2: Água ~3/dia
    (v_tenant_id, v_prod5, v_machine2_id, 'sale', -3, NOW() - INTERVAL '12 days', 'import'),
    (v_tenant_id, v_prod5, v_machine2_id, 'sale', -4, NOW() - INTERVAL '9 days', 'import'),
    (v_tenant_id, v_prod5, v_machine2_id, 'sale', -3, NOW() - INTERVAL '6 days', 'import'),
    (v_tenant_id, v_prod5, v_machine2_id, 'sale', -2, NOW() - INTERVAL '3 days', 'import'),
    (v_tenant_id, v_prod5, v_machine2_id, 'sale', -3, NOW() - INTERVAL '1 day', 'import');

  -- Um restock no meio (reposição)
  INSERT INTO public.inventory_movements (tenant_id, product_id, machine_id, movement_type, quantity, occurred_at, source_kind) VALUES
    (v_tenant_id, v_prod1, v_machine1_id, 'restock', 10, NOW() - INTERVAL '7 days', 'visit'),
    (v_tenant_id, v_prod5, v_machine1_id, 'restock', 12, NOW() - INTERVAL '7 days', 'visit');

  RAISE NOTICE 'Audit tenant created: %', v_tenant_id;
END $$;
