'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Play, Loader2, CheckCircle, AlertTriangle, Clock, Zap, Mail, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CronKind = 'billing' | 'alerts' | 'monthly_reports';

interface CronRun {
  id: string;
  kind: CronKind;
  triggered_by: 'schedule' | 'manual';
  started_at: string;
  finished_at: string | null;
  success: boolean | null;
  summary: Record<string, unknown> | null;
  errors: string[] | null;
  duration_ms: number | null;
  admin: { name: string; email: string } | null;
}

const KIND_META: Record<CronKind, { label: string; icon: typeof Zap; color: string }> = {
  billing:          { label: 'Cobrança',         icon: Zap,      color: 'bg-info-soft text-info' },
  alerts:           { label: 'Motor de alertas', icon: Mail,     color: 'bg-warning-soft text-warning' },
  monthly_reports:  { label: 'Relatório mensal', icon: Calendar, color: 'bg-success-soft text-success' },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function CobrancaPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<CronKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cron/history?limit=50');
      const json = await res.json();
      if (json.success) setRuns(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function trigger(kind: CronKind) {
    if (!confirm(`Executar manualmente o cron de ${KIND_META[kind].label.toLowerCase()}? Isso pode enviar emails reais aos clientes.`)) return;
    setRunning(kind);
    try {
      const res = await fetch('/api/admin/cron/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Cron de ${KIND_META[kind].label.toLowerCase()} executado`);
        load();
      } else {
        toast.error(json.error?.message ?? 'Falha');
        load();
      }
    } finally {
      setRunning(null);
    }
  }

  // Última execução de cada kind
  function lastRunOf(kind: CronKind): CronRun | undefined {
    return runs.find(r => r.kind === kind);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobrança e jobs automáticos</h1>
        <p className="text-muted-foreground">
          Estado dos crons que processam faturamento, alertas e relatórios mensais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(KIND_META) as CronKind[]).map(kind => {
          const meta = KIND_META[kind];
          const Icon = meta.icon;
          const last = lastRunOf(kind);
          const isRunning = running === kind;
          return (
            <Card key={kind}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => trigger(kind)}
                    disabled={isRunning || !!running}
                  >
                    {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
                {last ? (
                  <CardDescription className="mt-2">
                    Última execução {relativeTime(last.started_at)}
                    {last.success != null && (
                      <Badge className={`ml-2 ${last.success ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                        {last.success ? 'OK' : 'Falha'}
                      </Badge>
                    )}
                  </CardDescription>
                ) : (
                  <CardDescription className="mt-2 text-warning">Nunca executado</CardDescription>
                )}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {kind === 'billing' && 'Processa trials, gera faturas mensais, marca vencidas, manda lembretes e suspende inadimplentes.'}
                {kind === 'alerts' && 'Detecta máquinas paradas, quedas de venda, ruptura, contratos vencendo e dispara alertas + email.'}
                {kind === 'monthly_reports' && 'Gera PDF de relatório mensal por tenant e envia por email ao financeiro.'}
                {last?.duration_ms != null && (
                  <p className="mt-2 tabular-nums">Duração: {(last.duration_ms / 1000).toFixed(2)}s</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico (últimas 50)</CardTitle>
          <CardDescription>
            Toda execução, agendada ou manual, fica registrada em admin.cron_runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhuma execução registrada ainda. <br />
              Clique em ▶ acima ou aguarde o agendamento da Vercel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Quando</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map(r => {
                  const meta = KIND_META[r.kind];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatDateTime(r.started_at)}</TableCell>
                      <TableCell>
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.triggered_by === 'manual' ? (
                          <span title={r.admin?.email ?? ''}>Manual · {r.admin?.name ?? '—'}</span>
                        ) : (
                          <span className="text-text-tertiary">Agendado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.finished_at == null ? (
                          <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                            <Clock className="h-3 w-3 animate-pulse" />Em execução
                          </span>
                        ) : r.success ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle className="h-3 w-3" />OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-danger">
                            <AlertTriangle className="h-3 w-3" />Falha
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(2)}s` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {summarize(r)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function summarize(r: CronRun): string {
  if (r.errors && r.errors.length > 0) {
    return `${r.errors.length} erro(s): ${r.errors[0]}`;
  }
  if (!r.summary) return '—';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(r.summary)) {
    if (v == null || (typeof v === 'number' && v === 0)) continue;
    parts.push(`${k}: ${v}`);
  }
  return parts.slice(0, 4).join(' · ') || '—';
}
