import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';

const schema = z.object({
  photo_url: z.string().url().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    product_name: z.string().optional(),
    quantity: z.number().int().min(1),
    suggested_quantity: z.number().int().optional(),
  })).optional(),
});

const ANOMALOUS_MAX_MINUTES = 60;
const ANOMALOUS_MIN_MINUTES = 1;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  // Busca a visit
  const { data: visit, error: vErr } = await ctx.supabase
    .from('restocking_visits')
    .select('id, checkin_at, checkout_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  if (!visit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (visit.checkout_at) return NextResponse.json({ error: 'already_checked_out' }, { status: 400 });

  const checkoutAt = new Date();
  const checkinAt = new Date(visit.checkin_at);
  const durationMinutes = Math.round((checkoutAt.getTime() - checkinAt.getTime()) / 60000);
  const durationValid = durationMinutes >= ANOMALOUS_MIN_MINUTES && durationMinutes <= ANOMALOUS_MAX_MINUTES;

  // Atualiza visit
  const { error: updErr } = await ctx.supabase
    .from('restocking_visits')
    .update({
      checkout_at: checkoutAt.toISOString(),
      checkout_photo_url: body.photo_url ?? null,
      duration_minutes: durationMinutes,
      is_duration_valid: durationValid,
      notes: body.notes ?? null,
    })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Insere items repostos
  if (body.items && body.items.length > 0) {
    const rows = body.items.map(item => ({
      visit_id: id,
      tenant_id: ctx.tenantId,
      product_id: item.product_id,
      product_name: item.product_name ?? null,
      quantity: item.quantity,
      suggested_quantity: item.suggested_quantity ?? null,
    }));
    const { error: itemsErr } = await ctx.supabase
      .from('restocking_items')
      .insert(rows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({
    data: { duration_minutes: durationMinutes, is_duration_valid: durationValid },
  });
}
