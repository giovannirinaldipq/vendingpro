import { asaasRequest } from './client';
import type { AsaasCustomer } from './types';

interface UpsertInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string | null;
  mobilePhone?: string | null;
  externalReference?: string;
}

interface PaginatedCustomers {
  data: AsaasCustomer[];
  hasMore: boolean;
}

export async function findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
  const result = await asaasRequest<PaginatedCustomers>('/customers', {
    query: { cpfCnpj: cleanDoc(cpfCnpj), limit: 1 },
  });
  return result.data?.[0] ?? null;
}

export async function createCustomer(input: UpsertInput): Promise<AsaasCustomer> {
  return await asaasRequest<AsaasCustomer>('/customers', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      cpfCnpj: cleanDoc(input.cpfCnpj),
      phone: input.phone ?? undefined,
      mobilePhone: input.mobilePhone ?? undefined,
      externalReference: input.externalReference,
      notificationDisabled: true, // queremos controlar via Resend
    },
  });
}

export async function getOrCreateCustomer(input: UpsertInput): Promise<AsaasCustomer> {
  const existing = await findCustomerByCpfCnpj(input.cpfCnpj);
  if (existing) return existing;
  return await createCustomer(input);
}

function cleanDoc(s: string): string {
  return s.replace(/\D/g, '');
}
