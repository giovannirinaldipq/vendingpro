export type AdminRole = 'super_admin' | 'financial' | 'support' | 'commercial';

export const ALL_ADMIN_ROLES: AdminRole[] = ['super_admin', 'financial', 'support', 'commercial'];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  financial: 'Financeiro',
  support: 'Suporte',
  commercial: 'Comercial',
};
