import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const createSchema = z.object({
  product_id: z.string().uuid(),
  sale_price: z.number().min(0),
  cost_price: z.number().min(0).optional().nullable(),
  slot_code: z.string().max(20).optional().nullable(),
  is_active: z.boolean().default(true),
});

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  return profile?.tenant_id ?? null;
}

async function machineBelongsToTenant(machineId: string, tenantId: string) {
  const { data } = await supabaseAdmin
    .from('machines').select('id').eq('id', machineId).eq('tenant_id', tenantId).maybeSingle();
  return !!data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) return NextResponse.json({ success: true, data: { items: [] } });
  if (!(await machineBelongsToTenant(machineId, tenantId))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('machine_products')
    .select('id, sale_price, cost_price, slot_code, is_active, created_at, updated_at, product:products(id, name, category, unit_size, default_sale_price, default_cost_price)')
    .eq('machine_id', machineId)
    .eq('tenant_id', tenantId)
    .order('slot_code', { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { items: data ?? [] } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário sem empresa' } },
      { status: 403 }
    );
  }
  if (!(await machineBelongsToTenant(machineId, tenantId))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const validation = createSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Confirma que o produto pertence ao tenant
  const { data: product } = await supabaseAdmin
    .from('products').select('id, tenant_id').eq('id', validation.data.product_id).maybeSingle();
  if (!product || product.tenant_id !== tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PRODUCT', message: 'Produto inválido' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('machine_products')
    .insert({
      ...validation.data,
      machine_id: machineId,
      tenant_id: tenantId,
    })
    .select('id, sale_price, cost_price, slot_code, is_active, product:products(id, name, category, unit_size)')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Este produto já está cadastrado nesta máquina' } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
