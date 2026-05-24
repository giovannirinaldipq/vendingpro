import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateSchema = z.object({
  sale_price: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional().nullable(),
  slot_code: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional(),
});

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  return profile?.tenant_id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mp_id: string }> }
) {
  const { id: machineId, mp_id } = await params;
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário sem empresa' } },
      { status: 403 }
    );
  }

  const body = await req.json();
  const validation = updateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('machine_products')
    .update(validation.data)
    .eq('id', mp_id)
    .eq('machine_id', machineId)
    .eq('tenant_id', tenantId)
    .select('id, sale_price, cost_price, slot_code, is_active')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Registro não encontrado' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mp_id: string }> }
) {
  const { id: machineId, mp_id } = await params;
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário sem empresa' } },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from('machine_products')
    .delete()
    .eq('id', mp_id)
    .eq('machine_id', machineId)
    .eq('tenant_id', tenantId);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
