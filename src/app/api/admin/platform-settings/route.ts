import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

const updateSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  company_cnpj: z.string().max(20).optional().nullable(),
  company_address: z.string().max(500).optional().nullable(),
  company_email: z.string().email().optional().nullable(),
  company_phone: z.string().max(30).optional().nullable(),
  default_trial_days: z.number().int().min(0).max(365).optional(),
  billing_reminder_days_before: z.number().int().min(0).max(30).optional(),
  billing_first_overdue_reminder_days: z.number().int().min(0).max(30).optional(),
  billing_suspension_days: z.number().int().min(0).max(180).optional(),
  billing_cancellation_days: z.number().int().min(0).max(365).optional(),
});

function readStatus() {
  // Status read-only de integrações configuradas via env
  return {
    asaas: {
      configured: !!process.env.ASAAS_API_KEY,
      env: process.env.ASAAS_ENV ?? null,
      webhook_configured: !!process.env.ASAAS_WEBHOOK_TOKEN,
    },
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? null,
    },
    twilio_whatsapp: {
      configured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_WHATSAPP_FROM ?? null,
    },
    cron: {
      configured: !!process.env.CRON_SECRET,
    },
    supabase: {
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      settings: data,
      integrations_status: readStatus(),
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('platform_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: auth.admin.id })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'platform_settings.updated',
    entityType: 'admin.platform_settings',
    entityId: '1',
    newValues: parsed.data as unknown as Record<string, unknown>,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ success: true, data });
}
