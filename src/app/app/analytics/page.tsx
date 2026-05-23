'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Monitor, Loader2, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heatmap } from '@/components/charts/heatmap';
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
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (machineId !== 'all') {
      params.set('machine_id', machineId);
    }

    fetch(`/api/app/analytics?${params}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        }
      })
      .finally(() => setLoading(false));
  }, [period, machineId]);

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
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={machineId} onValueChange={(v) => v && setMachineId(v)}>
            <SelectTrigger className="w-[200px]">
              <Monitor className="mr-2 h-4 w-4" />
              <SelectValue />
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
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium">Sem dados para exibir</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Importe dados de vendas para visualizar as análises
            </p>
            <a href="/app/importar">
              <Button variant="outline" className="mt-4">Importar Dados</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {data.summary.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Vendas
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.total_sales.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket Médio
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
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
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.daily_sales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('pt-BR');
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
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
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekday_sales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_products} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={150}
                      tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                    />
                    <Tooltip
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
