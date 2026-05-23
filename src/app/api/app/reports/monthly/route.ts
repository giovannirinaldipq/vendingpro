import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { buildMonthlyReport, renderMonthlyReportPdf } from '@/lib/reports';

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let month = req.nextUrl.searchParams.get('month');
  if (!month) {
    // mês anterior por padrão
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    month = d.toISOString().slice(0, 7);
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'invalid_month_format' }, { status: 400 });
  }

  const data = await buildMonthlyReport(ctx.tenantId, month);
  const pdf = await renderMonthlyReportPdf(data);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="relatorio-${month}.pdf"`,
    },
  });
}
