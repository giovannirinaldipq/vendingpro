import { predictInventoryRunout } from './inventory';

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  current_quantity: number;
  avg_daily_consumption: number;
  suggested_purchase_quantity: number;
  reason: string;
  total_estimated_cost: number | null;
}

const TARGET_DAYS_OF_STOCK = 30; // estoque para 30 dias

/**
 * Lista produtos a comprar: para cada item com avg_daily > 0, calcula
 * quantidade que falta pra atingir 30 dias de estoque.
 */
export async function suggestPurchaseList(tenantId: string): Promise<PurchaseItem[]> {
  const predictions = await predictInventoryRunout(tenantId);

  const items: PurchaseItem[] = [];
  for (const p of predictions) {
    if (p.avg_daily_consumption <= 0) continue;
    const targetQty = Math.ceil(p.avg_daily_consumption * TARGET_DAYS_OF_STOCK);
    const need = Math.max(0, targetQty - p.current_quantity);
    if (need === 0) continue;

    items.push({
      product_id: p.product_id,
      product_name: p.product_name,
      current_quantity: p.current_quantity,
      avg_daily_consumption: p.avg_daily_consumption,
      suggested_purchase_quantity: need,
      reason: `Tem ${p.current_quantity}, consome ${p.avg_daily_consumption}/dia. Para 30 dias: comprar ${need}.`,
      total_estimated_cost: null, // pode ser preenchido depois com default_cost_price
    });
  }

  return items;
}
