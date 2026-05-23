export type AlertType =
  | 'machine_stopped'
  | 'sales_drop'
  | 'rupture_imminent'
  | 'product_stale'
  | 'contract_expiring'
  | 'machine_loss';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const TYPE_LABEL: Record<AlertType, string> = {
  machine_stopped: 'Máquina parada',
  sales_drop: 'Queda de vendas',
  rupture_imminent: 'Ruptura iminente',
  product_stale: 'Produto encalhado',
  contract_expiring: 'Contrato vencendo',
  machine_loss: 'Máquina com prejuízo',
};

export interface AlertSettings {
  tenant_id: string;
  machine_stopped_hours: number;
  sales_drop_threshold_percent: number;
  sales_drop_period_days: number;
  rupture_estimate_days: number;
  product_stale_days: number;
  contract_expiring_days: number;
  email_enabled: boolean;
  email_min_severity: AlertSeverity;
  email_recipients: string[] | null;
}

export interface AlertInput {
  tenant_id: string;
  machine_id?: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  dedup_key: string;
}

export interface DetectorResult {
  created: number;
  skipped_existing: number;
  errors: string[];
}
