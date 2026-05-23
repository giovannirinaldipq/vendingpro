-- ============================================
-- VendingPro - Database Schema
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHEMA: admin (Backoffice)
-- ============================================

CREATE SCHEMA IF NOT EXISTS admin;

-- Usuários administrativos
CREATE TABLE admin.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'financial', 'support', 'commercial')),
  is_active BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de auditoria
CREATE TABLE admin.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES admin.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEMA: billing (Faturamento)
-- ============================================

CREATE SCHEMA IF NOT EXISTS billing;

-- Planos
CREATE TABLE billing.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  price_per_machine DECIMAL(10,2) NOT NULL,
  minimum_value DECIMAL(10,2) DEFAULT 99.00,
  minimum_machines INTEGER DEFAULT 1,
  trial_days INTEGER DEFAULT 14,
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Faturas
CREATE TABLE billing.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  reference_month DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  machines_count INTEGER NOT NULL,
  price_per_machine DECIMAL(10,2) NOT NULL,
  adjustments JSONB DEFAULT '[]',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  gateway_invoice_id VARCHAR(255),
  gateway_boleto_url TEXT,
  gateway_pix_code TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE billing.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES billing.invoices(id) NOT NULL,
  tenant_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  gateway_payment_id VARCHAR(255),
  gateway_data JSONB,
  is_manual BOOLEAN DEFAULT false,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES admin.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos de cobrança
CREATE TABLE billing.collection_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES billing.invoices(id) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'reminder_before', 'invoice_sent', 'reminder_overdue_1',
    'reminder_overdue_2', 'suspension_warning', 'suspended', 'cancelled'
  )),
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  channel VARCHAR(50),
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEMA: public (Aplicação Principal)
-- ============================================

-- Tenants (Clientes)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document_type VARCHAR(10) CHECK (document_type IN ('cpf', 'cnpj')),
  document_number VARCHAR(20) UNIQUE NOT NULL,
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  financial_email VARCHAR(255),
  financial_phone VARCHAR(20),
  source VARCHAR(100),
  salesperson_id UUID REFERENCES admin.users(id),
  plan_id UUID REFERENCES billing.plans(id),
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (
    subscription_status IN ('trial', 'active', 'overdue', 'suspended', 'cancelled')
  ),
  trial_ends_at TIMESTAMPTZ,
  billing_day INTEGER DEFAULT 10 CHECK (billing_day BETWEEN 1 AND 28),
  is_active BOOLEAN DEFAULT true,
  suspended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK nas faturas
ALTER TABLE billing.invoices ADD CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE billing.payments ADD CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

-- Usuários dos clientes
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  notification_email BOOLEAN DEFAULT true,
  notification_whatsapp BOOLEAN DEFAULT true,
  notification_quiet_start TIME,
  notification_quiet_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Reabastecedores
CREATE TABLE public.restockers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  document_number VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  avatar_url TEXT,
  vehicle_plate VARCHAR(10),
  vehicle_model VARCHAR(100),
  pin_code VARCHAR(6),
  app_token VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locais/Pontos
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location_type VARCHAR(50) CHECK (location_type IN (
    'school', 'company', 'hospital', 'gym', 'mall',
    'bus_station', 'condominium', 'university', 'other'
  )),
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  contract_type VARCHAR(50) CHECK (contract_type IN ('rent', 'commission', 'free')),
  contract_value DECIMAL(10,2),
  commission_percent DECIMAL(5,2),
  contract_start_date DATE,
  contract_end_date DATE,
  contract_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Máquinas
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  machine_type VARCHAR(50) CHECK (machine_type IN ('snack', 'beverage', 'combo', 'coffee', 'other')),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  total_slots INTEGER,
  slot_capacity INTEGER,
  telemetry_system VARCHAR(50) CHECK (telemetry_system IN ('vmpay', 'vendpago', 'other')),
  telemetry_id VARCHAR(100),
  acquisition_date DATE,
  acquisition_value DECIMAL(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'installing', 'deactivated')),
  status_changed_at TIMESTAMPTZ,
  status_reason TEXT,
  photo_url TEXT,
  restocker_id UUID REFERENCES public.restockers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  barcode VARCHAR(50),
  category VARCHAR(100),
  default_sale_price DECIMAL(10,2),
  default_cost_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Importações
