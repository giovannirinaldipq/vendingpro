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

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, company_name, subscription_status, trial_ends_at, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } }, { status: 404 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    machinesRes,
    activeMachinesRes,
    usersRes,
    restockersRes,
    productsRes,
    salesRes,
    recentSalesRes,
    openInvoicesRes,
    paidInvoicesRes,
    overdueInvoicesRes,
    lastLoginRes,
  ] = await Promise.all([
    supabaseAdmin.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_active', true),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_active', true),
    supabaseAdmin.from('restockers').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_active', true),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('sales').select('total_value, sale_date').eq('tenant_id', id),
    supabaseAdmin.from('sales').select('total_value').eq('tenant_id', id).gte('sale_date', thirtyDaysAgo),
    supabaseAdmin.from('billing_invoices_view').select('total', { count: 'exact' }).eq('tenant_id', id).in('status', ['pending', 'overdue']),
    supabaseAdmin.from('billing_invoices_view').select('total', { count: 'exact' }).eq('tenant_id', id).eq('status', 'paid'),
    supabaseAdmin.from('billing_invoices_view').select('total', { count: 'exact' }).eq('tenant_id', id).eq('status', 'overdue'),
    supabaseAdmin.from('users').select('last_login_at').eq('tenant_id', id).order('last_login_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const totalRevenue = (salesRes.data ?? []).reduce((acc: number, s: { total_value: number | null }) => acc + (Number(s.total_value) || 0), 0);
  const last30dRevenue = (recentSalesRes.data ?? []).reduce((acc: number, s: { total_value: number | null }) => acc + (Number(s.total_value) || 0), 0);
  const openTotal = (openInvoicesRes.data ?? []).reduce((acc: number, i: { total: number | null }) => acc + (Number(i.total) || 0), 0);
  const paidTotal = (paidInvoicesRes.data ?? []).reduce((acc: number, i: { total: number | null }) => acc + (Number(i.total) || 0), 0);
  const overdueTotal = (overdueInvoicesRes.data ?? []).reduce((acc: number, i: { total: number | null }) => acc + (Number(i.total) || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      tenant: {
        id: tenant.id,
        company_name: tenant.company_name,
        subscription_status: tenant.subscription_status,
        trial_ends_at: tenant.trial_ends_at,
        created_at: tenant.created_at,
      },
      counts: {
        machines: machinesRes.count ?? 0,
        active_machines: activeMachinesRes.count ?? 0,
        users: usersRes.count ?? 0,
        restockers: restockersRes.count ?? 0,
        products: productsRes.count ?? 0,
        sales: (salesRes.data ?? []).length,
      },
      revenue: {
        total: totalRevenue,
        last_30d: last30dRevenue,
      },
      billing: {
        open_count: openInvoicesRes.count ?? 0,
        open_total: openTotal,
        paid_count: paidInvoicesRes.count ?? 0,
        paid_total: paidTotal,
        overdue_count: overdueInvoicesRes.count ?? 0,
        overdue_total: overdueTotal,
      },
      last_user_login: lastLoginRes.data?.last_login_at ?? null,
    },
  });
}
