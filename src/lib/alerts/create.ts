import { createClient as createSupabaseAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { sendAlertEmail } from '@/lib/email';
import type { AlertInput, AlertSettings, AlertSeverity } from './types';
import { SEVERITY_ORDER } from './types';

const supabaseAdmin: SupabaseClient = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CreateAlertResult {
  ok: boolean;
  created: boolean;
  alertId?: string;
  emailSent?: boolean;
  error?: string;
}

export async function createAlertIfNew(input: AlertInput, settings: AlertSettings): Promise<CreateAlertResult> {
  // Tenta inserir; índice único impede duplicata enquanto status = 'active'.
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .insert({
      tenant_id: input.tenant_id,
      machine_id: input.machine_id ?? null,
      alert_type: input.alert_type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      data: input.data ?? {},
      dedup_key: input.dedup_key,
      source: 'auto',
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = unique_violation → alerta já existe ativo, ok pular
    if (error.code === '23505') {
      return { ok: true, created: false };
    }
    return { ok: false, created: false, error: error.message };
  }

  const alertId = data.id;
  let emailSent = false;

  if (shouldNotifyByEmail(input.severity, settings)) {
    const recipients = await resolveRecipients(input.tenant_id, settings);
    if (recipients.length > 0) {
      const r = await sendAlertEmail({
        to: recipients,
        tenantId: input.tenant_id,
        alertType: input.alert_type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        machineId: input.machine_id ?? undefined,
      });
      if (r.ok) {
        emailSent = true;
        await supabaseAdmin
          .from('alerts')
          .update({ notified_email: true })
          .eq('id', alertId);
      }
    }
  }

  return { ok: true, created: true, alertId, emailSent };
}

function shouldNotifyByEmail(severity: AlertSeverity, settings: AlertSettings): boolean {
  if (!settings.email_enabled) return false;
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[settings.email_min_severity];
}

async function resolveRecipients(tenantId: string, settings: AlertSettings): Promise<string[]> {
  if (settings.email_recipients && settings.email_recipients.length > 0) {
    return settings.email_recipients;
  }
  const { data } = await supabaseAdmin
    .from('users')
    .select('email, notification_email')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  return (data ?? [])
    .filter(u => u.notification_email !== false && u.email)
    .map(u => u.email as string);
}

export async function getOrCreateAlertSettings(tenantId: string): Promise<AlertSettings> {
  const { data } = await supabaseAdmin
    .from('alert_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (data) return data as AlertSettings;

  const { data: created, error } = await supabaseAdmin
    .from('alert_settings')
    .insert({ tenant_id: tenantId })
    .select('*')
    .single();

  if (error) throw new Error(`Falha ao criar alert_settings: ${error.message}`);
  return created as AlertSettings;
}

export { supabaseAdmin };
