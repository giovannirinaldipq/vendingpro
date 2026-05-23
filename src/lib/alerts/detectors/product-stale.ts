import { supabaseAdmin, createAlertIfNew } from '../create';
import type { AlertSettings, DetectorResult } from '../types';

export async function detectProductStale(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const cutoff = new Date(today.getTime() - settings.product_stale_days * 86400000);
  const todayStr = today.toISOString().split('T')[0];

  // Pega produtos do tenant ativos. Para cada um, vê última venda.
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (error) {
    result.errors.push(`stale products: ${error.message}`);
    return result;
  }

  for (const p of products ?? []) {
    const { data: lastSale, error: saleErr } = await supabaseAdmin
      .from('sales')
      .select('sale_datetime')
      .eq('tenant_id', tenantId)
      .eq('product_id', p.id)
      .order('sale_datetime', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (saleErr) {
      result.errors.push(`stale lastSale ${p.id}: ${saleErr.message}`);
      continue;
    }
    if (!lastSale) continue; // produto nunca vendido → não é "encalhado", é novo

    const lastDate = new Date(lastSale.sale_datetime);
    if (lastDate >= cutoff) continue;

    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        alert_type: 'product_stale',
        severity: 'low',
        title: `Produto encalhado: ${p.name} (${daysSince}d sem vender)`,
        message: `${p.name} não tem venda há ${daysSince} dias (última em ${lastDate.toLocaleDateString('pt-BR')}). Considere remover do mix ou substituir.`,
        data: { product_id: p.id, last_sale: lastSale.sale_datetime, days_since: daysSince },
        dedup_key: `stale:${p.id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`stale ${p.id}: ${r.error}`);
  }

  return result;
}
