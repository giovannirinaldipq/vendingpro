import { supabaseAdmin } from '@/lib/supabase/admin';
import { createAlertIfNew } from '../create';
import { calculateMachineResult, getFinanceSettings } from '@/lib/finance';
import type { AlertSettings, AlertSeverity, DetectorResult } from '../types';

export async function detectMachineLoss(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const todayStr = today.toISOString().split('T')[0];

  // Lê config financeira do tenant
  const { data: fsRow } = await supabaseAdmin
    .from('finance_settings')
    .select('loss_alert_enabled, loss_alert_period_days')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (fsRow && fsRow.loss_alert_enabled === false) return result;
  const periodDays = fsRow?.loss_alert_period_days ?? 30;

  const financeSettings = await getFinanceSettings(tenantId);

  const { data: machines, error } = await supabaseAdmin
    .from('machines')
    .select('id, name, location:locations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    result.errors.push(`machine_loss query: ${error.message}`);
    return result;
  }

  for (const m of machines ?? []) {
    const res = await calculateMachineResult(tenantId, m.id, periodDays, financeSettings);
    if (!res.is_loss) continue;
    if (res.sales_count < 5) continue; // dados insuficientes

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const machineLabel = `${m.name}${locName ? ` (${locName})` : ''}`;
    const lossMagnitude = Math.abs(res.net_result);
    const severity: AlertSeverity = lossMagnitude >= 500 ? 'critical' : lossMagnitude >= 200 ? 'high' : 'medium';

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        machine_id: m.id,
        alert_type: 'machine_loss',
        severity,
        title: `Máquina ${m.name} com prejuízo de R$ ${lossMagnitude.toFixed(2)} em ${periodDays}d`,
        message: `${machineLabel} fechou os últimos ${periodDays} dias no negativo: receita R$ ${res.revenue.toFixed(2)} − taxas R$ ${res.fees.toFixed(2)} − CMV R$ ${res.cmv.toFixed(2)} − custos fixos R$ ${res.fixed_costs.toFixed(2)} = R$ ${res.net_result.toFixed(2)}.`,
        data: {
          period_days: periodDays,
          revenue: res.revenue,
          fees: res.fees,
          cmv: res.cmv,
          fixed_costs: res.fixed_costs,
          net_result: res.net_result,
        },
        dedup_key: `machine_loss:${m.id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`machine_loss ${m.id}: ${r.error}`);
  }

  return result;
}
