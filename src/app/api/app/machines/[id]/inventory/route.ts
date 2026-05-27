import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { recordMachineAdjust, insertMovements } from '@/lib/inventory/movements';

const adjustSchema = z.object({
  product_id: z.string().uuid(),
  counted_quantity: z.number().int().min(0),
  notes: z.string().min(3, 'Justificativa obrigatória (mín. 3 caracteres)'),
});

const restockSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1, 'Informe ao menos 1 produto'),
  notes: z.string().max(500).optional(),
});

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id) return null;
  return { userId: user.id, tenantId: profile.tenant_id };
}

async function machineBelongsToTenant(machineId: string, tenantId: string) {
  const { data } = await supabaseAdmin
    .from('machines').select('id').eq('id', machineId).eq('tenant_id', tenantId).maybeSingle();
  return !!data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }
  if (!(await machineBelongsToTenant(machineId, ctx.tenantId))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  // Busca machine_inventory + machine_products (para max_capacity e slot_code)
  const [{ data: inventory }, { data: machineProducts }, { data: machine }] = await Promise.all([
    supabaseAdmin
      .from('machine_inventory')
      .select('product_id, current_quantity, last_updated_at')
      .eq('machine_id', machineId)
      .eq('tenant_id', ctx.tenantId),
    supabaseAdmin
      .from('machine_products')
      .select('product_id, slot_code, max_capacity, is_active, product:products(id, name, category, unit_size)')
      .eq('machine_id', machineId)
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .order('slot_code', { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from('machines')
      .select('slot_capacity')
      .eq('id', machineId)
      .single(),
  ]);

  const globalCapacity = machine?.slot_capacity ?? null;
  const stockMap = new Map(
    (inventory ?? []).map(i => [i.product_id, i])
  );

  const items = (machineProducts ?? []).map(mp => {
    const prod = Array.isArray(mp.product) ? mp.product[0] : mp.product;
    const stock = stockMap.get(mp.product_id);
    const currentQty = stock?.current_quantity ?? 0;
    const effectiveCapacity = mp.max_capacity ?? globalCapacity ?? null;
    const fillLevel = effectiveCapacity ? Math.min(currentQty / effectiveCapacity, 1) : null;

    return {
      product_id: mp.product_id,
      product: prod,
      slot_code: mp.slot_code,
      max_capacity: effectiveCapacity,
      current_quantity: currentQty,
      fill_level: fillLevel,
      last_updated_at: stock?.last_updated_at ?? null,
    };
  });

  const totalItems = items.reduce((sum, i) => sum + i.current_quantity, 0);
  const totalCapacity = items.reduce((sum, i) => sum + (i.max_capacity ?? 0), 0);
  const criticalSlots = items.filter(i => i.fill_level !== null && i.fill_level < 0.3).length;

  return NextResponse.json({
    success: true,
    data: {
      items,
      summary: {
        total_items: totalItems,
        total_capacity: totalCapacity,
        fill_rate: totalCapacity > 0 ? Math.round((totalItems / totalCapacity) * 100) : null,
        critical_slots: criticalSlots,
        total_slots: items.length,
      },
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }
  if (!(await machineBelongsToTenant(machineId, ctx.tenantId))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const validation = adjustSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { product_id, counted_quantity, notes } = validation.data;

  const result = await recordMachineAdjust(
    ctx.tenantId,
    machineId,
    product_id,
    counted_quantity,
    ctx.userId,
    notes,
  );

  if (result.error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: result.error } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { delta: result.delta, new_quantity: counted_quantity },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }
  if (!(await machineBelongsToTenant(machineId, ctx.tenantId))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const validation = restockSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { items, notes } = validation.data;
  const occurredAt = new Date().toISOString();

  const rows = items.filter(i => i.quantity > 0).map(i => ({
    tenant_id: ctx.tenantId,
    product_id: i.product_id,
    machine_id: machineId,
    movement_type: 'restock' as const,
    quantity: Math.abs(Math.round(i.quantity)),
    occurred_at: occurredAt,
    source_kind: 'owner_restock',
    notes: notes ?? null,
    created_by: ctx.userId,
  }));

  const result = await insertMovements(rows);
  if (result.error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: result.error } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { inserted: result.inserted, items_count: items.length },
  });
}
