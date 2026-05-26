/**
 * GET /api/app/inventory/[id]/movements
 * Retorna histórico de movimentações do item de estoque com saldo acumulado.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const limit = Math.min(200, parseInt(request.nextUrl.searchParams.get('limit') || '100'));

  // Pega o inventory pra saber o product_id
  const { data: inv } = await ctx.supabase
    .from('inventory')
    .select('id, product_id, current_quantity, minimum_quantity, last_updated_at, product:products(id, name, barcode, category)')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!inv) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item de estoque não encontrado' } },
      { status: 404 }
    );
  }

  // Busca movements em ordem cronológica (ascendente) pra calcular saldo acumulado,
  // depois inverte pra exibir do mais recente primeiro
  const { data: movements, error } = await ctx.supabase
    .from('inventory_movements')
    .select('id, movement_type, quantity, occurred_at, source_kind, source_ref, notes, machine:machines(id, name, code), created_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('product_id', inv.product_id)
    .order('occurred_at', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  // Calcula saldo acumulado
  let running = 0;
  const withBalance = (movements ?? []).map(m => {
    running += Number((m as { quantity: number }).quantity);
    return { ...m, balance_after: Math.max(0, running) };
  });

  // Inverte: mais recente primeiro
  withBalance.reverse();

  return NextResponse.json({
    success: true,
    data: {
      inventory: inv,
      movements: withBalance,
    },
  });
}
