-- ============================================================
-- Histórico de execuções dos cron jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS admin.cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('billing', 'alerts', 'monthly_reports')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('schedule', 'manual')),
  triggered_by_admin UUID REFERENCES admin.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  success BOOLEAN,
  summary JSONB,
  errors JSONB,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_kind_recent
  ON admin.cron_runs(kind, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_recent
  ON admin.cron_runs(started_at DESC);

COMMENT ON TABLE admin.cron_runs IS
  'Log de execuções dos cron jobs (billing, alerts, monthly_reports). Usado pela página /admin/cobranca pra mostrar status.';
