import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';
import { createEntityPhotoUploadUrl } from '@/lib/storage/photos';

const schema = z.object({
  kind: z.enum(['machine', 'location']),
  entity_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 }); }

  // Confere ownership da entidade
  const table = body.kind === 'machine' ? 'machines' : 'locations';
  const { data } = await ctx.supabase
    .from(table)
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', body.entity_id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'entity_not_found' }, { status: 404 });

  try {
    const signed = await createEntityPhotoUploadUrl(ctx.tenantId, body.kind, body.entity_id);
    return NextResponse.json({ data: signed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
