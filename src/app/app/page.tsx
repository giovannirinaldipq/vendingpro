'use client';

import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Monitor,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

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

export default function AppDashboard() {
  const { data: metrics, loading, error } = useFetch<DashboardMetrics>('/api/app/dashboard');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  const stats = [
    {
      title: 'Receita do Mês',
      value: `R$ ${(metrics?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${(metrics?.revenue_growth || 0) >= 0 ? '+' : ''}${metrics?.revenue_growth || 0}%`,
      changeType: (metrics?.revenue_growth || 0) >= 0 ? 'positive' : 'negative',
      description: 'vs. mês anterior',
      icon: DollarSign,
    },
    {
      title: 'Vendas',
      value: String(metrics?.total_sales || 0),
      change: `${(metrics?.sales_growth || 0) >= 0 ? '+' : ''}${metrics?.sales_growth || 0}%`,
      changeType: (metrics?.sales_growth || 0) >= 0 ? 'positive' : 'negative',
      description: 'vs. mês anterior',
      icon: ShoppingCart,
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${(metrics?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${(metrics?.ticket_growth || 0) >= 0 ? '+' : ''}${metrics?.ticket_growth || 0}%`,
      changeType: (metrics?.ticket_growth || 0) >= 0 ? 'positive' : 'negative',
      description: 'vs. mês anterior',
      icon: TrendingUp,
    },
    {
      title: 'Máquinas Ativas',
      value: String(metrics?.active_machines || 0),
      change: `${metrics?.machines_with_issues || 0} com problemas`,
      changeType: (metrics?.machines_with_issues || 0) > 0 ? 'negative' : 'positive',
      description: 'operando',
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas operações de vending
        </p>
      </div>

      {/* Onboarding (some quando primeira venda chega) */}
      <OnboardingChecklist />

      {/* Alerts Banner */}
      {(metrics?.pending_alerts || 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                Você tem {metrics?.pending_alerts} alerta(s) pendente(s)
              </p>
              <p className="text-sm text-yellow-700">
                Verifique as máquinas que precisam de atenção
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {stat.changeType === 'positive' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funcionalidades mais usadas</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a
              href="/app/importar"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Importar Vendas</p>
                <p className="text-sm text-muted-foreground">Upload de planilha VM PAY ou VendPago</p>
              </div>
            </a>
            <a
              href="/app/maquinas/nova"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Cadastrar Máquina</p>
                <p className="text-sm text-muted-foreground">Adicione uma nova máquina ao sistema</p>
              </div>
            </a>
            <a
              href="/app/analytics"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ver Analytics</p>
                <p className="text-sm text-muted-foreground">Mapa de calor e análises detalhadas</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Máquinas que Precisam de Atenção</CardTitle>
            <CardDescription>Baseado no score de saúde</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-center">
              <div>
                <Monitor className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Cadastre máquinas e importe dados para ver análises
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
