import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('[email] RESEND_API_KEY ausente — emails não serão enviados');
}

export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || 'VendingPro <onboarding@resend.dev>';
export const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'suporte@vendingpro.com.br';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vendingpro.vercel.app';
