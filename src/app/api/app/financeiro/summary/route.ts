import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { calculateTenantResult } from '@/lib/finance';

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get('period_days') || '30');
  const result = await calculateTenantResult(ctx.tenantId, Math.min(Math.max(days, 1), 365));
  return NextResponse.json({ data: result });
}
