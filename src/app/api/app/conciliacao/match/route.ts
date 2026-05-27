import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { parseBankCSV } from '@/lib/conciliacao/csv';
import { matchBankAgainstPayments } from '@/lib/conciliacao/match';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file_required' }, { status: 400 });

  const text = await file.text();
  const { rows: bankRows, errors } = parseBankCSV(text);
  if (errors.length > 0 && bankRows.length === 0) {
    return NextResponse.json({ error: 'parse_failed', details: errors }, { status: 400 });
  }

  // Limita período do extrato para evitar comparar contra payments antigos
  const dates = bankRows.map(r => r.date).sort();
  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];

  const { data: payments } = await supabaseAdmin
    .from('billing_payments_view')
    .select('id, amount, payment_date, payment_method')
    .eq('tenant_id', ctx.tenantId)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate);

  const mappedPayments = (payments ?? []).map(p => ({
    id: p.id,
    amount: Number(p.amount),
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    invoice_number: undefined,
  }));

  const matches = matchBankAgainstPayments(bankRows, mappedPayments);
  const stats = {
    total_rows: bankRows.length,
    matched_high: matches.filter(m => m.confidence === 'high').length,
    matched_medium: matches.filter(m => m.confidence === 'medium').length,
    matched_low: matches.filter(m => m.confidence === 'low').length,
    unmatched: matches.filter(m => m.matched_payment_id === null && m.bank_row.amount > 0).length,
    outflows: matches.filter(m => m.bank_row.amount <= 0).length,
  };

  return NextResponse.json({ data: { matches, stats, parse_warnings: errors } });
}
