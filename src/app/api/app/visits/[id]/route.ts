import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const patchSchema = z.object({
  checkin_photo_url: z.string().url().optional(),
  checkout_photo_url: z.string().url().optional(),
  notes: z.string().optional(),
});

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

  const { data, error } = await ctx.supabase
    .from('restocking_visits')
    .update(body)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: visit, error } = await ctx.supabase
    .from('restocking_visits')
    .select(`
      *,
      machine:machines(id, name, code, location:locations(name, latitude, longitude)),
      restocker:restockers(id, name, phone)
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!visit) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: items } = await ctx.supabase
    .from('restocking_items')
    .select('*, product:products(name)')
    .eq('visit_id', id);

  return NextResponse.json({ data: { ...visit, items: items ?? [] } });
}
