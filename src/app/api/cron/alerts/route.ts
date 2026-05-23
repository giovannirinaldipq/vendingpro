import { NextRequest, NextResponse } from 'next/server';
import { runAlertChecksForAllActiveTenants } from '@/lib/alerts';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runAlertChecksForAllActiveTenants();
    return NextResponse.json({ success: true, data: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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
