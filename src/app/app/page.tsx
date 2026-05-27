'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, TrendingUp, Monitor,
  Bell, ArrowRight, Activity, Upload, FileSpreadsheet, Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { KpiCard } from '@/components/ui/kpi-card';
import { KpiCardHero } from '@/components/ui/kpi-hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { cn } from '@/lib/utils';

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTodayPtBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

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
  last_sale_date: string | null;
}

interface FinanceSummary {
  period_days: number;
  total: { revenue: number; fees: number; cmv: number; fixed_costs: number; net_result: number; sales_count: number };
  machines_in_loss: number;
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

function firstName(full: string | null | undefined): string {
  if (!full) return 'você';
  return full.trim().split(/\s+/)[0];
}

export default function AppDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [topMachines, setTopMachines] = useState<RankingsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const [mRes, fRes, aRes, rRes, alRes, meRes] = await Promise.all([
          fetch('/api/app/dashboard').then(r => r.json()),
          fetch('/api/app/financeiro/summary?period_days=30').then(r => r.json()),
          fetch('/api/app/analytics?period=30d').then(r => r.json()),
          fetch('/api/app/rankings?period=30d&sort=revenue').then(r => r.json()),
          fetch('/api/app/alerts?status=active').then(r => r.json()),
          fetch('/api/me').then(r => r.json()),
        ]);
        if (aborted) return;
        setMetrics(mRes.data ?? mRes);
        setFinance(fRes.data ?? fRes);
        setAnalytics(aRes.data ?? aRes);
        setTopMachines(rRes.data ?? rRes);
        setAlerts((alRes.data?.alerts ?? alRes.alerts ?? []).slice(0, 5));
        if (meRes.success && meRes.data?.name) setUserName(meRes.data.name);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, []);

  return (
    <div>
      {/* Saudação personalizada — substitui PageHeader genérico */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          {greetingByHour()}, {firstName(userName)}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          <span className="capitalize">{formatTodayPtBR()}</span>
          {!loading && metrics && (
            <> · <span className="tabular-nums">{metrics.active_machines}</span> máquinas operando</>
          )}
        </p>
      </div>

      <OnboardingChecklist />

      {/* ───── Daily upload CTA — fluxo principal do operador ───
          Vira AMARELO se faz mais de 36h que não importa (você está
          olhando dado defasado). Vira VERMELHO se faz mais de 72h. */}
      {(() => {
        const lastDate = metrics?.last_sale_date ? new Date(metrics.last_sale_date + 'T00:00:00') : null;
        const hoursAgo = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 3600000) : null;
        const isStale = hoursAgo != null && hoursAgo >= 36;
        const isCritical = hoursAgo != null && hoursAgo >= 72;
        const tone = isCritical
          ? 'border-danger/40 bg-danger-soft/30'
          : isStale
            ? 'border-warning/40 bg-warning-soft/30'
            : 'border-brand-amber/30 bg-gradient-to-r from-brand-amber/[0.06] to-transparent';
        const iconBg = isCritical
          ? 'bg-danger/15'
          : isStale
            ? 'bg-warning/15'
            : 'bg-brand-amber/15';
        const iconColor = isCritical ? 'text-danger' : isStale ? 'text-warning' : 'text-brand-amber';
        return (
          <Card className={cn('mb-6', tone)}>
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconBg)}>
                <FileSpreadsheet className={cn('h-6 w-6', iconColor)} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-primary">
                  {isCritical
                    ? `Dados estão ${Math.floor(hoursAgo / 24)} dia(s) desatualizados`
                    : isStale
                      ? 'Subir planilha de hoje'
                      : 'Incluir dados do dia'}
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  {hoursAgo == null
                    ? 'Suba a planilha do VMPay/VendPago de ontem pra atualizar receita, estoque e sugestões em tempo real.'
                    : isCritical
                      ? `Última venda registrada em ${lastDate!.toLocaleDateString('pt-BR')}. Dashboard, sugestões e financeiro estão atrasados.`
                      : isStale
                        ? `Última importação foi há ${Math.floor(hoursAgo / 24) || 1} dia(s). Suba a planilha pra manter o dado atual.`
                        : `Última importação: ${lastDate!.toLocaleDateString('pt-BR')}. Mantenha o ritmo diário.`}
                </p>
              </div>
              <Link href="/app/importar" className={cn(buttonVariants({ size: 'lg' }), 'gap-2 shrink-0')}>
                <Upload className="h-4 w-4" />
                Subir planilha
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      {/* ───── ROW 1 — KPIs ────────────────────────────────
          Hero é Resultado Líquido (não receita bruta) — é o que diferencia
          VendingPro de telemetria pura. Receita bruta vira KPI secundário. */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {loading ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <div className="sm:col-span-2">
              <KpiCardHero
                label="Lucro líquido 30D"
                value={fmtBRL(finance?.total?.net_result ?? 0)}
                subtitle={
                  finance?.total
                    ? `Receita ${fmtBRL(finance.total.revenue)} − taxas ${fmtBRL(finance.total.fees)} − CMV ${fmtBRL(finance.total.cmv)} − fixos ${fmtBRL(finance.total.fixed_costs)}`
                    : 'vs período anterior'
                }
                icon={Wallet}
              />
            </div>
            <KpiCard
              label="Receita bruta"
              value={fmtBRL(metrics?.total_revenue ?? 0)}
              delta={metrics?.revenue_growth}
              deltaLabel="vs período anterior"
              icon={DollarSign}
            />
            <KpiCard
              label="Vendas"
              value={fmtInt(metrics?.total_sales ?? 0)}
              delta={metrics?.sales_growth}
              deltaLabel="vs período anterior"
              icon={ShoppingCart}
            />
          </>
        )}
      </div>

      {/* Banner pedagógico explicando a diferença — única vez que aparece
          (some quando o usuário tem 10+ vendas, já passou da fase de descoberta) */}
      {!loading && finance && metrics && metrics.total_sales > 0 && metrics.total_sales < 200 && (
        <div className="mb-4 rounded-lg border border-info/30 bg-info-soft/30 p-3 text-xs text-text-secondary flex gap-3 items-start">
          <TrendingUp className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div>
            <strong className="text-text-primary">Por que líquido em destaque?</strong>{' '}
            Telemetria mostra só a receita bruta. O VendingPro desconta as taxas reais por método de pagamento e o CMV de cada produto, e te entrega o lucro real.
            {(finance.machines_in_loss ?? 0) > 0 && (
              <> Hoje você tem <span className="font-semibold text-warning">{finance.machines_in_loss} máquina(s) no prejuízo</span> — veja em <Link href="/app/financeiro" className="text-brand-navy hover:underline">Financeiro</Link>.</>
            )}
          </div>
        </div>
      )}

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
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
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
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#fbbf24', stroke: 'var(--surface-card)', strokeWidth: 2 }}
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
          <EmptyStateV2
            illustration="no-alerts"
            positive
            title="Tudo respirando bem por aqui ✦"
            description="Nenhum alerta ativo no momento. O motor checa a cada 15 minutos."
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
            <div className="col-span-1 self-center">
              {/* #1 ganha selo amber sutil — top performer */}
              {i === 0 ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-amber/20 text-[11px] font-mono font-bold tabular-nums text-[#92400e] dark:text-brand-amber">
                  1
                </span>
              ) : (
                <span className="font-mono text-sm tabular-nums text-text-tertiary">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="col-span-5 min-w-0">
              <Link href={`/app/maquinas/${m.id}`} className="text-sm font-medium text-text-primary hover:text-brand-navy truncate block">
                {m.name}
              </Link>
              {m.location && (
                <div className="text-xs text-text-tertiary truncate">{m.location}</div>
              )}
            </div>
            <div className="col-span-3 text-right font-mono text-sm tabular-nums text-text-secondary self-center">{fmtInt(m.sales ?? 0)}</div>
            <div className="col-span-3 text-right self-center">
              <div className="font-mono text-sm font-medium tabular-nums text-text-primary">{fmtBRLFull(m.revenue ?? 0)}</div>
              {max > 0 && (
                <div className="mt-1 h-1 rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className={i === 0 ? 'h-full bg-brand-amber' : 'h-full bg-brand-navy/60'}
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
