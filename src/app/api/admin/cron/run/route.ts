/**
 * POST /api/admin/cron/run
 * Body: { kind: 'billing' | 'alerts' | 'monthly_reports' }
 *
 * Permite que um super_admin dispare manualmente um cron sem precisar do
 * CRON_SECRET no client. Esse endpoint chama o cron internamente passando
 * o secret server-side + headers x-cron-trigger=manual + admin id.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin/auth';

const schema = z.object({
  kind: z.enum(['billing', 'alerts', 'monthly_reports']),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin', 'financial']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_SECRET', message: 'CRON_SECRET não configurado na Vercel' } },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const url = `${baseUrl}/api/cron/${parsed.data.kind === 'monthly_reports' ? 'monthly-reports' : parsed.data.kind}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cronSecret}`,
      'content-type': 'application/json',
      'x-cron-trigger': 'manual',
      'x-cron-admin-id': auth.admin.id,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: { code: 'CRON_FAILED', message: body?.error ?? 'falha no cron', details: body } },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true, data: body.data ?? body });
}
