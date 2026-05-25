import { NextRequest, NextResponse } from 'next/server';
import { runAlertChecksForAllActiveTenants } from '@/lib/alerts';
import { startCronRun, finishCronRun, type Trigger } from '@/lib/admin/cron-log';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trigger = (request.headers.get('x-cron-trigger') as Trigger) ?? 'schedule';
  const adminId = request.headers.get('x-cron-admin-id') ?? undefined;
  const run = await startCronRun('alerts', trigger, adminId);

  try {
    const summary = await runAlertChecksForAllActiveTenants();
    await finishCronRun(run, { success: true, summary: summary as unknown as Record<string, unknown> });
    return NextResponse.json({ success: true, data: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishCronRun(run, { success: false, errors: [msg] });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ status: 'ok', message: 'Alerts cron endpoint ready', timestamp: new Date().toISOString() });
}
