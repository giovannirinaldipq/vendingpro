import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const importSchema = z.object({
  catalog_ids: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * POST /api/app/products/import-catalog
 * Importa N produtos do catálogo público pro tenant atual.
 * Skipa duplicatas (match por barcode OU name+unit_size).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return NextResponse.json({ success: false, error: { code: 'NO_TENANT' } }, { status: 403 });
  }
  const tenantId = profile.tenant_id;

  const body = await req.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Carrega catalog items selecionados
  const { data: catalogItems, error: catalogErr } = await supabaseAdmin
    .from('product_catalog')
    .select('id, name, brand, unit_size, category, barcode, suggested_sale_price, suggested_cost_price')
    .in('id', parsed.data.catalog_ids)
    .eq('is_active', true);

  if (catalogErr) return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: catalogErr.message } }, { status: 500 });
  if (!catalogItems?.length) return NextResponse.json({ success: false, error: { code: 'EMPTY', message: 'Nenhum item válido' } }, { status: 400 });

  // Existing products do tenant pra dedupe
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('barcode, name, unit_size')
    .eq('tenant_id', tenantId);

  const existingBarcodes = new Set((existing ?? []).map(p => p.barcode).filter(Boolean) as string[]);
  const existingNameUnits = new Set((existing ?? []).map(p => `${p.name}|${p.unit_size ?? ''}`));

  const toInsert: Array<Record<string, unknown>> = [];
  let skipped = 0;
  for (const c of catalogItems) {
    const isDup =
      (c.barcode && existingBarcodes.has(c.barcode)) ||
      existingNameUnits.has(`${c.name}|${c.unit_size}`);
    if (isDup) { skipped++; continue; }
    toInsert.push({
      tenant_id: tenantId,
      name: c.name, // catalog name já é descritivo (ex: "Coca-Cola Lata", "Pringles Original")
      barcode: c.barcode ?? null,
      category: c.category,
      unit_size: c.unit_size,
      default_sale_price: c.suggested_sale_price,
      default_cost_price: c.suggested_cost_price,
      is_active: true,
    });
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(toInsert)
      .select('id');
    if (error) {
      return NextResponse.json({ success: false, error: { code: 'INSERT_ERROR', message: error.message } }, { status: 500 });
    }
    inserted = data?.length ?? 0;
  }

  return NextResponse.json({
    success: true,
    data: { imported: inserted, skipped, total_selected: catalogItems.length },
  });
}
