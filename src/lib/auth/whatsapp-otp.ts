/**
 * Helpers de OTP via WhatsApp.
 * - generateCode: 6 dígitos
 * - hashCode: SHA-256 hex (mais leve que bcrypt pra OTP de 10min de validade)
 * - normalizePhone: aceita "+55 11 98765-4321" e devolve "+5511987654321"
 */
import { createHash, randomInt } from 'crypto';

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Se já tem código do país, usa; se começa com 11 dígitos (BR), prefixa +55
  if (digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

export function isValidPhone(phone: string): boolean {
  // Validação mínima: +<8-15 dígitos>
  return /^\+\d{8,15}$/.test(phone);
}

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
}

export { OTP_TTL_MINUTES, MAX_ATTEMPTS };
