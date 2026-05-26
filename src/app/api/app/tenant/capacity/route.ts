import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single();
  return data?.tenant_id ?? null;
}

const patchSchema = z.object({
  active_restockers_count: z.number().int().min(0).max(100).optional(),
  avg_visits_per_day_per_restocker: z.number().min(0.5).max(20).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tenants')
    .select('active_restockers_count, avg_visits_per_day_per_restocker')
    .eq('id', tenantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.active_restockers_count !== undefined) {
    updates.active_restockers_count = parsed.data.active_restockers_count;
  }
  if (parsed.data.avg_visits_per_day_per_restocker !== undefined) {
    updates.avg_visits_per_day_per_restocker = parsed.data.avg_visits_per_day_per_restocker;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select('active_restockers_count, avg_visits_per_day_per_restocker')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
