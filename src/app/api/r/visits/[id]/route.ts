/**
 * GET — Detalhe da visita (com picklist sugerido baseado em estoque)
 * PATCH — Adiciona itens / finaliza visita (check-out)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRestockerContext, restockerSupabaseAdmin } from '@/lib/auth/restocker';

const updateSchema = z.object({
  action: z.enum(['add_item', 'finish']),
  // add_item
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  suggested_quantity: z.number().int().min(0).optional(),
  // finish
  checkout_photo_url: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: visitId } = await params;
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }

  const { data: visit } = await restockerSupabaseAdmin
    .from('restocking_visits')
    .select('id, machine_id, checkin_at, checkout_at, checkin_photo_url, checkout_photo_url, notes, is_location_valid, checkin_distance_meters, machine:machines(id, code, name, location:locations(name))')
    .eq('id', visitId)
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', ctx.restockerId)
    .maybeSingle();

  if (!visit) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Visita não encontrada' } },
      { status: 404 }
    );
  }

  // Picklist: produtos cadastrados na máquina (machine_products) com sugestão
  // baseada em estoque (se houver) e capacidade do slot
  const { data: machineProducts } = await restockerSupabaseAdmin
    .from('machine_products')
    .select('id, sale_price, slot_code, product:products(id, name, category, unit_size)')
    .eq('machine_id', visit.machine_id)
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .order('slot_code', { ascending: true, nullsFirst: false });

  // Items já reabastecidos nesta visita
  const { data: items } = await restockerSupabaseAdmin
    .from('restocking_items')
    .select('id, product_id, product_name, quantity, suggested_quantity')
    .eq('visit_id', visitId);

  type ItemRow = NonNullable<typeof items>[number];
  const itemsByProduct = new Map<string, ItemRow>();
  for (const it of items ?? []) {
    if (it.product_id) itemsByProduct.set(it.product_id, it);
  }

  const picklist = (machineProducts ?? []).map(mp => {
    const prod = Array.isArray(mp.product) ? mp.product[0] : mp.product;
    const reposted = prod ? itemsByProduct.get(prod.id) : undefined;
    return {
      machine_product_id: mp.id,
      slot_code: mp.slot_code,
      product: prod,
      already_reposted: reposted?.quantity ?? 0,
      suggested_quantity: 10, // TODO: derivar de capacidade/consumo
    };
  });

  return NextResponse.json({
    success: true,
    data: { visit, picklist, items: items ?? [] },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: visitId } = await params;
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const v = updateSchema.safeParse(body);
  if (!v.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: v.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Confirma posse da visita
  const { data: visit } = await restockerSupabaseAdmin
    .from('restocking_visits')
    .select('id, checkin_at, checkout_at')
    .eq('id', visitId)
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', ctx.restockerId)
    .maybeSingle();

  if (!visit) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Visita não encontrada' } },
      { status: 404 }
    );
  }
  if (visit.checkout_at) {
    return NextResponse.json(
      { success: false, error: { code: 'ALREADY_FINISHED', message: 'Esta visita já foi finalizada' } },
      { status: 400 }
    );
  }

  if (v.data.action === 'add_item') {
    if (!v.data.product_id || v.data.quantity == null) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID', message: 'product_id e quantity obrigatórios' } },
        { status: 400 }
      );
    }
    // Upsert: se já existe item para este produto nesta visita, soma
    const { data: existing } = await restockerSupabaseAdmin
      .from('restocking_items')
      .select('id, quantity')
      .eq('visit_id', visitId)
      .eq('product_id', v.data.product_id)
      .maybeSingle();

    if (existing) {
      await restockerSupabaseAdmin
        .from('restocking_items')
        .update({ quantity: v.data.quantity })
        .eq('id', existing.id);
    } else {
      await restockerSupabaseAdmin
        .from('restocking_items')
        .insert({
          tenant_id: ctx.tenantId,
          visit_id: visitId,
          product_id: v.data.product_id,
          product_name: v.data.product_name ?? null,
          quantity: v.data.quantity,
          suggested_quantity: v.data.suggested_quantity ?? null,
        });
    }
    return NextResponse.json({ success: true });
  }

  // action === 'finish'
  const now = new Date();
  const checkinAt = new Date(visit.checkin_at);
  const durationMin = Math.round((now.getTime() - checkinAt.getTime()) / 60000);

  const { data: finished, error } = await restockerSupabaseAdmin
    .from('restocking_visits')
    .update({
      checkout_at: now.toISOString(),
      checkout_photo_url: v.data.checkout_photo_url ?? null,
      duration_minutes: durationMin,
      is_duration_valid: durationMin >= 3 && durationMin <= 180,
      notes: v.data.notes ?? null,
    })
    .eq('id', visitId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: finished });
}
