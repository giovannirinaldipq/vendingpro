import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { recordManualAdjust } from '@/lib/inventory/movements';

const inventorySchema = z.object({
  product_id: z.string().uuid(),
  current_quantity: z.number().int().min(0),
  minimum_quantity: z.number().int().min(0).optional(),
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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const lowStock = searchParams.get('low_stock') === 'true';

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: { inventory: [], total: 0 },
    });
  }

  // Buscar estoque com produtos
  const query = supabase
    .from('inventory')
    .select(`
      *,
      product:products(id, name, barcode, category, default_sale_price, default_cost_price)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('last_updated_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  // Filtrar por busca e estoque baixo
  let filteredData = data || [];

  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter((item) => {
      const product = item.product as { name: string; barcode?: string; category?: string } | null;
      return (
        product?.name?.toLowerCase().includes(searchLower) ||
        product?.barcode?.toLowerCase().includes(searchLower) ||
        product?.category?.toLowerCase().includes(searchLower)
      );
    });
  }

  if (lowStock) {
    filteredData = filteredData.filter(
      (item) => item.current_quantity <= (item.minimum_quantity || 0)
    );
  }

  // Calcular estatísticas
  const totalItems = filteredData.reduce((sum, item) => sum + item.current_quantity, 0);
  const lowStockCount = (data || []).filter(
    (item) => item.current_quantity <= (item.minimum_quantity || 0)
  ).length;
  const totalValue = filteredData.reduce((sum, item) => {
    const product = item.product as { default_cost_price?: number } | null;
    return sum + (item.current_quantity * (product?.default_cost_price || 0));
  }, 0);

  return NextResponse.json({
    success: true,
    data: {
      inventory: filteredData,
      total: filteredData.length,
      stats: {
        total_items: totalItems,
        low_stock_count: lowStockCount,
        total_value: Math.round(totalValue * 100) / 100,
        products_count: (data || []).length,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
      { status: 401 }
    );
  }

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const validation = inventorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Verificar se o produto pertence ao tenant
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', validation.data.product_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!product) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Produto não encontrado' } },
      { status: 404 }
    );
  }

  // Ajuste manual: registra movement com delta. Trigger atualiza current_quantity.
  // Se inventory row ainda não existe (primeira vez), gera 'initial' em vez de 'manual_adjust'.
  const { data: existingInv } = await supabase
    .from('inventory')
    .select('current_quantity')
    .eq('tenant_id', tenantId)
    .eq('product_id', validation.data.product_id)
    .maybeSingle();

  if (!existingInv) {
    // Primeira vez — registra estoque inicial
    const { recordInitialStock } = await import('@/lib/inventory/movements');
    const initResult = await recordInitialStock(
      tenantId,
      validation.data.product_id,
      validation.data.current_quantity,
    );
    if (initResult.error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: initResult.error } },
        { status: 500 }
      );
    }
    // Atualiza minimum_quantity (campo separado dos movimentos)
    if (validation.data.minimum_quantity != null) {
      await supabase
        .from('inventory')
        .update({ minimum_quantity: validation.data.minimum_quantity })
        .eq('tenant_id', tenantId)
        .eq('product_id', validation.data.product_id);
    }
  } else {
    // Ajuste subsequente
    const adjResult = await recordManualAdjust(
      tenantId,
      validation.data.product_id,
      validation.data.current_quantity,
      user.id,
    );
    if (adjResult.error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: adjResult.error } },
        { status: 500 }
      );
    }
    if (validation.data.minimum_quantity != null) {
      await supabase
        .from('inventory')
        .update({ minimum_quantity: validation.data.minimum_quantity })
        .eq('tenant_id', tenantId)
        .eq('product_id', validation.data.product_id);
    }
  }

  // Re-fetch pra retornar estado atualizado
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(id, name, barcode, category)
    `)
    .eq('tenant_id', tenantId)
    .eq('product_id', validation.data.product_id)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
