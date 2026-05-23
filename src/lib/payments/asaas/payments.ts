import { asaasRequest } from './client';
import type { AsaasBillingType, AsaasPayment, AsaasPixQrCode } from './types';

interface CreatePaymentInput {
  customerId: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string; // invoice_id
  billingType?: AsaasBillingType;
}

export async function createPayment(input: CreatePaymentInput): Promise<AsaasPayment> {
  return await asaasRequest<AsaasPayment>('/payments', {
    method: 'POST',
    body: {
      customer: input.customerId,
      billingType: input.billingType ?? 'UNDEFINED', // permite cliente escolher
      value: input.value,
      dueDate: input.dueDate,
      description: input.description ?? `Fatura ${input.externalReference ?? ''}`,
      externalReference: input.externalReference,
    },
  });
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return await asaasRequest<AsaasPayment>(`/payments/${id}`);
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode | null> {
  try {
    return await asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
  } catch {
    return null;
  }
}

export async function deletePayment(id: string): Promise<void> {
  await asaasRequest(`/payments/${id}`, { method: 'DELETE' });
}
