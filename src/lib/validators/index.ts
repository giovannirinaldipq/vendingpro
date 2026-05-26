import { z } from 'zod';

// ============================================
// TENANT VALIDATORS
// ============================================

export const createTenantSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  trade_name: z.string().optional(),
  document_type: z.enum(['cpf', 'cnpj']),
  document_number: z.string().min(11, 'Documento inválido').max(18, 'Documento inválido'),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  address_zipcode: z.string().optional(),
  contact_name: z.string().min(2, 'Nome do contato deve ter pelo menos 2 caracteres'),
  contact_email: z.string().email('Email inválido'),
  contact_phone: z.string().optional(),
  financial_email: z.string().email('Email inválido').optional().or(z.literal('')),
  financial_phone: z.string().optional(),
  source: z.string().optional(),
  plan_id: z.string().uuid('Plano inválido').optional(),
  contracted_machines: z.number().int().min(1, 'Mínimo 1 máquina').max(9999).optional().default(5),
  billing_day: z.number().min(1).max(28).optional().default(10),
});

// Tipo para o formulário (com campos opcionais que têm default)
export type CreateTenantFormInput = z.input<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

// ============================================
// PLAN VALIDATORS
// ============================================

export const createPlanSchema = z.object({
  name: z.string().min(2, 'Nome do plano deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  price_per_machine: z.number().min(0, 'Preço deve ser positivo'),
  minimum_value: z.number().min(0, 'Valor mínimo deve ser positivo').default(99),
  minimum_machines: z.number().min(1, 'Mínimo de máquinas deve ser pelo menos 1').default(1),
  trial_days: z.number().min(0, 'Dias de trial deve ser positivo').default(14),
  features: z.array(z.string()).default([]),
  limits: z.object({
    max_machines: z.number().optional(),
    max_users: z.number().optional(),
    max_restockers: z.number().optional(),
    history_months: z.number().optional(),
  }).default({}),
  is_active: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ============================================
// INVOICE VALIDATORS
// ============================================

export const createInvoiceSchema = z.object({
  tenant_id: z.string().uuid('Tenant inválido'),
  reference_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  machines_count: z.number().min(1, 'Deve ter pelo menos 1 máquina'),
  price_per_machine: z.number().min(0, 'Preço deve ser positivo'),
  discount: z.number().min(0, 'Desconto deve ser positivo').default(0),
  adjustments: z.array(z.object({
    description: z.string(),
    amount: z.number(),
  })).default([]),
});

export const registerPaymentSchema = z.object({
  invoice_id: z.string().uuid('Fatura inválida'),
  amount: z.number().min(0.01, 'Valor deve ser positivo'),
  payment_method: z.string().min(1, 'Método de pagamento obrigatório'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  notes: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;

// ============================================
// ADMIN USER VALIDATORS
// ============================================

export const createAdminUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.enum(['super_admin', 'financial', 'support', 'commercial']),
});

export const updateAdminUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  role: z.enum(['super_admin', 'financial', 'support', 'commercial']).optional(),
  is_active: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// COMMON VALIDATORS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
