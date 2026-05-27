'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCardHero } from '@/components/ui/kpi-hero';
import { Calendar, Monitor, Loader2, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Heatmap } from '@/components/charts/heatmap';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import { PaymentBreakdownCard } from '@/components/analytics/payment-breakdown-card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const CHART_PRIMARY = '#1e40af';   // brand-navy-700
const CHART_ACCENT  = '#fbbf24';   // brand-amber-400
const CHART_GRID    = 'currentColor';

interface AnalyticsData {
  heatmap: Array<{ day: number; hour: number; value: number }>;
  daily_sales: Array<{ date: string; revenue: number; count: number }>;
  weekday_sales: Array<{ day: string; revenue: number; count: number }>;
  top_products: Array<{ name: string; revenue: number; count: number }>;
  summary: {
    total_revenue: number;
    total_sales: number;
    average_ticket: number;
  };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [machineId, setMachineId] = useState('all');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    fetch('/api/app/machines')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setMachines(result.data.machines);
        }
      });
  }, []);

  useEffect(() => {
    if (period === 'custom' && !appliedRange) return;
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (machineId !== 'all') {
      params.set('machine_id', machineId);
    }
    if (period === 'custom' && appliedRange) {
      params.set('start_date', appliedRange.start);
      params.set('end_date', appliedRange.end);
    }

    fetch(`/api/app/analytics?${params}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        }
      })
      .finally(() => setLoading(false));
  }, [period, machineId, appliedRange]);

  function applyCustomRange() {
    if (customStart && customEnd) {
      setAppliedRange({ start: customStart, end: customEnd });
    }
  }

  function handlePeriodChange(v: string | null) {
    if (!v) return;
    setPeriod(v);
    if (v !== 'custom') {
      setAppliedRange(null);
    }
  }

  const hasData = data && (data.heatmap.length > 0 || data.daily_sales.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Análise detalhada das suas vendas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[170px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue>
                {period === '7d' ? 'Últimos 7 dias'
                 : period === '30d' ? 'Últimos 30 dias'
                 : period === '90d' ? 'Últimos 90 dias'
                 : period === '180d' ? 'Últimos 180 dias'
                 : period === '365d' ? 'Último ano'
                 : period === 'current_month' ? 'Mês atual'
                 : period === 'previous_month' ? 'Mês anterior'
                 : period === 'custom' ? 'Personalizado'
                 : period === 'all' ? 'Todo o histórico'
                 : period}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="current_month">Mês atual</SelectItem>
              <SelectItem value="previous_month">Mês anterior</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="180d">Últimos 180 dias</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
              <SelectItem value="all">Todo o histórico</SelectItem>
              <SelectItem value="custom">Personalizado...</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-[145px] h-9"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-[145px] h-9"
              />
              <Button size="sm" onClick={applyCustomRange} disabled={!customStart || !customEnd}>
                Aplicar
              </Button>
            </div>
          )}
          <Select value={machineId} onValueChange={(v) => v && setMachineId(v)}>
            <SelectTrigger className="w-[220px]">
              <Monitor className="mr-2 h-4 w-4" />
              <SelectValue>
                {machineId === 'all'
                  ? 'Todas as máquinas'
                  : (machines.find(m => m.id === machineId)?.name ?? 'Selecione')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as máquinas</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.code} - {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyStateV2
            illustration="no-data"
            title="Sem dados no período selecionado"
            description="Aumente o período acima ou importe uma planilha pra ver mapa de calor, top produtos e evolução de vendas."
            ctaLabel="Importar planilha agora"
            ctaHref="/app/importar"
          />
        </Card>
      ) : (
        <>
          {/* Summary Cards — HERO Receita Total + 2 secundários */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <KpiCardHero
                label="Receita Total"
                value={`R$ ${data.summary.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                subtitle="no período selecionado"
              />
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                  Total de Vendas
                </CardTitle>
                <ShoppingCart className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={2} />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-medium tabular-nums text-text-primary">
                  {data.summary.total_sales.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                  Ticket Médio
                </CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={2} />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-medium tabular-nums text-text-primary">
                  R$ {data.summary.average_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor</CardTitle>
              <CardDescription>
                Visualize os horários de pico de vendas por dia da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Heatmap data={data.heatmap} />
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Vendas</CardTitle>
                <CardDescription>Receita diária no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 text-text-tertiary">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.daily_sales} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} strokeOpacity={0.15} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        stroke="currentColor"
                        strokeOpacity={0.3}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: 'var(--text-primary)',
                        }}
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('pt-BR');
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_PRIMARY}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekday Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia da Semana</CardTitle>
                <CardDescription>Distribuição semanal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 text-text-tertiary">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekday_sales} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} strokeOpacity={0.15} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                      <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: 'var(--text-primary)',
                        }}
                        cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                      />
                      <Bar dataKey="revenue" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Produtos</CardTitle>
              <CardDescription>Produtos mais vendidos por receita</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 text-text-tertiary">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_products} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} strokeOpacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      width={150}
                      tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                      }}
                      cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                    />
                    <Bar dataKey="revenue" fill={CHART_ACCENT} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Breakdown — diferencial competitivo: ver o que mais sai */}
          <PaymentBreakdownCard
            days={period === 'all' ? 'all' : parseInt(period.replace('d', ''), 10) || 30}
            machineId={machineId === 'all' ? undefined : machineId}
          />
        </>
      )}
    </div>
  );
}
