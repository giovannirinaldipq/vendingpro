import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function predictInventoryRunout(tenantId: string): Promise<InventoryPrediction[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: inv } = await supabaseAdmin
    .from('inventory')
    .select('product_id, current_quantity, minimum_quantity, products(name)')
    .eq('tenant_id', tenantId);

  if (!inv?.length) return [];

  const out: InventoryPrediction[] = [];

  for (const row of inv) {
    const productName = Array.isArray(row.products) ? row.products[0]?.name : (row.products as { name?: string } | null)?.name ?? 'produto';

    const { data: sales } = await supabaseAdmin
      .from('sales')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.product_id)
      .gte('sale_datetime', since);

    const totalQty = (sales ?? []).reduce((s, x) => s + Number(x.quantity ?? 0), 0);
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
