import { supabaseAdmin, createAlertIfNew } from '../create';
import type { AlertSettings, AlertSeverity, DetectorResult } from '../types';

export async function detectContractExpiring(
  tenantId: string,
  settings: AlertSettings,
  today: Date
): Promise<DetectorResult> {
  const result: DetectorResult = { created: 0, skipped_existing: 0, errors: [] };
  const horizon = new Date(today.getTime() + settings.contract_expiring_days * 86400000);
  const todayStr = today.toISOString().split('T')[0];
  const horizonStr = horizon.toISOString().split('T')[0];

  const { data: locations, error } = await supabaseAdmin
    .from('locations')
    .select('id, name, contract_end_date')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('contract_end_date', 'is', null)
    .gte('contract_end_date', todayStr)
    .lte('contract_end_date', horizonStr);

  if (error) {
    result.errors.push(`contract query: ${error.message}`);
    return result;
  }

  for (const loc of locations ?? []) {
    if (!loc.contract_end_date) continue;
    const endDate = new Date(loc.contract_end_date);
    const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);

    const severity: AlertSeverity = daysUntil <= 7 ? 'critical' : daysUntil <= 15 ? 'high' : 'medium';

    const r = await createAlertIfNew(
      {
        tenant_id: tenantId,
        alert_type: 'contract_expiring',
        severity,
        title: `Contrato de ${loc.name} vence em ${daysUntil}d`,
        message: `O contrato do ponto ${loc.name} vence em ${endDate.toLocaleDateString('pt-BR')}. Negocie a renovação antes para não perder o local.`,
        data: { location_id: loc.id, end_date: loc.contract_end_date, days_until: daysUntil },
        dedup_key: `contract:${loc.id}:${todayStr}`,
      },
      settings
    );

    if (r.ok && r.created) result.created++;
    else if (r.ok) result.skipped_existing++;
    else if (r.error) result.errors.push(`contract ${loc.id}: ${r.error}`);
  }

  return result;
}