CREATE TABLE public.imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_url TEXT,
  source_system VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'partial', 'failed')),
  total_rows INTEGER,
  processed_rows INTEGER,
  error_rows INTEGER,
  errors_detail JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Vendas
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  machine_id UUID REFERENCES public.machines(id) NOT NULL,
  product_id UUID REFERENCES public.products(id),
  sale_date DATE NOT NULL,
  sale_time TIME NOT NULL,
  sale_datetime TIMESTAMPTZ NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  import_id UUID REFERENCES public.imports(id),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visitas de abastecimento
CREATE TABLE public.restocking_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  machine_id UUID REFERENCES public.machines(id) NOT NULL,
  restocker_id UUID REFERENCES public.restockers(id) NOT NULL,
  checkin_at TIMESTAMPTZ NOT NULL,
  checkin_latitude DECIMAL(10, 8),
  checkin_longitude DECIMAL(11, 8),
  checkin_distance_meters INTEGER,
  checkin_photo_url TEXT,
  checkout_at TIMESTAMPTZ,
  checkout_photo_url TEXT,
  duration_minutes INTEGER,
  is_location_valid BOOLEAN,
  is_duration_valid BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens repostos
CREATE TABLE public.restocking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES public.restocking_visits(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  suggested_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custos por máquina
CREATE TABLE public.machine_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  machine_id UUID REFERENCES public.machines(id) NOT NULL,
  cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN (
    'rent', 'telemetry', 'insurance', 'maintenance', 'other'
  )),
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'one_time')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  machine_id UUID REFERENCES public.machines(id),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'machine_stopped', 'sales_drop', 'rupture_imminent',
    'product_stale', 'contract_expiring', 'machine_loss'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  notified_email BOOLEAN DEFAULT false,
  notified_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estoque central
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, product_id)
);

-- Movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
    'purchase', 'transfer_out', 'adjustment', 'return'
  )),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_sales_tenant_date ON public.sales(tenant_id, sale_date);
CREATE INDEX idx_sales_machine_date ON public.machines(tenant_id, status);
CREATE INDEX idx_sales_datetime ON public.sales(sale_datetime);
CREATE INDEX idx_alerts_tenant_status ON public.alerts(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_invoices_status ON billing.invoices(status) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_tenants_status ON public.tenants(subscription_status);
CREATE INDEX idx_machines_tenant ON public.machines(tenant_id);
CREATE INDEX idx_users_tenant ON public.users(tenant_id);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restockers_updated_at BEFORE UPDATE ON public.restockers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_machine_costs_updated_at BEFORE UPDATE ON public.machine_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON billing.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON billing.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Planos padrão
INSERT INTO billing.plans (name, slug, price_per_machine, minimum_value, minimum_machines, trial_days, features, limits) VALUES
('Essencial', 'essencial', 19.00, 99.00, 1, 14, '["dashboard", "heatmap", "ranking", "products"]', '{"max_machines": 20, "max_users": 2, "history_months": 6}'),
('Profissional', 'profissional', 29.00, 99.00, 1, 14, '["dashboard", "heatmap", "ranking", "products", "alerts", "restocking", "suggestions"]', '{"max_machines": 50, "max_users": 5, "max_restockers": 3, "history_months": 12}'),
('Completo', 'completo', 39.00, 99.00, 1, 14, '["dashboard", "heatmap", "ranking", "products", "alerts", "restocking", "suggestions", "financial", "inventory", "conciliation", "reports"]', '{"max_machines": null, "max_users": null, "max_restockers": null, "history_months": null}');

-- Admin inicial (senha será definida via Supabase Auth)
-- INSERT INTO admin.users (email, name, role) VALUES ('admin@vendingpro.com.br', 'Administrador', 'super_admin');
