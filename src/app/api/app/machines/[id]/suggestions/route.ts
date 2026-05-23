import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { suggestRestockForMachine } from '@/lib/restocking';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const suggestions = await suggestRestockForMachine(ctx.tenantId, id);
  return NextResponse.json({ data: suggestions });
}
