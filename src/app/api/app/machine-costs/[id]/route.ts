import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const patchSchema = z.object({
  cost_type: z.enum(['rent', 'telemetry', 'insurance', 'maintenance', 'other']).optional(),
  description: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(['monthly', 'yearly', 'one_time']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  let body: z.infer<typeof patchSchema>;
  try { body = patchSchema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 }); }

  const { data, error } = await ctx.supabase
    .from('machine_costs')
    .update({ ...body, updated_at: new Date().toISOString() })
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

  const { error } = await ctx.supabase
    .from('machine_costs')
    .update({ is_active: false })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
