import { supabaseAdmin } from '@/lib/supabase/admin';

export type CronKind = 'billing' | 'alerts' | 'monthly_reports';
export type Trigger = 'schedule' | 'manual';

export interface StartedRun {
  id: string;
  startedAt: Date;
}

export async function startCronRun(
  kind: CronKind,
  triggeredBy: Trigger,
  adminUserId?: string
): Promise<StartedRun | null> {
  const { data, error } = await supabaseAdmin
    .schema('admin')
    .from('cron_runs')
    .insert({
      kind,
      triggered_by: triggeredBy,
      triggered_by_admin: adminUserId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[cron-log] failed to start run:', error);
    return null;
  }
  return { id: data.id, startedAt: new Date() };
}

export async function finishCronRun(
  run: StartedRun | null,
  outcome: { success: boolean; summary?: Record<string, unknown>; errors?: unknown[] }
): Promise<void> {
  if (!run) return;
  const now = new Date();
  const { error } = await supabaseAdmin
    .schema('admin')
    .from('cron_runs')
    .update({
      finished_at: now.toISOString(),
      success: outcome.success,
      summary: outcome.summary ?? null,
      errors: outcome.errors && outcome.errors.length > 0 ? outcome.errors : null,
      duration_ms: now.getTime() - run.startedAt.getTime(),
    })
    .eq('id', run.id);

  if (error) console.error('[cron-log] failed to finish run:', error);
}
