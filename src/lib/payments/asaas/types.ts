export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
}

export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';

export type AsaasPaymentStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS'
  | 'DELETED';

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  status: AsaasPaymentStatus;
  billingType: AsaasBillingType;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  externalReference?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

export type AsaasWebhookEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED';

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment: AsaasPayment;
}
