import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogInput {
  adminUserId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(input: LogInput): Promise<void> {
  try {
    await supabaseAdmin
      .schema('admin')
      .from('audit_logs')
      .insert({
        admin_user_id: input.adminUserId,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        old_values: input.oldValues ?? null,
        new_values: input.newValues ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      });
  } catch (e) {
    console.error('[audit] failed to write log:', e);
  }
}

export function extractRequestMeta(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  const userAgent = req.headers.get('user-agent') || null;
  return { ipAddress, userAgent };
}
