import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

  const { data, error } = await supabase
    .from('inventory')
    .update({
      ...validation.data,
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

  // Registrar movimentação
  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      tenant_id: tenantId,
      inventory_id: id,
      product_id: inventory.product_id,
      movement_type,
      quantity,
      quantity_before: inventory.current_quantity,
      quantity_after: newQuantity,
      reason: reason || null,
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
