import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';
import { createSignedUploadUrl } from '@/lib/restocking';

const schema = z.object({
  visit_id: z.string().uuid(),
  kind: z.enum(['checkin', 'checkout']),
});

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  // Verifica que a visit pertence ao tenant antes de gerar URL
  const { data: visit } = await ctx.supabase
    .from('restocking_visits')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', body.visit_id)
    .maybeSingle();

  if (!visit) return NextResponse.json({ error: 'visit_not_found' }, { status: 404 });

  try {
    const signed = await createSignedUploadUrl(ctx.tenantId, body.visit_id, body.kind);
    return NextResponse.json({ data: signed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
