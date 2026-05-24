// Tipos do banco de dados - VendingPro

// ============================================
// ENUMS
// ============================================

export type AdminRole = 'super_admin' | 'financial' | 'support' | 'commercial';
export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'suspended' | 'cancelled';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer';
export type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'installing' | 'deactivated';
export type MachineType = 'snack_beverage' | 'coffee' | 'other';
export type TelemetrySystem = 'vmpay' | 'vendpago' | 'other';
export type LocationType = 'school' | 'company' | 'hospital' | 'gym' | 'mall' | 'bus_station' | 'condominium' | 'university' | 'other';
export type ContractType = 'rent' | 'commission' | 'free';
export type AlertType = 'machine_stopped' | 'sales_drop' | 'rupture_imminent' | 'product_stale' | 'contract_expiring' | 'machine_loss';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

// ============================================
// ADMIN SCHEMA
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================
// BILLING SCHEMA
// ============================================

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_per_machine: number;
  minimum_value: number;
  minimum_machines: number;
  trial_days: number;
  features: string[];
  limits: {
    max_machines?: number;
    max_users?: number;
    max_restockers?: number;
    history_months?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  reference_month: string;
  due_date: string;
  subtotal: number;
  discount: number;
  total: number;
  machines_count: number;
  price_per_machine: number;
  adjustments: Array<{
    description: string;
    amount: number;
  }>;
  status: InvoiceStatus;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  gateway_invoice_id: string | null;
  gateway_boleto_url: string | null;
  gateway_pix_code: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  tenant_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  gateway_payment_id: string | null;
  gateway_data: Record<string, unknown> | null;
  is_manual: boolean;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================
// PUBLIC SCHEMA
// ============================================

export interface Tenant {
  id: string;
  company_name: string;
  trade_name: string | null;
  document_type: 'cpf' | 'cnpj' | null;
  document_number: string;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  financial_email: string | null;
  financial_phone: string | null;
  source: string | null;
  salesperson_id: string | null;
  plan_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  billing_day: number;
  is_active: boolean;
  suspended_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  plan?: Plan;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  notification_email: boolean;
  notification_whatsapp: boolean;
  notification_quiet_start: string | null;
  notification_quiet_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  location_type: LocationType | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contract_type: ContractType | null;
  contract_value: number | null;
  commission_percent: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  tenant_id: string;
  location_id: string | null;
  code: string;
  name: string;
  machine_type: MachineType | null;
  manufacturer: string | null;
  model: string | null;
  total_slots: number | null;
  slot_capacity: number | null;
  telemetry_system: TelemetrySystem | null;
  telemetry_id: string | null;
  acquisition_date: string | null;
  acquisition_value: number | null;
  status: MachineStatus;
  status_changed_at: string | null;
  status_reason: string | null;
  photo_url: string | null;
  restocker_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  location?: Location;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  /** @deprecated mantido por compatibilidade com parser VMPay; UI não expõe mais */
  barcode: string | null;
  /** Categoria livre, editável pelo cliente (ex: "Salgadinhos", "Bebidas Premium") */
  category: string | null;
  /** Tamanho/gramatura/volume (ex: "350ml", "41,5g") */
  unit_size: string | null;
  /** Preço de venda DEFAULT — pode ser sobrescrito por máquina em MachineProduct.sale_price */
  default_sale_price: number | null;
  default_cost_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Preço de venda de um produto numa máquina específica.
 * Permite que o mesmo Kit Kat seja R$ 4 numa máquina e R$ 6 em outra.
 */
export interface MachineProduct {
  id: string;
  tenant_id: string;
  machine_id: string;
  product_id: string;
  sale_price: number;
  cost_price: number | null;
  slot_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  product?: Product;
}

export interface FinanceSettings {
  tenant_id: string;
  /** Taxa sobre cartão de crédito (%) */
  card_fee_percent: number;
  /** Taxa sobre cartão de débito (%) */
  debit_card_fee_percent: number;
  /** Taxa sobre PIX (%) */
  pix_fee_percent: number;
  /** Taxa sobre dinheiro (%) — usado pra coberturas operacionais */
  cash_fee_percent: number;
  /** Taxa sobre Vale Alimentação/Refeição (Alelo, Sodexo, VR, Ticket) (%) */
  meal_voucher_fee_percent: number;
  /** Outras taxas de vouchers/meios alternativos */
  other_voucher_fees: Array<{ label: string; percent: number }>;
  loss_alert_enabled: boolean;
  loss_alert_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  machine_id: string;
  product_id: string | null;
  sale_date: string;
  sale_time: string;
  sale_datetime: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string | null;
  import_id: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Restocker {
  id: string;
  tenant_id: string;
  name: string;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  pin_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  tenant_id: string;
  machine_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  status: AlertStatus;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  notified_email: boolean;
  notified_whatsapp: boolean;
  created_at: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================
// DASHBOARD METRICS
// ============================================

export interface AdminDashboardMetrics {
  mrr: number;
  mrr_growth: number;
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  overdue_tenants: number;
  suspended_tenants: number;
  total_machines: number;
  churn_rate: number;
  average_ticket: number;
  overdue_amount: number;
  overdue_count: number;
}

export interface TenantDashboardMetrics {
  total_revenue: number;
  revenue_growth: number;
  total_sales: number;
  sales_growth: number;
  average_ticket: number;
  ticket_growth: number;
  active_machines: number;
  machines_with_issues: number;
  pending_alerts: number;
}
