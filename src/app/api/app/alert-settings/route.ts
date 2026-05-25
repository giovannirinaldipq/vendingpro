import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateAlertSettings } from '@/lib/alerts';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function getTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  return data?.tenant_id ?? null;
}

const updateSchema = z.object({
  machine_stopped_hours: z.number().int().min(1).max(240).optional(),
  sales_drop_threshold_percent: z.number().min(1).max(100).optional(),
  sales_drop_period_days: z.number().int().min(2).max(90).optional(),
  rupture_estimate_days: z.number().int().min(1).max(30).optional(),
  product_stale_days: z.number().int().min(3).max(180).optional(),
  contract_expiring_days: z.number().int().min(7).max(180).optional(),
  email_enabled: z.boolean().optional(),
  email_min_severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  email_recipients: z.array(z.string().email()).nullable().optional(),
});

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const settings = await getOrCreateAlertSettings(tenantId);
    return NextResponse.json({ data: settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  await getOrCreateAlertSettings(tenantId); // garante linha existente

  const { data, error } = await supabaseAdmin
    .from('alert_settings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
