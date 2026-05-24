-- Seed de dados fictícios para o Giovanni testar a plataforma completa (round 3)
-- Tenant: 11111111-1111-1111-1111-111111111111
-- Restocker: b0ce1325-af98-401c-b480-7712c4bc0741 (Giovanni)

DO $$
DECLARE
  v_tenant uuid := '11111111-1111-1111-1111-111111111111';
  v_restocker uuid := 'b0ce1325-af98-401c-b480-7712c4bc0741';
  v_m_base_terr uuid := '33333333-3333-3333-3333-333333333331';
  v_m_base_2and uuid := '33333333-3333-3333-3333-333333333332';
  v_m_mirassol uuid := '912680fa-7252-44af-bbcc-67c71fb2214a';
  v_m_base_1and uuid := 'c7bee7e5-2388-4b42-b649-8f1137bea983';
  v_p_agua uuid := '44444444-4444-4444-4444-444444444442';
  v_p_bolacha uuid := '44444444-4444-4444-4444-444444444444';
  v_p_cafe uuid := '44444444-4444-4444-4444-444444444445';
  v_p_kitkat uuid := '44444444-4444-4444-4444-444444444443';
  v_p_coca uuid := '44444444-4444-4444-4444-444444444441';
  v_visit_done1 uuid;
  v_visit_done2 uuid;
  v_visit_progress uuid;
