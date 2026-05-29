import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { runParser, type ImportSource } from '@/lib/import';
import { recordSalesMovementsFiltered } from '@/lib/inventory/movements';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findBestProductMatch } from '@/lib/import/product-match';

interface MappingPair {
  external_name: string;
  machine_id: string;
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Check if tenant has at least one initial stock movement
  const { count: initialCount } = await supabaseAdmin
    .from('inventory_movements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('movement_type', 'initial');

  const hasInitialStock = (initialCount ?? 0) > 0;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const systemRaw = (form.get('system') as string | null) ?? 'vmpay';
  const mappingsRaw = form.get('mappings') as string | null;
  const skipStockWarning = form.get('skip_stock_warning') === 'true';

  if (!file) return NextResponse.json({ error: 'file_required' }, { status: 400 });

  if (!hasInitialStock && !skipStockWarning) {
    return NextResponse.json({
      error: 'no_initial_stock',
      message: 'Você ainda não registrou o estoque inicial. Importe sem estoque inicial e as quantidades ficarão negativas. Registre o estoque em /app/estoque/inicial antes de importar, ou envie skip_stock_warning=true para prosseguir mesmo assim.',
    }, { status: 409 });
  }

  if (systemRaw !== 'vmpay' && systemRaw !== 'vendpago') {
    return NextResponse.json({ error: 'invalid_system' }, { status: 400 });
  }
  const system = systemRaw as ImportSource;

  let mappings: MappingPair[] = [];
  try {
    mappings = JSON.parse(mappingsRaw ?? '[]') as MappingPair[];
  } catch {
    return NextResponse.json({ error: 'invalid_mappings_json' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = runParser(buffer, system);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'parse_failed', details: parsed.errors }, { status: 400 });
  }

  // Valida ownership dos machine_ids passados
  const machineIds = [...new Set(mappings.map(m => m.machine_id))];
  if (machineIds.length > 0) {
    const { data: owned } = await ctx.supabase
      .from('machines')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .in('id', machineIds);
    const ownedSet = new Set((owned ?? []).map(m => m.id));
    const unauthorized = machineIds.filter(id => !ownedSet.has(id));
    if (unauthorized.length > 0) {
      return NextResponse.json(
        { error: 'machines_not_owned', details: unauthorized },
        { status: 403 }
      );
    }
  }

  // Upsert dos aliases (substitui se já existe)
  if (mappings.length > 0) {
    const aliasRows = mappings.map(m => ({
      tenant_id: ctx.tenantId,
      machine_id: m.machine_id,
      external_name: m.external_name,
      source: system,
      created_by: ctx.userId,
    }));
    const { error: aliasErr } = await ctx.supabase
      .from('machine_aliases')
      .upsert(aliasRows, { onConflict: 'tenant_id,source,external_name' });
    if (aliasErr) {
      return NextResponse.json({ error: aliasErr.message }, { status: 500 });
    }
  }

  // Map external_name → machine_id (mappings vencem; aliases preexistentes ficam de fora)
  const mappingMap = new Map<string, string>(mappings.map(m => [m.external_name, m.machine_id]));

  // Para máquinas que vieram no arquivo mas NÃO estão no mapping, busca alias persistido
  const externalNames = parsed.summary.machines;
  const missing = externalNames.filter(n => !mappingMap.has(n));
  if (missing.length > 0) {
    const { data: existing } = await ctx.supabase
      .from('machine_aliases')
      .select('external_name, machine_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('source', system)
      .in('external_name', missing);
    for (const a of existing ?? []) {
      mappingMap.set(a.external_name as string, a.machine_id as string);
    }
  }

  // Monta as vendas a inserir
  const salesToInsert: Array<Record<string, unknown>> = [];
  const unmapped = new Set<string>();
  for (const s of parsed.sales) {
    const machineId = mappingMap.get(s.machine_code);
    if (!machineId) {
      unmapped.add(s.machine_code);
      continue;
    }
    salesToInsert.push({
      tenant_id: ctx.tenantId,
      machine_id: machineId,
      sale_date: s.sale_date,
      sale_time: s.sale_time,
      sale_datetime: s.sale_datetime,
      product_name: s.product_name,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total_price: s.total_price,
      payment_method: s.payment_method,
      raw_data: {
        product_code: s.product_code,
        barcode: s.barcode,
        category: s.category,
        import_source: system,
        external_machine_name: s.machine_code,
        ...s.raw_data,
      },
    });
  }

  // Insert em lotes (de-duplica via upsert no índice sale_datetime+product_name)
  // ignoreDuplicates + .select() => retorna apenas linhas EFETIVAMENTE inseridas (não as ignoradas)
  // Coletamos os retornos COMPLETOS pra gerar inventory_movements depois.
  let inserted = 0;
  let duplicates = 0;
  let errorBatches = 0;
  const insertedSales: Array<{ id: string; machine_id: string; product_name: string; sale_datetime: string; quantity: number }> = [];
  const batchSize = 500;
  for (let i = 0; i < salesToInsert.length; i += batchSize) {
    const batch = salesToInsert.slice(i, i + batchSize);
    const { data: returned, error } = await ctx.supabase
      .from('sales')
      .upsert(batch as never, {
        onConflict: 'tenant_id,machine_id,sale_datetime,product_name',
        ignoreDuplicates: true,
      })
      .select('id, machine_id, product_name, sale_datetime, quantity');
    if (error) {
      console.error('[import.confirm] batch error:', error);
      errorBatches++;
    } else {
      const newRows = returned?.length ?? 0;
      inserted += newRows;
      duplicates += batch.length - newRows;
      if (returned) insertedSales.push(...(returned as typeof insertedSales));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Auto-create products from imported sales (if they don't exist yet)
  // Uses fuzzy matching to avoid duplicates from name variations
  // ─────────────────────────────────────────────────────────────
  let fuzzyMatched = 0;
  if (insertedSales.length > 0) {
    const distinctProductNames = [...new Set(insertedSales.map(s => s.product_name).filter(Boolean))];
    if (distinctProductNames.length > 0) {
      const { data: existingProducts } = await ctx.supabase
        .from('products')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId);
      const existingSet = new Set((existingProducts ?? []).map(p => (p.name as string).toLowerCase()));
      const existingByName = new Map((existingProducts ?? []).map(p => [(p.name as string).toLowerCase(), p.id as string]));

      // Try fuzzy matching for names that don't have exact match
      const unmatched = distinctProductNames.filter(name => !existingSet.has(name.toLowerCase()));
      for (const name of unmatched) {
        const matchId = findBestProductMatch(name, (existingProducts ?? []) as Array<{ id: string; name: string }>);
        if (matchId) {
          existingByName.set(name.toLowerCase(), matchId);
          fuzzyMatched++;
        }
      }

      const newProducts = distinctProductNames
        .filter(name => !existingSet.has(name.toLowerCase()) && !existingByName.has(name.toLowerCase()))
        .map(name => ({
          tenant_id: ctx.tenantId,
          name,
          category: 'snack_beverage' as const,
          is_active: true,
        }));
      if (newProducts.length > 0) {
        const { data: createdProducts } = await ctx.supabase
          .from('products')
          .insert(newProducts)
          .select('id, name');
        if (createdProducts && createdProducts.length > 0) {
          const inventoryRows = createdProducts.map(p => ({
            tenant_id: ctx.tenantId,
            product_id: p.id,
            current_quantity: 0,
            minimum_quantity: 0,
          }));
          await ctx.supabase.from('inventory').upsert(inventoryRows, { onConflict: 'tenant_id,product_id' });
          for (const p of createdProducts) {
            existingByName.set((p.name as string).toLowerCase(), p.id as string);
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Auto-create machine_products: vincula cada produto à máquina
      // onde foi vendido (necessário para picklist e resolução futura)
      // ─────────────────────────────────────────────────────────────
      const machineProductPairs = new Map<string, number>(); // key -> sale_price
      for (const sale of salesToInsert) {
        const productId = existingByName.get((sale.product_name as string ?? '').toLowerCase());
        if (!productId) continue;
        const pairKey = `${sale.machine_id}::${productId}`;
        if (!machineProductPairs.has(pairKey)) {
          machineProductPairs.set(pairKey, Number(sale.unit_price) || 0);
        }
      }
      const mpToInsert = [...machineProductPairs.entries()].map(([key, price]) => {
        const [machine_id, product_id] = key.split('::');
        return {
          tenant_id: ctx.tenantId,
          machine_id,
          product_id,
          sale_price: price,
          cost_price: 0,
          max_capacity: 10,
          is_active: true,
        };
      });
      if (mpToInsert.length > 0) {
        await ctx.supabase
          .from('machine_products')
          .upsert(mpToInsert, { onConflict: 'machine_id,product_id', ignoreDuplicates: true });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Inventory movements: cada venda nova vira movement 'sale' negativo,
  // FILTRADO por cutoff (vendas anteriores a último initial/manual_adjust
  // já estão refletidas no snapshot — não geram movement).
  // ─────────────────────────────────────────────────────────────
  let movementsInserted = 0;
  let movementsSkipped = 0;
  let movementsUnresolvedProducts = 0;

  if (insertedSales.length > 0) {
    // Resolve product_id por product_name via machine_products (preciso) + products (fallback)
    const distinctNames = [...new Set(insertedSales.map(s => s.product_name).filter(Boolean))];
    const productIdByKey = new Map<string, string>(); // key = "machine_id::product_name_lower" OU "*::product_name_lower"

    if (distinctNames.length > 0) {
      // 1) machine_products (mais preciso — produto vinculado à máquina específica)
      const { data: mp } = await ctx.supabase
        .from('machine_products')
        .select('machine_id, product:products(id, name)')
        .eq('tenant_id', ctx.tenantId)
        .eq('is_active', true);
      for (const row of (mp ?? []) as Array<{ machine_id: string; product: { id: string; name: string } | { id: string; name: string }[] | null }>) {
        const prod = Array.isArray(row.product) ? row.product[0] : row.product;
        if (!prod) continue;
        productIdByKey.set(`${row.machine_id}::${prod.name.toLowerCase()}`, prod.id);
      }

      // 2) products do tenant (fallback por nome, case-insensitive)
      const { data: products } = await ctx.supabase
        .from('products')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId);
      for (const p of (products ?? []) as Array<{ id: string; name: string }>) {
        const key = `*::${p.name.toLowerCase()}`;
        if (!productIdByKey.has(key)) productIdByKey.set(key, p.id);
      }
    }

    const resolved = insertedSales.map(s => {
      const lowerName = (s.product_name ?? '').toLowerCase();
      const productId =
        productIdByKey.get(`${s.machine_id}::${lowerName}`) ||
        productIdByKey.get(`*::${lowerName}`) ||
        null;
      return productId
        ? { id: s.id, product_id: productId, machine_id: s.machine_id, quantity: Number(s.quantity) || 1, sale_datetime: s.sale_datetime }
        : null;
    });

    const resolvedSales = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
    movementsUnresolvedProducts = resolved.length - resolvedSales.length;

    if (resolvedSales.length > 0) {
      const result = await recordSalesMovementsFiltered(ctx.tenantId, resolvedSales);
      movementsInserted = result.inserted;
      movementsSkipped = result.skipped;
      if (result.error) {
        console.error('[import.confirm] movements error:', result.error);
      }
    }
  }

  // Registra a importação
  await ctx.supabase
    .from('imports')
    .insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      file_name: file.name,
      file_size: file.size,
      source_system: system,
      status: errorBatches === 0 ? 'completed' : 'partial',
      total_rows: parsed.summary.valid_records,
      processed_rows: inserted,
      error_rows: salesToInsert.length - inserted + unmapped.size,
      errors_detail: {
        unmapped: [...unmapped],
        error_batches: errorBatches,
        movements_inserted: movementsInserted,
        movements_skipped: movementsSkipped,
        movements_unresolved_products: movementsUnresolvedProducts,
      },
      completed_at: new Date().toISOString(),
    });

  return NextResponse.json({
    data: {
      imported: inserted,
      duplicates,
      total_in_file: parsed.summary.valid_records,
      aliases_saved: mappings.length,
      unmapped_machines: [...unmapped],
      date_range: parsed.summary.date_range,
      total_revenue: parsed.summary.total_revenue,
      format: parsed.summary.format,
      aggregated_transactions: parsed.summary.aggregated_transactions,
      fuzzy_matched: fuzzyMatched,
      stock: {
        movements_inserted: movementsInserted,
        movements_skipped: movementsSkipped,
        unresolved_products: movementsUnresolvedProducts,
      },
    },
  });
}
