import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PicklistItem {
  product_id: string;
  product_name: string;
  slot_code: string | null;
  current_quantity: number;
  max_capacity: number;
  to_fill: number;
}

export interface PicklistMachine {
  machine_id: string;
  machine_name: string;
  machine_code: string;
  location_name: string | null;
  total_to_fill: number;
  items: PicklistItem[];
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: machines } = await supabaseAdmin
    .from('machines')
    .select('id, name, code, location:locations(name)')
    .eq('tenant_id', ctx.tenantId)
    .neq('status', 'deactivated')
    .order('name');

  if (!machines?.length) return NextResponse.json({ data: [] });

  const machineIds = machines.map(m => m.id);

  const { data: mp } = await supabaseAdmin
    .from('machine_products')
    .select('machine_id, product_id, slot_code, max_capacity, product:products(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .in('machine_id', machineIds);

  if (!mp?.length) return NextResponse.json({ data: [] });

  const productIds = [...new Set(mp.map(r => r.product_id))];

  // Sum movements per machine+product to get current stock
  const { data: movements } = await supabaseAdmin
    .from('inventory_movements')
    .select('product_id, machine_id, quantity')
    .eq('tenant_id', ctx.tenantId)
    .in('machine_id', machineIds)
    .in('product_id', productIds);

  const stockMap = new Map<string, number>();
  for (const m of movements ?? []) {
    const key = `${m.machine_id}::${m.product_id}`;
    stockMap.set(key, (stockMap.get(key) ?? 0) + Number(m.quantity));
  }

  const machineMap = new Map(machines.map(m => {
    const loc = Array.isArray(m.location) ? m.location[0] : m.location;
    return [m.id, { name: m.name, code: m.code, location_name: (loc as { name?: string } | null)?.name ?? null }];
  }));

  const byMachine = new Map<string, typeof mp>();
  for (const row of mp) {
    const arr = byMachine.get(row.machine_id) ?? [];
    arr.push(row);
    byMachine.set(row.machine_id, arr);
  }

  const result: PicklistMachine[] = [];

  for (const [machineId, products] of byMachine) {
    const machine = machineMap.get(machineId);
    if (!machine) continue;

    const items: PicklistItem[] = [];
    for (const row of products) {
      if (!row.max_capacity) continue;
      const key = `${machineId}::${row.product_id}`;
      const current = Math.max(0, stockMap.get(key) ?? 0);
      const toFill = row.max_capacity - current;
      if (toFill <= 0) continue;

      const prod = Array.isArray(row.product) ? row.product[0] : row.product;
      items.push({
        product_id: row.product_id,
        product_name: (prod as { name?: string } | null)?.name ?? 'Produto',
        slot_code: row.slot_code ?? null,
        current_quantity: current,
        max_capacity: row.max_capacity,
        to_fill: toFill,
      });
    }

    if (items.length > 0) {
      items.sort((a, b) => (a.slot_code ?? '').localeCompare(b.slot_code ?? ''));
      result.push({
        machine_id: machineId,
        machine_name: machine.name,
        machine_code: machine.code,
        location_name: machine.location_name,
        total_to_fill: items.reduce((s, i) => s + i.to_fill, 0),
        items,
      });
    }
  }

  result.sort((a, b) => b.total_to_fill - a.total_to_fill);
  return NextResponse.json({ data: result });
}