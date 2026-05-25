import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { suggestPurchaseList } from '@/lib/suggestions';

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const daysParam = req.nextUrl.searchParams.get('days') ?? '30';
  const days = Math.max(1, Math.min(180, parseInt(daysParam, 10) || 30));

  const data = await suggestPurchaseList(ctx.tenantId, days);
  return NextResponse.json({ data, meta: { target_days: days } });
}
