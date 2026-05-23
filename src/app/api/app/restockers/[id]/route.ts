import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  document_number: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  vehicle_plate: z.string().nullable().optional(),
  vehicle_model: z.string().nullable().optional(),
  pin_code: z.string().regex(/^\d{4,6}$/).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from('restockers')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  const update = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  );

  const { data, error } = await ctx.supabase
    .from('restockers')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  // Soft delete: desativa
  const { error } = await ctx.supabase
    .from('restockers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
