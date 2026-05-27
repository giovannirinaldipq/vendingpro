import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { recordManualAdjust } from '@/lib/inventory/movements';

const updateInventorySchema = z.object({
  current_quantity: z.number().int().min(0).optional(),
  minimum_quantity: z.number().int().min(0).optional(),
});

const movementSchema = z.object({
  quantity: z.number().int(),
  movement_type: z.enum(['in', 'out', 'adjustment']),
  reason: z.string().optional(),
});

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return userProfile?.tenant_id || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(id, name, barcode, category, default_sale_price, default_cost_price)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item de estoque não encontrado' } },
      { status: 404 }
    );
  }

  // Buscar movimentações recentes
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('inventory_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      movements: movements || [],
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const validation = updateInventorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Carrega item atual (precisa do product_id pra registrar adjust)
  const { data: inv } = await supabase
    .from('inventory')
    .select('product_id, current_quantity')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!inv) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item de estoque não encontrado' } },
      { status: 404 }
    );
  }

  // Se mudou current_quantity, registra movement de ajuste manual
  if (
    validation.data.current_quantity != null &&
    validation.data.current_quantity !== inv.current_quantity
  ) {
    const adjResult = await recordManualAdjust(
      tenantId,
      inv.product_id,
      validation.data.current_quantity,
      user.id,
    );
    if (adjResult.error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: adjResult.error } },
        { status: 500 }
      );
    }
  }

  // Atualiza minimum_quantity (campo separado do estoque-via-movements)
  if (validation.data.minimum_quantity != null) {
    await supabase
      .from('inventory')
      .update({ minimum_quantity: validation.data.minimum_quantity })
      .eq('id', id)
      .eq('tenant_id', tenantId);
  }

  // Re-fetch
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(id, name, barcode, category)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

// Registrar movimentação de estoque
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const validation = movementSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Buscar estoque atual
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select('*, product:products(id, name)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (inventoryError || !inventory) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item de estoque não encontrado' } },
      { status: 404 }
    );
  }

  // Calcular nova quantidade
  let newQuantity = inventory.current_quantity;
  const { quantity, movement_type, reason } = validation.data;

  if (movement_type === 'in') {
    newQuantity += quantity;
  } else if (movement_type === 'out') {
    newQuantity -= quantity;
    if (newQuantity < 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Estoque insuficiente' } },
        { status: 400 }
      );
    }
  } else {
    // adjustment - define o valor absoluto
    newQuantity = quantity;
  }

  // Mapear tipo do frontend para tipo do banco
  const dbMovementType = movement_type === 'in' ? 'restock'
    : movement_type === 'out' ? 'manual_adjust'
    : 'manual_adjust';
  const dbQuantity = movement_type === 'in' ? quantity
    : movement_type === 'out' ? -quantity
    : quantity - inventory.current_quantity;

  // Registrar movimentação
  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      tenant_id: tenantId,
      product_id: inventory.product_id,
      movement_type: dbMovementType,
      quantity: dbQuantity,
      occurred_at: new Date().toISOString(),
      source_kind: 'manual',
      notes: reason || null,
    });

  if (movementError) {
    console.error('Movement error:', movementError);
    // Continua mesmo se falhar o registro de movimentação
  }

  // Atualizar estoque
  const { data, error } = await supabase
    .from('inventory')
    .update({
      current_quantity: newQuantity,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      product:products(id, name, barcode, category)
    `)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
