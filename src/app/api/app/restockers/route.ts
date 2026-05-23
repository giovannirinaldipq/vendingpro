import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const createSchema = z.object({
  name: z.string().min(2),
  document_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  vehicle_plate: z.string().optional(),
  vehicle_model: z.string().optional(),
  pin_code: z.string().regex(/^\d{4,6}$/).optional(),
});

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from('restockers')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

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
    .from('restockers')
    .insert({
      tenant_id: ctx.tenantId,
      name: body.name,
      document_number: body.document_number || null,
      phone: body.phone || null,
      email: body.email || null,
      vehicle_plate: body.vehicle_plate || null,
      vehicle_model: body.vehicle_model || null,
      pin_code: body.pin_code || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
