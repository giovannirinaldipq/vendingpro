import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');

  let query = ctx.supabase
    .from('sales')
    .select('sale_datetime, machine_id, product_name, quantity, unit_price, total_price, payment_method, machine:machines(name, code), location:machines(location:locations(name))')
    .eq('tenant_id', ctx.tenantId)
    .order('sale_datetime', { ascending: false })
    .limit(50000);

  if (from) query = query.gte('sale_datetime', from);
  if (to) query = query.lte('sale_datetime', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = ['Data', 'Máquina', 'Código', 'Local', 'Produto', 'Quantidade', 'Valor unitário', 'Valor total', 'Pagamento'];
  const lines = [headers.join(';')];
  for (const r of data ?? []) {
    const machine = Array.isArray(r.machine) ? r.machine[0] : r.machine;
    const loc = Array.isArray(r.location) ? r.location[0]?.location : undefined;
    const locName = Array.isArray(loc) ? loc[0]?.name : (loc as { name?: string } | undefined)?.name;
    lines.push([
      new Date(r.sale_datetime).toLocaleString('pt-BR'),
      csvEsc(machine?.name ?? ''),
      csvEsc(machine?.code ?? ''),
      csvEsc(locName ?? ''),
      csvEsc(r.product_name ?? ''),
      r.quantity,
      Number(r.unit_price ?? 0).toFixed(2).replace('.', ','),
      Number(r.total_price ?? 0).toFixed(2).replace('.', ','),
      csvEsc(r.payment_method ?? ''),
    ].join(';'));
  }

  const csv = '﻿' + lines.join('\r\n'); // BOM para Excel BR
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vendas-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function csvEsc(s: string): string {
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
