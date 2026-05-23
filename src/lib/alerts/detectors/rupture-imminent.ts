import { supabaseAdmin, createAlertIfNew } from '../create';
import type { AlertSettings, AlertSeverity, DetectorResult } from '../types';

const LOOKBACK_DAYS = 14;

export async function detectRuptureImminent(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const lookback = new Date(today.getTime() - LOOKBACK_DAYS * 86400000);
  const todayStr = today.toISOString().split('T')[0];

  const { data: inv, error } = await supabaseAdmin
    .from('inventory')
    .select('product_id, current_quantity, products(name)')
    .eq('tenant_id', tenantId)
    .gt('current_quantity', 0);

  if (error) {
    result.errors.push(`rupture inventory: ${error.message}`);
    return result;
  }

  for (const row of inv ?? []) {
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from('sales')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.product_id)
      .gte('sale_datetime', lookback.toISOString());

    if (salesErr) {
      result.errors.push(`rupture sales ${row.product_id}: ${salesErr.message}`);
      continue;
    }

    const totalQty = (sales ?? []).reduce((sum, s) => sum + Number(s.quantity ?? 0), 0);
    if (totalQty <= 0) continue;

    const dailyConsumption = totalQty / LOOKBACK_DAYS;
    if (dailyConsumption < 0.5) continue; // produto de giro muito baixo, não vale alertar

    const daysOfStock = Number(row.current_quantity) / dailyConsumption;
    if (daysOfStock > settings.rupture_estimate_days) continue;

    const productName = Array.isArray(row.products) ? row.products[0]?.name : (row.products as { name?: string } | null)?.name ?? 'produto';
    const severity: AlertSeverity = daysOfStock <= 1 ? 'critical' : daysOfStock <= 2 ? 'high' : 'medium';

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        alert_type: 'rupture_imminent',
        severity,
        title: `Estoque de ${productName} acaba em ~${Math.round(daysOfStock)}d`,
        message: `Restam ${row.current_quantity} unidade(s) de ${productName} no estoque central, com consumo médio de ${dailyConsumption.toFixed(1)}/dia nos últimos ${LOOKBACK_DAYS} dias. Compre antes que falte.`,
        data: { product_id: row.product_id, current_quantity: row.current_quantity, daily_consumption: dailyConsumption, days_of_stock: daysOfStock },
        dedup_key: `rupture:${row.product_id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`rupture ${row.product_id}: ${r.error}`);
  }

  return result;
}
