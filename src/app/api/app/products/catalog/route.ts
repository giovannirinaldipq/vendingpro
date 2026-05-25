import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/app/products/catalog
 * Lista o catálogo público de produtos (read-only). Marca quais SKUs já
 * estão importados no tenant atual via `already_imported: true`.
 *
 * Query params:
 *  - search: filtro por nome/marca (case-insensitive)
 *  - category: filtra por categoria
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return NextResponse.json({ success: false, error: { code: 'NO_TENANT' } }, { status: 403 });
  }
  const tenantId = profile.tenant_id;

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? '';
  const category = req.nextUrl.searchParams.get('category')?.trim() ?? '';

  let q = supabaseAdmin
    .from('product_catalog')
    .select('id, name, brand, unit_size, category, barcode, suggested_sale_price, suggested_cost_price, popularity_rank')
    .eq('is_active', true)
    .order('popularity_rank', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(500);

  if (category) q = q.eq('category', category);
  if (search) q = q.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);

  const { data: catalogItems, error } = await q;
  if (error) return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

  // Marca quais já estão importados (match por barcode OU por name+unit_size).
  // Set construído a partir dos products do tenant; checagem feita logo abaixo.
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('id, name, barcode, unit_size')
    .eq('tenant_id', tenantId);

  const importedBarcodes = new Set((existing ?? []).map(p => p.barcode).filter(Boolean) as string[]);
  const importedNameUnits = new Set((existing ?? []).map(p => `${p.name}|${p.unit_size ?? ''}`));

  const enriched = (catalogItems ?? []).map(c => ({
    ...c,
    already_imported:
      (c.barcode && importedBarcodes.has(c.barcode)) ||
      importedNameUnits.has(`${c.name}|${c.unit_size}`),
  }));

  // Lista de categorias disponíveis (pra filtro)
  const { data: categoriesRaw } = await supabaseAdmin
    .from('product_catalog')
    .select('category')
    .eq('is_active', true);
  const categories = [...new Set((categoriesRaw ?? []).map(c => c.category))].sort();

  return NextResponse.json({
    success: true,
    data: {
      items: enriched,
      total: enriched.length,
      categories,
    },
  });
}
