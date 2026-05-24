'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, TrendingUp, Monitor,
  AlertTriangle, Bell, ArrowRight, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/shell/PageHeader';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { cn } from '@/lib/utils';

interface DashboardMetrics {
  total_revenue: number;
  revenue_growth: number;
  total_sales: number;
  sales_growth: number;
  average_ticket: number;
  ticket_growth: number;
  active_machines: number;
  machines_with_issues: number;
  pending_alerts: number;
}

interface AnalyticsResponse {
  daily_sales: Array<{ date: string; revenue: number; sales: number }>;
}

interface RankingsResponse {
  machines: Array<{
    id: string;
    name: string;
    code: string;
    location?: string | null;
    revenue: number;
    sales: number;
    ticket?: number;
    health_score?: number;
  }>;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  created_at: string;
  machine?: { name: string; code: string } | null;
}

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRLFull = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

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

const SEVERITY_TONE = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
} as const;

const SEVERITY_LABEL = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export default function AppDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [topMachines, setTopMachines] = useState<RankingsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const [mRes, aRes, rRes, alRes] = await Promise.all([
          fetch('/api/app/dashboard').then(r => r.json()),
          fetch('/api/app/analytics?period=30d').then(r => r.json()),
          fetch('/api/app/rankings?period=30d&sort=revenue').then(r => r.json()),
          fetch('/api/app/alerts?status=active').then(r => r.json()),
        ]);
        if (aborted) return;
        setMetrics(mRes.data ?? mRes);
        setAnalytics(aRes.data ?? aRes);
        setTopMachines(rRes.data ?? rRes);
        setAlerts((alRes.data?.alerts ?? alRes.alerts ?? []).slice(0, 5));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação"
      />

      <OnboardingChecklist />

      {/* ───── ROW 1 — KPIs ──────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {loading ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <KpiCard
              label="Receita 30d"
              value={fmtBRL(metrics?.total_revenue ?? 0)}
              delta={metrics?.revenue_growth}
              deltaLabel="vs período anterior"
              icon={DollarSign}
              tone="primary"
            />
            <KpiCard
              label="Vendas"
              value={fmtInt(metrics?.total_sales ?? 0)}
              delta={metrics?.sales_growth}
              deltaLabel="vs período anterior"
              icon={ShoppingCart}
            />
            <KpiCard
              label="Ticket médio"
              value={fmtBRLFull(metrics?.average_ticket ?? 0)}
              delta={metrics?.ticket_growth}
              deltaLabel="vs período anterior"
              icon={TrendingUp}
            />
            <KpiCard
              label="Máquinas no ar"
              value={metrics?.active_machines ?? 0}
              hint={(metrics?.machines_with_issues ?? 0) > 0
                ? `${metrics?.machines_with_issues} com problemas`
                : 'todas operacionais'}
              icon={Monitor}
            />
          </>
        )}
      </div>

      {/* ───── ROW 2 — Chart + Alertas ───────────────────── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12 mb-4">
        <div className="lg:col-span-8">
          {loading ? <ChartSkeleton /> : <RevenueChart data={analytics?.daily_sales ?? []} />}
        </div>
        <div className="lg:col-span-4">
          <ActiveAlertsCard alerts={alerts} loading={loading} />
        </div>
      </div>

      {/* ───── ROW 3 — Top máquinas ──────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top 5 máquinas — últimos 30 dias</CardTitle>
              <p className="mt-0.5 text-sm text-text-secondary">Ordenado por receita bruta</p>
            </div>
            <Link
              href="/app/rankings"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : !topMachines?.machines?.length ? (
            <EmptyState
              icon={Monitor}
              title="Sem vendas no período"
              description="Importe uma planilha do VM PAY ou VendPago para ver suas máquinas em ação."
              action={
                <Link href="/app/importar">
                  <Button size="sm">Importar planilha</Button>
                </Link>
              }
            />
          ) : (
            <TopMachinesTable machines={topMachines.machines.slice(0, 5)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: Array<{ date: string; revenue: number; sales: number }> }) {
  const hasData = data && data.length > 0;
  const totalRevenue = data?.reduce((s, d) => s + d.revenue, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="border-b border-border-default">
        <div className="flex items-end justify-between gap-4">
          <div>
            <CardTitle>Receita diária</CardTitle>
            <p className="mt-0.5 text-sm text-text-secondary">Últimos 30 dias</p>
          </div>
          {hasData && (
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-text-tertiary">Total</div>
              <div className="font-mono-num text-lg font-medium text-text-primary">{fmtBRLFull(totalRevenue)}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!hasData ? (
          <EmptyState
            icon={Activity}
            title="Sem dados no período"
            description="Importe vendas para ver o gráfico."
          />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-navy)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--brand-navy)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)',
                    fontSize: 12,
                    padding: '8px 12px',
                  }}
                  labelFormatter={(v) => new Date(String(v)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  formatter={(v) => [fmtBRLFull(Number(v)), 'Receita']}
                  cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--brand-navy)"
                  strokeWidth={2}
                  fill="url(#revFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--brand-navy)', stroke: 'var(--surface-card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveAlertsCard({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-border-default">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
            Alertas ativos
          </CardTitle>
          {alerts.length > 0 && (
            <Pill tone="danger" size="sm">{alerts.length}</Pill>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 flex-1">
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse bg-surface-subtle rounded" />
                <div className="h-2.5 w-1/3 animate-pulse bg-surface-subtle rounded" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum alerta ativo"
            description="Tudo operacional por aqui."
            className="py-12"
          />
        ) : (
          <ul className="divide-y divide-border-default">
            {alerts.map(a => (
              <li key={a.id}>
                <Link
                  href="/app/alertas"
                  className="block px-6 py-3 hover:bg-surface-subtle/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Pill tone={SEVERITY_TONE[a.severity]} size="sm" dot className="shrink-0 mt-0.5">
                      {SEVERITY_LABEL[a.severity]}
                    </Pill>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{relativeTime(a.created_at)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TopMachinesTable({ machines }: { machines: RankingsResponse['machines'] }) {
  const max = Math.max(...machines.map(m => m.revenue ?? 0));
  return (
    <div>
      <div className="grid grid-cols-12 gap-3 px-6 py-2 border-b border-border-default bg-surface-subtle/40 text-[10px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Máquina</div>
        <div className="col-span-3 text-right">Vendas</div>
        <div className="col-span-3 text-right">Receita</div>
      </div>
      <ul className="divide-y divide-border-default">
        {machines.map((m, i) => (
          <li key={m.id} className="grid grid-cols-12 gap-3 px-6 py-3 hover:bg-surface-subtle/60 transition-colors">
            <div className="col-span-1 font-mono-num text-sm text-text-tertiary">{(i + 1).toString().padStart(2, '0')}</div>
            <div className="col-span-5 min-w-0">
              <Link href={`/app/maquinas/${m.id}`} className="text-sm font-medium text-text-primary hover:text-brand-navy truncate block">
                {m.name}
              </Link>
              {m.location && (
                <div className="text-xs text-text-tertiary truncate">{m.location}</div>
              )}
            </div>
            <div className="col-span-3 text-right font-mono-num text-sm text-text-secondary self-center">{fmtInt(m.sales ?? 0)}</div>
            <div className="col-span-3 text-right self-center">
              <div className="font-mono-num text-sm font-medium text-text-primary">{fmtBRLFull(m.revenue ?? 0)}</div>
              {max > 0 && (
                <div className="mt-1 h-1 rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full bg-brand-navy"
                    style={{ width: `${((m.revenue ?? 0) / max) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
