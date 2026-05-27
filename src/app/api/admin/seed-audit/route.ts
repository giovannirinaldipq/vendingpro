import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  // Create auth user
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'audit@vendingtest.com',
    password: 'Audit@2026',
    email_confirm: true,
  });
  let authUserId: string | undefined;
  if (authErr && authErr.message.includes('already been registered')) {
    // Fetch existing auth user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const existing = users?.find(u => u.email === 'audit@vendingtest.com');
    authUserId = existing?.id;
  } else if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  } else {
    authUserId = authUser?.user?.id;
  }

  // Check if tenant already exists
  const { data: existingTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('contact_email', 'audit@vendingtest.com')
    .maybeSingle();

  if (existingTenant) {
    return NextResponse.json({ message: 'Tenant already exists', tenant_id: existingTenant.id });
  }

  // Create tenant
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      company_name: 'Auditoria Vending',
      document_number: '99.999.999/0001-99',
      contact_name: 'Auditor Teste',
      contact_email: 'audit@vendingtest.com',
      contact_phone: '11999999999',
      subscription_status: 'active',
      contracted_machines: 10,
    })
    .select('id')
    .single();
  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  const tenantId = tenant.id;

  // Create user profile (id = auth_user_id so .eq('id', user.id) works in middleware)
  if (authUserId) {
    await supabaseAdmin.from('users').insert({
      id: authUserId,
      tenant_id: tenantId,
      auth_user_id: authUserId,
      email: 'audit@vendingtest.com',
      name: 'Auditor Teste',
      role: 'owner',
      is_active: true,
    });
  }

  // Location
  const { data: loc } = await supabaseAdmin
    .from('locations')
    .insert({ tenant_id: tenantId, name: 'Shopping Centro', address_street: 'Rua das Flores 100', address_city: 'São Paulo', address_state: 'SP' })
    .select('id').single();
  const locId = loc!.id;

  // Machines
  const { data: m1 } = await supabaseAdmin
    .from('machines')
    .insert({ tenant_id: tenantId, location_id: locId, code: 'AUD-001', name: 'Máquina Lobby', machine_type: 'snack_beverage', status: 'active', total_slots: 12 })
    .select('id').single();
  const { data: m2 } = await supabaseAdmin
    .from('machines')
    .insert({ tenant_id: tenantId, location_id: locId, code: 'AUD-002', name: 'Máquina Corredor', machine_type: 'snack_beverage', status: 'active', total_slots: 8 })
    .select('id').single();
  const machine1 = m1!.id, machine2 = m2!.id;

  // Products
  const productsData = [
    { name: 'Coca-Cola 350ml', default_sale_price: 6.00, default_cost_price: 3.20 },
    { name: 'Guaraná Antarctica 350ml', default_sale_price: 5.50, default_cost_price: 2.80 },
    { name: 'Ruffles Original 96g', default_sale_price: 8.00, default_cost_price: 4.50 },
    { name: 'Bis Lacta 100g', default_sale_price: 5.00, default_cost_price: 2.50 },
    { name: 'Água Mineral 500ml', default_sale_price: 4.00, default_cost_price: 1.50 },
    { name: 'Monster Energy 473ml', default_sale_price: 12.00, default_cost_price: 7.00 },
  ];
  const { data: products } = await supabaseAdmin
    .from('products')
    .insert(productsData.map(p => ({ ...p, tenant_id: tenantId, category: 'snack_beverage', is_active: true })))
    .select('id, name');
  if (!products) return NextResponse.json({ error: 'Failed to create products' }, { status: 500 });

  const pMap = new Map(products.map(p => [p.name, p.id]));
  const p1 = pMap.get('Coca-Cola 350ml')!;
  const p2 = pMap.get('Guaraná Antarctica 350ml')!;
  const p3 = pMap.get('Ruffles Original 96g')!;
  const p4 = pMap.get('Bis Lacta 100g')!;
  const p5 = pMap.get('Água Mineral 500ml')!;
  const p6 = pMap.get('Monster Energy 473ml')!;

  // Machine Products
  await supabaseAdmin.from('machine_products').insert([
    { tenant_id: tenantId, machine_id: machine1, product_id: p1, sale_price: 6.00, cost_price: 3.20, slot_code: 'A1', max_capacity: 10, is_active: true },
    { tenant_id: tenantId, machine_id: machine1, product_id: p2, sale_price: 5.50, cost_price: 2.80, slot_code: 'A2', max_capacity: 10, is_active: true },
    { tenant_id: tenantId, machine_id: machine1, product_id: p3, sale_price: 8.00, cost_price: 4.50, slot_code: 'B1', max_capacity: 8, is_active: true },
    { tenant_id: tenantId, machine_id: machine1, product_id: p4, sale_price: 5.00, cost_price: 2.50, slot_code: 'B2', max_capacity: 8, is_active: true },
    { tenant_id: tenantId, machine_id: machine1, product_id: p5, sale_price: 4.00, cost_price: 1.50, slot_code: 'C1', max_capacity: 12, is_active: true },
    { tenant_id: tenantId, machine_id: machine1, product_id: p6, sale_price: 12.00, cost_price: 7.00, slot_code: 'C2', max_capacity: 6, is_active: true },
    { tenant_id: tenantId, machine_id: machine2, product_id: p1, sale_price: 6.50, cost_price: 3.20, slot_code: 'A1', max_capacity: 8, is_active: true },
    { tenant_id: tenantId, machine_id: machine2, product_id: p3, sale_price: 8.50, cost_price: 4.50, slot_code: 'A2', max_capacity: 6, is_active: true },
    { tenant_id: tenantId, machine_id: machine2, product_id: p5, sale_price: 4.50, cost_price: 1.50, slot_code: 'B1', max_capacity: 10, is_active: true },
    { tenant_id: tenantId, machine_id: machine2, product_id: p6, sale_price: 12.00, cost_price: 7.00, slot_code: 'B2', max_capacity: 4, is_active: true },
  ]);

  // Inventory
  await supabaseAdmin.from('inventory').insert([
    { tenant_id: tenantId, product_id: p1, current_quantity: 15, minimum_quantity: 5 },
    { tenant_id: tenantId, product_id: p2, current_quantity: 8, minimum_quantity: 4 },
    { tenant_id: tenantId, product_id: p3, current_quantity: 3, minimum_quantity: 4 },
    { tenant_id: tenantId, product_id: p4, current_quantity: 6, minimum_quantity: 3 },
    { tenant_id: tenantId, product_id: p5, current_quantity: 20, minimum_quantity: 8 },
    { tenant_id: tenantId, product_id: p6, current_quantity: 2, minimum_quantity: 3 },
  ]);

  // Inventory Movements
  const now = new Date();
  const day = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  const movements = [
    // Initial
    { tenant_id: tenantId, product_id: p1, machine_id: machine1, movement_type: 'initial', quantity: 10, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p2, machine_id: machine1, movement_type: 'initial', quantity: 10, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p3, machine_id: machine1, movement_type: 'initial', quantity: 8, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p4, machine_id: machine1, movement_type: 'initial', quantity: 8, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p5, machine_id: machine1, movement_type: 'initial', quantity: 12, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p6, machine_id: machine1, movement_type: 'initial', quantity: 6, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p1, machine_id: machine2, movement_type: 'initial', quantity: 8, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p3, machine_id: machine2, movement_type: 'initial', quantity: 6, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p5, machine_id: machine2, movement_type: 'initial', quantity: 10, occurred_at: day(20), source_kind: 'seed' },
    { tenant_id: tenantId, product_id: p6, machine_id: machine2, movement_type: 'initial', quantity: 4, occurred_at: day(20), source_kind: 'seed' },
    // Sales machine1 - Coca ~3/dia
    ...([13,12,11,10,9,8,7,6,5,4,3,2,1].map((d,i) => ({ tenant_id: tenantId, product_id: p1, machine_id: machine1, movement_type: 'sale', quantity: -([3,2,4,3,2,3,4,3,2,3,3,2,3][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine1 - Guaraná ~2/dia
    ...([13,11,9,7,5,3,1].map((d,i) => ({ tenant_id: tenantId, product_id: p2, machine_id: machine1, movement_type: 'sale', quantity: -([2,1,3,2,2,3,2][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine1 - Ruffles ~1.5/dia
    ...([12,10,8,6,4,2,1].map((d,i) => ({ tenant_id: tenantId, product_id: p3, machine_id: machine1, movement_type: 'sale', quantity: -([2,1,2,1,2,2,1][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine1 - Bis ~1/dia
    ...([13,10,7,4,2].map((d,i) => ({ tenant_id: tenantId, product_id: p4, machine_id: machine1, movement_type: 'sale', quantity: -([1,2,1,1,2][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine1 - Água ~4/dia
    ...([13,11,9,7,5,3,1].map((d,i) => ({ tenant_id: tenantId, product_id: p5, machine_id: machine1, movement_type: 'sale', quantity: -([4,5,3,4,5,4,3][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine1 - Monster ~0.3/dia
    ...([12,8,4,1].map((d) => ({ tenant_id: tenantId, product_id: p6, machine_id: machine1, movement_type: 'sale', quantity: -1, occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine2 - Coca ~2/dia
    ...([12,9,6,3,1].map((d,i) => ({ tenant_id: tenantId, product_id: p1, machine_id: machine2, movement_type: 'sale', quantity: -([2,3,2,2,1][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Sales machine2 - Água ~3/dia
    ...([12,9,6,3,1].map((d,i) => ({ tenant_id: tenantId, product_id: p5, machine_id: machine2, movement_type: 'sale', quantity: -([3,4,3,2,3][i]), occurred_at: day(d), source_kind: 'import' }))),
    // Restock mid-period
    { tenant_id: tenantId, product_id: p1, machine_id: machine1, movement_type: 'restock', quantity: 10, occurred_at: day(7), source_kind: 'visit' },
    { tenant_id: tenantId, product_id: p5, machine_id: machine1, movement_type: 'restock', quantity: 12, occurred_at: day(7), source_kind: 'visit' },
  ];

  await supabaseAdmin.from('inventory_movements').insert(movements);

  return NextResponse.json({
    message: 'Audit tenant seeded successfully',
    tenant_id: tenantId,
    login: { email: 'audit@vendingtest.com', password: 'Audit@2026' },
  });
}
