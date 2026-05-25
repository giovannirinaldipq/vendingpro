import { supabaseAdmin, createAlertIfNew } from '../create';
import type { AlertSettings, DetectorResult } from '../types';

export async function detectMachineStopped(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const cutoff = new Date(today.getTime() - settings.machine_stopped_hours * 3600 * 1000);
  const todayStr = today.toISOString().split('T')[0];

  const { data: machines, error } = await supabaseAdmin
    .from('machines')
    .select('id, name, code, location:locations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    result.errors.push(`machine_stopped query: ${error.message}`);
    return result;
  }

  for (const m of machines ?? []) {
    const { count, error: countErr } = await supabaseAdmin
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', m.id)
      .gte('sale_datetime', cutoff.toISOString());

    if (countErr) {
      result.errors.push(`machine_stopped count ${m.id}: ${countErr.message}`);
      continue;
    }
    if ((count ?? 0) > 0) continue;

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const machineLabel = `${m.name}${locName ? ` (${locName})` : ''}`;
    const severity = settings.machine_stopped_hours >= 48 ? 'critical' : 'high';

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        machine_id: m.id,
        alert_type: 'machine_stopped',
        severity,
        title: `Máquina ${m.name} sem vendas há ${settings.machine_stopped_hours}h`,
        message: `A máquina ${machineLabel} não registra vendas desde ${cutoff.toLocaleString('pt-BR')}. Vale verificar se está fora do ar, sem produtos ou com problema de telemetria.`,
        data: { hours_without_sales: settings.machine_stopped_hours, cutoff: cutoff.toISOString(), machine_code: m.code },
        dedup_key: `machine_stopped:${m.id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`machine_stopped insert ${m.id}: ${r.error}`);
  }

  return result;
}
