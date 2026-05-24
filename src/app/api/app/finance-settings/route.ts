import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';
import { createClient as createAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const voucherFeeSchema = z.object({
  label: z.string().min(1).max(60),
  percent: z.number().min(0).max(30),
});

const schema = z.object({
  card_fee_percent: z.number().min(0).max(30).optional(),
  debit_card_fee_percent: z.number().min(0).max(30).optional(),
  pix_fee_percent: z.number().min(0).max(10).optional(),
  cash_fee_percent: z.number().min(0).max(10).optional(),
  meal_voucher_fee_percent: z.number().min(0).max(30).optional(),
  other_voucher_fees: z.array(voucherFeeSchema).max(20).optional(),
  loss_alert_enabled: z.boolean().optional(),
  loss_alert_period_days: z.number().int().min(7).max(90).optional(),
});

async function ensureRow(tenantId: string) {
  await supabaseAdmin.from('finance_settings').upsert({ tenant_id: tenantId }, { onConflict: 'tenant_id' });
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await ensureRow(ctx.tenantId);
  const { data } = await supabaseAdmin
    .from('finance_settings')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .single();
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 }); }

  await ensureRow(ctx.tenantId);
  const { data, error } = await supabaseAdmin
    .from('finance_settings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
