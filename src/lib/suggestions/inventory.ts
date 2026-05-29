import { supabaseAdmin } from '@/lib/supabase/admin';
const LOOKBACK_DAYS = 14;

export interface InventoryPrediction {
  product_id: string;
  product_name: string;
  current_quantity: number;
  minimum_quantity: number;
  avg_daily_consumption: number;
  days_of_stock: number | null;     // null = sem consumo registrado
  estimated_runout_date: string | null;
  status: 'ok' | 'low' | 'critical' | 'depleted';
  /** Última movimentação que alterou esse estoque (qualquer kind). null se nenhum movement ainda. */
  last_movement_at: string | null;
}

/**
 * Usa inventory_movements (tipo 'sale') para calcular consumo médio.
 * Divide pelo número de dias DISTINTOS com vendas (não pelo período inteiro)
 * para evitar subestimar quando há gaps de importação.
 */
export async function predictInventoryRunout(tenantId: string): Promise<InventoryPrediction[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: inv } = await supabaseAdmin
    .from('inventory')
    .select('product_id, current_quantity, minimum_quantity, last_updated_at, products(name)')
    .eq('tenant_id', tenantId);

  if (!inv?.length) return [];

  const productIds = inv.map(r => r.product_id);

  // Query 2: movements de venda no período (quantity é negativo para sales)
  const { data: movementsRaw } = await supabaseAdmin
    .from('inventory_movements')
    .select('product_id, quantity, occurred_at')
    .eq('tenant_id', tenantId)
    .eq('movement_type', 'sale')
    .in('product_id', productIds)
    .gte('occurred_at', since);

  // Query 3: última movimentação por produto (qualquer kind)
  const { data: lastMovements } = await supabaseAdmin
    .from('inventory_movements')
    .select('product_id, occurred_at')
    .eq('tenant_id', tenantId)
    .in('product_id', productIds)
    .order('occurred_at', { ascending: false });

  const lastMovementByProduct = new Map<string, string>();
  for (const m of (lastMovements ?? []) as Array<{ product_id: string; occurred_at: string }>) {
    if (!lastMovementByProduct.has(m.product_id)) {
      lastMovementByProduct.set(m.product_id, m.occurred_at);
    }
  }

  // Agregação: soma absoluta de vendas + dias distintos por product_id
  const salesByProduct = new Map<string, number>();
  const daysByProduct = new Map<string, Set<string>>();
  for (const s of movementsRaw ?? []) {
    if (!s.product_id) continue;
    salesByProduct.set(s.product_id, (salesByProduct.get(s.product_id) ?? 0) + Math.abs(Number(s.quantity ?? 0)));
    const day = (s.occurred_at as string).slice(0, 10);
    if (!daysByProduct.has(s.product_id)) daysByProduct.set(s.product_id, new Set());
    daysByProduct.get(s.product_id)!.add(day);
  }

  const out: InventoryPrediction[] = [];

  for (const row of inv) {
    const productName = Array.isArray(row.products)
      ? row.products[0]?.name
      : (row.products as { name?: string } | null)?.name ?? 'produto';

    const totalQty = salesByProduct.get(row.product_id) ?? 0;
    const distinctDays = daysByProduct.get(row.product_id)?.size ?? 0;
    const avgDaily = distinctDays > 0 ? totalQty / distinctDays : 0;
    const current = Number(row.current_quantity);
    const minimum = Number(row.minimum_quantity ?? 0);

    let daysOfStock: number | null = null;
    let runoutDate: string | null = null;
    let status: InventoryPrediction['status'] = 'ok';

    if (current === 0) {
      status = 'depleted';
      daysOfStock = 0;
    } else if (avgDaily > 0) {
      daysOfStock = current / avgDaily;
      const runout = new Date(Date.now() + daysOfStock * 86400000);
      runoutDate = runout.toISOString().split('T')[0];
      if (daysOfStock <= 3) status = 'critical';
      else if (daysOfStock <= 7 || current <= minimum) status = 'low';
    } else if (current <= minimum) {
      status = 'low';
    }

    out.push({
      product_id: row.product_id,
      product_name: productName,
      current_quantity: current,
      minimum_quantity: minimum,
      avg_daily_consumption: Math.round(avgDaily * 10) / 10,
      days_of_stock: daysOfStock != null ? Math.round(daysOfStock * 10) / 10 : null,
      estimated_runout_date: runoutDate,
      status,
      last_movement_at: lastMovementByProduct.get(row.product_id) ?? null,
    });
  }

  const statusOrder = { depleted: 0, critical: 1, low: 2, ok: 3 };
  out.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return out;
}
