/**
 * Helpers pra registrar movimentações de estoque (source-of-truth).
 *
 * Regra fundamental: NUNCA editar inventory.current_quantity direto.
 * Sempre inserir em inventory_movements; trigger recalcula automaticamente.
 *
 * Tipos de movimento:
 *  - sale          → quantity negativo (venda subtrai do estoque)
 *  - restock       → quantity positivo (reposição via visita)
 *  - manual_adjust → quantity = delta (positivo OU negativo)
 *  - initial       → quantity positivo (snapshot inicial / backfill)
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseLike = SupabaseClient | typeof supabaseAdmin;

export type MovementKind = 'sale' | 'restock' | 'manual_adjust' | 'initial';

interface BaseRow {
  tenant_id: string;
  product_id: string;
  machine_id?: string | null;
  movement_type: MovementKind;
  quantity: number;
  occurred_at: string;
  source_kind?: string | null;
  source_ref?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

/**
 * Devolve cutoff (data do último 'initial' ou 'manual_adjust') por produto.
 * Vendas com sale_datetime <= cutoff já estão refletidas no snapshot —
 * NÃO devem gerar movements.
 */
export async function getInventoryCutoff(
  tenantId: string,
  productId: string,
  client: SupabaseLike = supabaseAdmin,
): Promise<string | null> {
  const { data } = await (client as SupabaseClient)
    .from('inventory_movements')
    .select('occurred_at')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .in('movement_type', ['initial', 'manual_adjust'])
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.occurred_at ?? null;
}

/**
 * Insere movimentos em lote. Trigger recalcula current_quantity.
 */
export async function insertMovements(
  rows: BaseRow[],
  client: SupabaseLike = supabaseAdmin,
): Promise<{ inserted: number; error: string | null }> {
  if (rows.length === 0) return { inserted: 0, error: null };
  const { error, count } = await (client as SupabaseClient)
    .from('inventory_movements')
    .insert(rows, { count: 'exact' });
  if (error) return { inserted: 0, error: error.message };
  return { inserted: count ?? rows.length, error: null };
}

/**
 * Registra movimentos de venda em massa, filtrando por cutoff por produto.
 * Vendas anteriores ao último ajuste manual/initial NÃO geram movement
 * (estado snapshot já as reflete).
 */
export async function recordSalesMovementsFiltered(
  tenantId: string,
  sales: Array<{
    id?: string;
    product_id: string;
    machine_id: string | null;
    quantity: number;
    sale_datetime: string;
  }>,
  client: SupabaseLike = supabaseAdmin,
): Promise<{ inserted: number; skipped: number; error: string | null }> {
  if (sales.length === 0) return { inserted: 0, skipped: 0, error: null };

  // Agrupa por product_id pra buscar cutoff 1× por produto
  const productIds = [...new Set(sales.map(s => s.product_id).filter(Boolean))];
  const cutoffByProduct = new Map<string, string | null>();
  await Promise.all(productIds.map(async pid => {
    cutoffByProduct.set(pid, await getInventoryCutoff(tenantId, pid, client));
  }));

  const rows: BaseRow[] = [];
  let skipped = 0;
  for (const s of sales) {
    if (!s.product_id) { skipped++; continue; }
    const cutoff = cutoffByProduct.get(s.product_id);
    // Sem cutoff (nenhum initial/manual_adjust ainda) → conta sempre
    // Com cutoff → só conta se sale_datetime > cutoff
    if (cutoff && new Date(s.sale_datetime) <= new Date(cutoff)) {
      skipped++;
      continue;
    }
    rows.push({
      tenant_id: tenantId,
      product_id: s.product_id,
      machine_id: s.machine_id,
      movement_type: 'sale',
      quantity: -Math.abs(Number(s.quantity) || 1),
      occurred_at: s.sale_datetime,
      source_kind: 'sale',
      source_ref: s.id ?? null,
    });
  }

  const { inserted, error } = await insertMovements(rows, client);
  return { inserted, skipped, error };
}

/**
 * Registra movimentos de restock (visita finalizada).
 */
export async function recordRestockMovements(
  tenantId: string,
  visitId: string,
  machineId: string,
  items: Array<{ product_id: string | null; quantity: number }>,
  client: SupabaseLike = supabaseAdmin,
): Promise<{ inserted: number; error: string | null }> {
  const valid = items.filter(i => i.product_id && i.quantity > 0) as Array<{
    product_id: string;
    quantity: number;
  }>;
  if (valid.length === 0) return { inserted: 0, error: null };

  const occurredAt = new Date().toISOString();
  const rows: BaseRow[] = valid.map(i => ({
    tenant_id: tenantId,
    product_id: i.product_id,
    machine_id: machineId,
    movement_type: 'restock',
    quantity: Math.abs(Math.round(i.quantity)),
    occurred_at: occurredAt,
    source_kind: 'visit',
    source_ref: visitId,
  }));

  return insertMovements(rows, client);
}

/**
 * Registra ajuste manual: calcula delta entre quantidade nova e atual.
 * Insere 1 movement; trigger atualiza current_quantity.
 */
export async function recordManualAdjust(
  tenantId: string,
  productId: string,
  newQuantity: number,
  userId: string,
  notes?: string,
  client: SupabaseLike = supabaseAdmin,
): Promise<{ delta: number; error: string | null }> {
  // Lê current_quantity atual
  const { data: invRow } = await (client as SupabaseClient)
    .from('inventory')
    .select('current_quantity')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .maybeSingle();

  const current = Number(invRow?.current_quantity ?? 0);
  const delta = Math.round(newQuantity) - current;

  if (delta === 0) {
    // Nada a fazer — mas atualiza last_updated_at por consistência
    await (client as SupabaseClient)
      .from('inventory')
      .update({ last_updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('product_id', productId);
    return { delta: 0, error: null };
  }

  const { error } = await insertMovements([{
    tenant_id: tenantId,
    product_id: productId,
    movement_type: 'manual_adjust',
    quantity: delta,
    occurred_at: new Date().toISOString(),
    notes: notes ?? null,
    created_by: userId,
    source_kind: 'manual',
  }], client);

  return { delta, error };
}

/**
 * Registra estoque inicial (usado pelo backfill ou primeiro cadastro).
 */
export async function recordInitialStock(
  tenantId: string,
  productId: string,
  quantity: number,
  occurredAt?: string,
  client: SupabaseLike = supabaseAdmin,
): Promise<{ error: string | null }> {
  const { error } = await insertMovements([{
    tenant_id: tenantId,
    product_id: productId,
    movement_type: 'initial',
    quantity: Math.max(0, Math.round(quantity)),
    occurred_at: occurredAt ?? new Date().toISOString(),
    source_kind: 'initial',
  }], client);
  return { error };
}
