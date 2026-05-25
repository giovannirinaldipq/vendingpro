import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { suggestRestockSchedule } from '@/lib/suggestions';

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await suggestRestockSchedule(ctx.tenantId);
  return NextResponse.json({ data });
}
