import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  return data?.tenant_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const [{ data: inventory }, { data: machineProducts }, { data: machines }] = await Promise.all([
    supabaseAdmin
      .from('machine_inventory')
      .select('machine_id, product_id, current_quantity')
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('machine_products')
      .select('machine_id, product_id, max_capacity')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabaseAdmin
      .from('machines')
      .select('id, slot_capacity')
      .eq('tenant_id', tenantId)
      .neq('status', 'deactivated'),
  ]);

  const slotCapMap = new Map(
    (machines ?? []).map(m => [m.id, m.slot_capacity as number | null])
  );

  const stockMap = new Map(
    (inventory ?? []).map(i => [`${i.machine_id}:${i.product_id}`, Number(i.current_quantity)])
  );

  // Aggregate per machine
  const machineStats = new Map<string, { total: number; capacity: number; critical: number; slots: number }>();

  for (const mp of machineProducts ?? []) {
    const key = mp.machine_id;
    if (!machineStats.has(key)) {
      machineStats.set(key, { total: 0, capacity: 0, critical: 0, slots: 0 });
    }
    const stat = machineStats.get(key)!;
    const effectiveCap = mp.max_capacity ?? slotCapMap.get(key) ?? null;
    const qty = stockMap.get(`${mp.machine_id}:${mp.product_id}`) ?? 0;

    stat.total += qty;
    stat.slots += 1;
    if (effectiveCap) {
      stat.capacity += effectiveCap;
      if (qty / effectiveCap < 0.3) stat.critical += 1;
    }
  }

  const summary: Record<string, { fill_rate: number | null; critical_slots: number; total_slots: number }> = {};
  for (const [machineId, stat] of machineStats) {
    summary[machineId] = {
      fill_rate: stat.capacity > 0 ? Math.round((stat.total / stat.capacity) * 100) : null,
      critical_slots: stat.critical,
      total_slots: stat.slots,
    };
  }

  return NextResponse.json({ success: true, data: summary });
}
