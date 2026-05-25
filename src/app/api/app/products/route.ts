import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(2),
  /** @deprecated — mantido por compat de parser; UI não envia mais */
  barcode: z.string().optional(),
  category: z.string().max(60).optional(),
  unit_size: z.string().max(20).optional(),
  default_sale_price: z.number().positive().optional(),
  default_cost_price: z.number().positive().optional(),
  is_active: z.boolean().default(true),
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

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: { products: [], total: 0 },
    });
  }

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('name');

  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      products: data,
      total: count || 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const validation = productSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
