import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .from('billing_invoices_view')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  // Enriquecer com dados do tenant
  const tenantIds = [...new Set((data ?? []).map((i: { tenant_id: string }) => i.tenant_id).filter(Boolean))];
  const tenantsMap = new Map<string, { company_name: string; contact_name: string }>();
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, company_name, contact_name')
      .in('id', tenantIds);
    for (const t of (tenants ?? []) as { id: string; company_name: string; contact_name: string }[]) {
      tenantsMap.set(t.id, { company_name: t.company_name, contact_name: t.contact_name });
    }
  }

  const invoices = (data ?? []).map((inv: Record<string, unknown>) => ({
    ...inv,
    tenant: tenantsMap.get(inv.tenant_id as string) ?? null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      invoices,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin', 'financial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const body = await request.json();

  const { tenant_id, reference_month, due_date, machines_count, price_per_machine, discount = 0, adjustments = [] } = body;

  // Calcular valores
  const subtotal = machines_count * price_per_machine;
  const adjustmentsTotal = adjustments.reduce((sum: number, adj: { amount: number }) => sum + adj.amount, 0);
  const total = Math.max(subtotal - discount + adjustmentsTotal, 0);

  // Gerar número da fatura
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('billing_invoices_view')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);

  const invoiceNumber = `FAT-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabaseAdmin
    .from('billing_invoices_view')
    .insert({
      tenant_id,
      invoice_number: invoiceNumber,
      reference_month,
      due_date,
      subtotal,
      discount,
      total,
      machines_count,
      price_per_machine,
      adjustments,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'invoice.created_manual',
    entityType: 'billing.invoices',
    entityId: data.id,
    newValues: { tenant_id, reference_month, due_date, machines_count, price_per_machine, total },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
