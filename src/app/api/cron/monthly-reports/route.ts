import { NextRequest, NextResponse } from 'next/server';
import { buildMonthlyReport, listActiveTenants, renderMonthlyReportPdf } from '@/lib/reports';
import { sendMonthlyReportEmail } from '@/lib/email/report';
import { startCronRun, finishCronRun, type Trigger } from '@/lib/admin/cron-log';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

interface Results {
  tenants_processed: number;
  reports_sent: number;
  failed: number;
  errors: string[];
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Por padrão envia relatório do mês anterior
  const param = req.nextUrl.searchParams.get('month');
  let month = param;
  if (!month) {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    month = d.toISOString().slice(0, 7);
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'invalid_month_format' }, { status: 400 });
  }

  const trigger = (req.headers.get('x-cron-trigger') as Trigger) ?? 'schedule';
  const adminId = req.headers.get('x-cron-admin-id') ?? undefined;
  const run = await startCronRun('monthly_reports', trigger, adminId);

  const tenants = await listActiveTenants();
  const results: Results = { tenants_processed: 0, reports_sent: 0, failed: 0, errors: [] };

  for (const t of tenants) {
    results.tenants_processed++;
    try {
      const data = await buildMonthlyReport(t.id, month);
      const pdf = await renderMonthlyReportPdf(data);
      const to = t.financial_email || t.contact_email;
      const r = await sendMonthlyReportEmail(to, data.tenant_name, data.period_label, pdf);
      if (r.ok) results.reports_sent++;
      else if (!r.skipped) {
        results.failed++;
        if (r.error) results.errors.push(`${t.id}: ${r.error}`);
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`${t.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await finishCronRun(run, {
    success: results.errors.length === 0,
    summary: { tenants_processed: results.tenants_processed, reports_sent: results.reports_sent, failed: results.failed, month },
    errors: results.errors,
  });

  return NextResponse.json({ success: true, data: results });
}
