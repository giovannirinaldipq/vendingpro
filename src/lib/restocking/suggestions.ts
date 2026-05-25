import { supabaseAdmin } from '@/lib/supabase/admin';

const LOOKBACK_DAYS = 7;

export interface RestockSuggestion {
  product_id: string;
  product_name: string;
  total_sold_last_7d: number;
  avg_per_day: number;
  suggested_quantity: number;
}

/**
 * Para uma máquina, sugere quantidades a repor baseado nas vendas dos últimos 7 dias.
 * Sugestão = round(avg_per_day * 7) — repor para próxima semana.
 */
export async function suggestRestockForMachine(
  tenantId: string,
  machineId: string
): Promise<RestockSuggestion[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: sales, error } = await supabaseAdmin
    .from('sales')
    .select('product_id, product_name, quantity')
    .eq('tenant_id', tenantId)
    .eq('machine_id', machineId)
    .gte('sale_datetime', since)
    .not('product_id', 'is', null);

  if (error || !sales) return [];

  const byProduct = new Map<string, { name: string; qty: number }>();
  for (const s of sales) {
    const key = s.product_id as string;
    const prev = byProduct.get(key) ?? { name: s.product_name as string, qty: 0 };
    prev.qty += Number(s.quantity ?? 1);
    byProduct.set(key, prev);
  }

  const suggestions: RestockSuggestion[] = [];
  for (const [product_id, { name, qty }] of byProduct.entries()) {
    const avg = qty / LOOKBACK_DAYS;
    suggestions.push({
      product_id,
      product_name: name,
      total_sold_last_7d: qty,
      avg_per_day: Math.round(avg * 10) / 10,
      suggested_quantity: Math.max(1, Math.ceil(avg * 7)),
    });
  }

  return suggestions.sort((a, b) => b.suggested_quantity - a.suggested_quantity);
}
