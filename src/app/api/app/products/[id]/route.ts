import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  default_sale_price: z.number().positive().optional(),
  default_cost_price: z.number().positive().optional(),
  is_active: z.boolean().optional(),
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
  const supabase = await createClient();
  const { id } = await params;

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Produto não encontrado' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const validation = updateProductSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('products')
    .update(validation.data)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