BEGIN
  -- 1) Atribui as 4 máquinas existentes ao reabastecedor Giovanni
  UPDATE public.machines
     SET restocker_id = v_restocker
   WHERE tenant_id = v_tenant AND restocker_id IS NULL;

  -- 2) machine_products: preços por máquina (mesmo produto, preços diferentes)
  INSERT INTO public.machine_products (tenant_id, machine_id, product_id, sale_price, cost_price, slot_code, is_active) VALUES
    (v_tenant, v_m_base_terr, v_p_coca,    7.00, 3.20, 'A1', true),
    (v_tenant, v_m_base_terr, v_p_agua,    4.50, 1.50, 'A2', true),
    (v_tenant, v_m_base_terr, v_p_kitkat,  6.50, 2.80, 'B1', true),
    (v_tenant, v_m_base_terr, v_p_bolacha, 5.00, 2.00, 'B2', true),
    (v_tenant, v_m_base_2and, v_p_coca,    6.00, 3.20, 'A1', true),
    (v_tenant, v_m_base_2and, v_p_agua,    4.00, 1.50, 'A2', true),
    (v_tenant, v_m_base_2and, v_p_kitkat,  5.50, 2.80, 'B1', true),
    (v_tenant, v_m_base_1and, v_p_coca,    6.00, 3.20, 'A1', true),
    (v_tenant, v_m_base_1and, v_p_agua,    4.00, 1.50, 'A2', true),
    (v_tenant, v_m_base_1and, v_p_kitkat,  5.50, 2.80, 'B1', true),
    (v_tenant, v_m_base_1and, v_p_bolacha, 4.50, 2.00, 'B2', true),
    (v_tenant, v_m_mirassol,  v_p_coca,    5.00, 3.20, 'A1', true),
    (v_tenant, v_m_mirassol,  v_p_agua,    3.50, 1.50, 'A2', true),
    (v_tenant, v_m_mirassol,  v_p_kitkat,  5.00, 2.80, 'B1', true),
    (v_tenant, v_m_mirassol,  v_p_bolacha, 4.00, 2.00, 'B2', true),
    (v_tenant, v_m_mirassol,  v_p_cafe,    3.00, 1.00, 'C1', true)
  ON CONFLICT (machine_id, product_id) DO NOTHING;

  -- 3) Vendas distribuídas nos últimos 60 dias (gera ~400-800 vendas)
  INSERT INTO public.sales (tenant_id, machine_id, product_id, sale_date, sale_time, sale_datetime, product_name, quantity, unit_price, total_price, payment_method, raw_data)
  SELECT
    v_tenant,
    machine_id,
    product_id,
    (CURRENT_DATE - (days_ago || ' days')::interval)::date,
    (LPAD(((random() * 12 + 7)::int)::text, 2, '0') || ':' || LPAD(((random() * 59)::int)::text, 2, '0') || ':00')::time,
    ((CURRENT_DATE - (days_ago || ' days')::interval)::timestamptz + (random() * interval '12 hours' + interval '7 hours')),
    product_name,
    1,
    sale_price,
    sale_price,
    CASE WHEN random() < 0.4 THEN 'credit'
         WHEN random() < 0.7 THEN 'debit'
         WHEN random() < 0.9 THEN 'pix'
         ELSE 'cash' END,
    jsonb_build_object('seed', 'round3_demo')
  FROM (
    SELECT
      mp.machine_id,
      mp.product_id,
      p.name AS product_name,
      mp.sale_price,
      gs.days_ago
    FROM public.machine_products mp
    JOIN public.products p ON p.id = mp.product_id
    CROSS JOIN generate_series(1, 60) AS gs(days_ago)
    WHERE mp.tenant_id = v_tenant
      AND random() < 0.35
  ) base
  CROSS JOIN LATERAL generate_series(1, (random() * 6 + 1)::int) AS rep;

  -- 4) Alertas variados
  INSERT INTO public.alerts (tenant_id, machine_id, alert_type, severity, title, message, status, created_at) VALUES
    (v_tenant, v_m_base_terr, 'rupture_imminent', 'high',
     'Estoque baixo: Coca-Cola',
     'A máquina HB-TER-01 deve ficar sem Coca-Cola em ~2 dias (ritmo atual: 12 vendas/dia).',
     'active', NOW() - interval '4 hours'),
    (v_tenant, v_m_mirassol, 'sales_drop', 'medium',
     'Queda de vendas em Hospital Mirassol',
     'Receita caiu 23% nos últimos 7 dias vs período anterior. Verifique o reabastecimento.',
     'active', NOW() - interval '1 day'),
    (v_tenant, v_m_base_2and, 'machine_stopped', 'critical',
     'Máquina sem vendas há 36h',
     'HB-2AND-01 não registra vendas desde há 36h. Verifique conexão ou se está desligada.',
     'active', NOW() - interval '6 hours'),
    (v_tenant, v_m_base_1and, 'product_stale', 'low',
     'Produto encalhado: Bolacha',
     'A Bolacha não teve vendas nos últimos 14 dias na máquina 1009. Considere trocar.',
     'active', NOW() - interval '2 days'),
    (v_tenant, v_m_base_terr, 'rupture_imminent', 'high',
     'Estoque baixo: KitKat',
     'KitKat deve esgotar em 1 dia. Reabastecer urgente.',
     'acknowledged', NOW() - interval '8 hours'),
    (v_tenant, v_m_mirassol, 'sales_drop', 'low',
     'Pequena queda de Água',
     'Vendas de Água caíram 8% — ainda dentro da variação normal.',
     'resolved', NOW() - interval '5 days'),
    (v_tenant, NULL, 'contract_expiring', 'medium',
     'Contrato Hospital de Base vence em 30 dias',
     'O contrato com o Hospital de Base expira em 30 dias. Inicie a renovação.',
     'active', NOW() - interval '12 hours');

  -- 5) Visitas: 2 finalizadas + 1 em andamento
  v_visit_done1 := extensions.uuid_generate_v4();
  INSERT INTO public.restocking_visits (
    id, tenant_id, machine_id, restocker_id,
    checkin_at, checkin_latitude, checkin_longitude, checkin_distance_meters, checkin_photo_url, is_location_valid,
    checkout_at, checkout_photo_url, duration_minutes, is_duration_valid, notes
  ) VALUES (
    v_visit_done1, v_tenant, v_m_mirassol, v_restocker,
    NOW() - interval '1 day' - interval '3 hours',
    -20.8164, -49.5215, 45,
    'https://placehold.co/600x800/1e40af/white?text=Foto+ANTES',
    true,
    NOW() - interval '1 day' - interval '2 hours' - interval '40 minutes',
    'https://placehold.co/600x800/059669/white?text=Foto+DEPOIS',
    20, true,
    'Reposição completa. Tudo OK.'
  );

  v_visit_done2 := extensions.uuid_generate_v4();
  INSERT INTO public.restocking_visits (
    id, tenant_id, machine_id, restocker_id,
    checkin_at, checkin_latitude, checkin_longitude, checkin_distance_meters, checkin_photo_url, is_location_valid,
    checkout_at, checkout_photo_url, duration_minutes, is_duration_valid, notes
  ) VALUES (
    v_visit_done2, v_tenant, v_m_base_1and, v_restocker,
    NOW() - interval '3 days' - interval '5 hours',
    -15.7942, -47.8825, 30,
    'https://placehold.co/600x800/1e40af/white?text=Foto+ANTES',
    true,
    NOW() - interval '3 days' - interval '4 hours' - interval '25 minutes',
    'https://placehold.co/600x800/059669/white?text=Foto+DEPOIS',
    35, true,
    'Maquina apresentou ruido estranho durante reposicao, agendar tecnico.'
  );

  v_visit_progress := extensions.uuid_generate_v4();
  INSERT INTO public.restocking_visits (
    id, tenant_id, machine_id, restocker_id,
    checkin_at, checkin_latitude, checkin_longitude, checkin_distance_meters, checkin_photo_url, is_location_valid
  ) VALUES (
    v_visit_progress, v_tenant, v_m_base_terr, v_restocker,
    NOW() - interval '15 minutes',
    -15.7942, -47.8825, 60,
    'https://placehold.co/600x800/1e40af/white?text=Foto+ANTES',
    true
  );

  INSERT INTO public.restocking_items (tenant_id, visit_id, product_id, product_name, quantity, suggested_quantity) VALUES
    (v_tenant, v_visit_done1, v_p_coca, 'Coca-Cola 350ml', 12, 15),
    (v_tenant, v_visit_done1, v_p_agua, 'Água Mineral 500ml', 8, 10),
    (v_tenant, v_visit_done1, v_p_kitkat, 'Chocolate KitKat 41g', 6, 8),
    (v_tenant, v_visit_done2, v_p_coca, 'Coca-Cola 350ml', 10, 12),
    (v_tenant, v_visit_done2, v_p_kitkat, 'Chocolate KitKat 41g', 5, 6),
    (v_tenant, v_visit_progress, v_p_coca, 'Coca-Cola 350ml', 8, 10);
END $$;