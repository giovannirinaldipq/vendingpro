import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  return data?.tenant_id ?? null;
}

const EXAMPLE_NAME = 'Coca-Cola Lata';

const NAME_VARIANTS = ['nome', 'name', 'produto', 'descricao', 'descrição'];
const CATEGORY_VARIANTS = ['categoria', 'category', 'tipo'];
const SIZE_VARIANTS = ['tamanho', 'gramatura', 'unit_size', 'size', 'volume'];
const SALE_VARIANTS = ['preco venda', 'preço venda', 'preco_venda', 'sale_price', 'venda', 'preco venda (r$)', 'preço venda (r$)'];
const COST_VARIANTS = ['preco custo', 'preço custo', 'preco_custo', 'cost_price', 'custo', 'preco custo (r$)', 'preço custo (r$)'];

function findCol(headers: string[], variants: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().trim());
  for (const v of variants) {
    const idx = normalized.indexOf(v);
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: { code: 'NO_FILE', message: 'Arquivo obrigatorio' } }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  let rows: string[][];
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'PARSE_ERROR', message: 'Nao foi possivel ler o arquivo' } }, { status: 400 });
  }

  if (rows.length < 2) {
    return NextResponse.json({ success: false, error: { code: 'EMPTY', message: 'Planilha vazia ou sem dados' } }, { status: 400 });
  }

  const headerRow = rows[0].map(c => String(c ?? ''));
  const nameCol = findCol(headerRow, NAME_VARIANTS);
  if (nameCol === -1) {
    return NextResponse.json({ success: false, error: { code: 'NO_NAME_COL', message: 'Coluna "Nome" nao encontrada no cabecalho' } }, { status: 400 });
  }

  const catCol = findCol(headerRow, CATEGORY_VARIANTS);
  const sizeCol = findCol(headerRow, SIZE_VARIANTS);
  const saleCol = findCol(headerRow, SALE_VARIANTS);
  const costCol = findCol(headerRow, COST_VARIANTS);

  // Existing products for dedupe
  const { data: existing } = await supabase
    .from('products')
    .select('name')
    .eq('tenant_id', tenantId);
  const existingNames = new Set((existing ?? []).map(p => p.name.toLowerCase()));

  const toInsert: Array<Record<string, unknown>> = [];
  let skippedDuplicates = 0;
  let skippedExample = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c)) continue;

    const name = String(row[nameCol] ?? '').trim();
    if (!name || name.length < 2) {
      errors.push(`Linha ${i + 1}: nome vazio ou muito curto`);
      continue;
    }

    // Skip example row
    if (i === 1 && name.toLowerCase() === EXAMPLE_NAME.toLowerCase()) {
      skippedExample++;
      continue;
    }

    // Dedupe
    if (existingNames.has(name.toLowerCase())) {
      skippedDuplicates++;
      continue;
    }

    const category = catCol >= 0 ? String(row[catCol] ?? '').trim() || undefined : undefined;
    const unitSize = sizeCol >= 0 ? String(row[sizeCol] ?? '').trim() || undefined : undefined;
    const salePrice = saleCol >= 0 ? parseFloat(String(row[saleCol] ?? '')) : NaN;
    const costPrice = costCol >= 0 ? parseFloat(String(row[costCol] ?? '')) : NaN;

    toInsert.push({
      tenant_id: tenantId,
      name,
      category,
      unit_size: unitSize,
      default_sale_price: isFinite(salePrice) && salePrice > 0 ? salePrice : null,
      default_cost_price: isFinite(costPrice) && costPrice > 0 ? costPrice : null,
      is_active: true,
    });

    existingNames.add(name.toLowerCase());
  }

  let imported = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('products')
      .insert(toInsert)
      .select('id');

    if (error) {
      return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }
    imported = data?.length ?? 0;

    // Auto-create inventory entries
    if (data && data.length > 0) {
      const inventoryRows = data.map(p => ({
        tenant_id: tenantId,
        product_id: p.id,
        current_quantity: 0,
        minimum_quantity: 0,
      }));
      await supabase.from('inventory').upsert(inventoryRows, { onConflict: 'tenant_id,product_id' });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      imported,
      skipped_duplicates: skippedDuplicates,
      skipped_example: skippedExample,
      errors,
      total_rows: rows.length - 1,
    },
  });
}
