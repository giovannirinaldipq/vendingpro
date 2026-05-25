import { getOrCreateAlertSettings, supabaseAdmin } from './create';
import { detectMachineStopped } from './detectors/machine-stopped';
import { detectSalesDrop } from './detectors/sales-drop';
import { detectRuptureImminent } from './detectors/rupture-imminent';
import { detectProductStale } from './detectors/product-stale';
import { detectContractExpiring } from './detectors/contract-expiring';
import { detectMachineLoss } from './detectors/machine-loss';
import type { DetectorResult } from './types';

export interface TenantRunResult {
  tenant_id: string;
  detectors: Record<string, DetectorResult>;
  total_created: number;
  total_errors: number;
}

export async function runAlertChecksForTenant(tenantId: string, now: Date = new Date()): Promise<TenantRunResult> {
  const settings = await getOrCreateAlertSettings(tenantId);

  const detectors = {
    machine_stopped: await detectMachineStopped(tenantId, settings, now),
    sales_drop: await detectSalesDrop(tenantId, settings, now),
    rupture_imminent: await detectRuptureImminent(tenantId, settings, now),
    product_stale: await detectProductStale(tenantId, settings, now),
    contract_expiring: await detectContractExpiring(tenantId, settings, now),
    machine_loss: await detectMachineLoss(tenantId, settings, now),
  };

  const total_created = Object.values(detectors).reduce((s, d) => s + d.created, 0);
  const total_errors = Object.values(detectors).reduce((s, d) => s + d.errors.length, 0);

  return { tenant_id: tenantId, detectors, total_created, total_errors };
}

export interface AllTenantsRunResult {
  tenants_processed: number;
  total_created: number;
  total_errors: number;
  per_tenant: TenantRunResult[];
}

export async function runAlertChecksForAllActiveTenants(now: Date = new Date()): Promise<AllTenantsRunResult> {
  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .in('subscription_status', ['trial', 'active', 'overdue']);

  if (error) {
    throw new Error(`Erro ao listar tenants: ${error.message}`);
  }

  const per_tenant: TenantRunResult[] = [];
  for (const t of tenants ?? []) {
    try {
      const r = await runAlertChecksForTenant(t.id, now);
      per_tenant.push(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      per_tenant.push({
        tenant_id: t.id,
        detectors: {},
        total_created: 0,
        total_errors: 1,
      });
      console.error(`Tenant ${t.id} falhou:`, msg);
    }
  }

  return {
    tenants_processed: per_tenant.length,
    total_created: per_tenant.reduce((s, r) => s + r.total_created, 0),
    total_errors: per_tenant.reduce((s, r) => s + r.total_errors, 0),
    per_tenant,
  };
}
