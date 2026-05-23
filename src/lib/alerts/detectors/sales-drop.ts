import { supabaseAdmin, createAlertIfNew } from '../create';
import type { AlertSettings, AlertSeverity, DetectorResult } from '../types';

export async function detectSalesDrop(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const days = settings.sales_drop_period_days;
  const threshold = settings.sales_drop_threshold_percent;

  const recentEnd = today;
  const recentStart = new Date(today.getTime() - days * 86400000);
  const prevStart = new Date(today.getTime() - days * 2 * 86400000);
  const todayStr = today.toISOString().split('T')[0];

  const { data: machines, error } = await supabaseAdmin
    .from('machines')
    .select('id, name, location:locations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    result.errors.push(`sales_drop machines: ${error.message}`);
    return result;
  }

  for (const m of machines ?? []) {
    const recent = await sumSales(m.id, recentStart, recentEnd);
    if (recent === null) continue;
    const previous = await sumSales(m.id, prevStart, recentStart);
    if (previous === null) continue;

    if (previous < 100) continue; // dados insuficientes (< R$100 no período anterior)

    const dropPct = ((previous - recent) / previous) * 100;
    if (dropPct < threshold) continue;

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const machineLabel = `${m.name}${locName ? ` (${locName})` : ''}`;
    const severity: AlertSeverity = dropPct >= 60 ? 'critical' : dropPct >= 40 ? 'high' : 'medium';

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        machine_id: m.id,
        alert_type: 'sales_drop',
        severity,
        title: `Queda de ${dropPct.toFixed(0)}% nas vendas — ${m.name}`,
        message: `A máquina ${machineLabel} faturou R$ ${recent.toFixed(2)} nos últimos ${days} dias contra R$ ${previous.toFixed(2)} no período anterior (queda de ${dropPct.toFixed(1)}%).`,
        data: { recent_total: recent, previous_total: previous, drop_percent: dropPct, period_days: days },
        dedup_key: `sales_drop:${m.id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`sales_drop ${m.id}: ${r.error}`);
  }

  return result;
}

async function sumSales(machineId: string, from: Date, to: Date): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('total_price')
    .eq('machine_id', machineId)
    .gte('sale_datetime', from.toISOString())
    .lt('sale_datetime', to.toISOString());

  if (error) return null;
  return (data ?? []).reduce((sum, row) => sum + Number(row.total_price ?? 0), 0);
}
