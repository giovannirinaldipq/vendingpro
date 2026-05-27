import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const machineSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  location_id: z.string().uuid().optional().nullable(),
  machine_type: z.enum(['snack_beverage', 'coffee', 'other']).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  total_slots: z.number().int().positive().optional(),
  slot_capacity: z.number().int().positive().optional(),
  telemetry_system: z.enum(['vmpay', 'vendpago', 'other']).optional(),
  telemetry_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'installing', 'deactivated']).default('active'),
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
  const status = searchParams.get('status') || '';

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: { machines: [], total: 0 },
    });
  }

  let query = supabase
    .from('machines')
    .select('*, location:locations(id, name)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .neq('status', 'deactivated')
    .order('name');

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      machines: data,
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

  const validation = machineSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Verificar limite de máquinas contratadas
  const [{ data: tenant }, { count: activeCount }] = await Promise.all([
    supabase.from('tenants').select('contracted_machines').eq('id', tenantId).single(),
    supabase.from('machines').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['active', 'inactive', 'maintenance', 'installing']),
  ]);

  const limit = tenant?.contracted_machines ?? 5;
  if ((activeCount ?? 0) >= limit) {
    return NextResponse.json(
      { success: false, error: { code: 'MACHINE_LIMIT', message: `Limite de ${limit} máquinas atingido. Entre em contato para ampliar seu plano.` } },
      { status: 403 }
    );
  }

  // Verificar se código já existe para este tenant (apenas máquinas ativas)
  const { data: existing } = await supabase
    .from('machines')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', validation.data.code)
    .eq('is_active', true)
    .single();

  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: 'DUPLICATE', message: 'Já existe uma máquina com este código' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('machines')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
      location_id: validation.data.location_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
