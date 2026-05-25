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
}

/**
 * Refatorado para 2 queries totais (não N+1):
 *   1. inventory rows do tenant (com nome do produto via join)
 *   2. todas vendas dos últimos LOOKBACK_DAYS pra esses produtos
 *
 * Antes: tenant com 50 produtos = 51 queries. Agora: 2.
 */
export async function predictInventoryRunout(tenantId: string): Promise<InventoryPrediction[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: inv } = await supabaseAdmin
    .from('inventory')
    .select('product_id, current_quantity, minimum_quantity, products(name)')
    .eq('tenant_id', tenantId);

  if (!inv?.length) return [];

  const productIds = inv.map(r => r.product_id);

  // Query 2: TODAS as vendas desses produtos no período
  const { data: salesRaw } = await supabaseAdmin
    .from('sales')
    .select('product_id, quantity')
    .eq('tenant_id', tenantId)
    .in('product_id', productIds)
    .gte('sale_datetime', since);

  // Agregação por product_id em memória
  const salesByProduct = new Map<string, number>();
  for (const s of salesRaw ?? []) {
    if (!s.product_id) continue;
    salesByProduct.set(s.product_id, (salesByProduct.get(s.product_id) ?? 0) + Number(s.quantity ?? 0));
  }

  const out: InventoryPrediction[] = [];

  for (const row of inv) {
    const productName = Array.isArray(row.products)
      ? row.products[0]?.name
      : (row.products as { name?: string } | null)?.name ?? 'produto';

    const totalQty = salesByProduct.get(row.product_id) ?? 0;
    const avgDaily = totalQty / LOOKBACK_DAYS;
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
    });
  }

  const statusOrder = { depleted: 0, critical: 1, low: 2, ok: 3 };
  out.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return out;
}
