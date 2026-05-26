import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('billing_invoices_view')
    .select('id, invoice_number, reference_month, due_date, total, status, paid_at, paid_amount, payment_method, gateway_boleto_url, created_at')
    .eq('tenant_id', id)
    .order('reference_month', { ascending: false })
    .limit(60);

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
