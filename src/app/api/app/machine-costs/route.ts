import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const createSchema = z.object({
  machine_id: z.string().uuid(),
  cost_type: z.enum(['rent', 'telemetry', 'insurance', 'maintenance', 'other']),
  description: z.string().optional(),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'yearly', 'one_time']),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const machineId = req.nextUrl.searchParams.get('machine_id');

  let query = ctx.supabase
    .from('machine_costs')
    .select('*, machine:machines(name, code)')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (machineId) query = query.eq('machine_id', machineId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from('machine_costs')
    .insert({
      tenant_id: ctx.tenantId,
      machine_id: body.machine_id,
      cost_type: body.cost_type,
      description: body.description ?? null,
      amount: body.amount,
      frequency: body.frequency,
      start_date: body.start_date,
      end_date: body.end_date ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
