import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const putSchema = z.object({
  machine_ids: z.array(z.string().uuid()),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from('machines')
    .select('id, name, code, status, location:locations(name)')
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * PUT substitui a lista de máquinas atribuídas: desatribui todas as outras
 * que estavam com esse restocker_id e atribui as passadas.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  // 1) desatribui as que não estão na nova lista
  const { error: unassignError } = await ctx.supabase
    .from('machines')
    .update({ restocker_id: null })
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', id)
    .not('id', 'in', `(${body.machine_ids.join(',') || '00000000-0000-0000-0000-000000000000'})`);

  if (unassignError) return NextResponse.json({ error: unassignError.message }, { status: 500 });

  // 2) atribui as novas
  if (body.machine_ids.length > 0) {
    const { error: assignError } = await ctx.supabase
      .from('machines')
      .update({ restocker_id: id })
      .eq('tenant_id', ctx.tenantId)
      .in('id', body.machine_ids);

    if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assigned: body.machine_ids.length });
}
