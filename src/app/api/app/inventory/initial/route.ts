import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { insertMovements } from '@/lib/inventory/movements';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface InitialItem {
  product_id: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const items: InitialItem[] = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const rows = items
    .filter(i => i.product_id && i.quantity > 0)
    .map(i => ({
      tenant_id: ctx.tenantId,
      product_id: i.product_id,
      movement_type: 'initial' as const,
      quantity: Math.round(i.quantity),
      occurred_at: now,
      source_kind: 'onboarding',
      created_by: ctx.userId,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'no_valid_items' }, { status: 400 });
  }

  // Ensure inventory rows exist for each product
  const inventoryRows = rows.map(r => ({
    tenant_id: ctx.tenantId,
    product_id: r.product_id,
    current_quantity: 0,
    minimum_quantity: 0,
  }));
  await supabaseAdmin
    .from('inventory')
    .upsert(inventoryRows, { onConflict: 'tenant_id,product_id' });

  const result = await insertMovements(rows);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    data: { initialized: result.inserted },
  });
}
