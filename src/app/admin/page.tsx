'use client';

import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import type { AdminDashboardMetrics } from '@/types';

export default function AdminDashboard() {
  const { data: metrics, loading, error } = useFetch<AdminDashboardMetrics>('/api/admin/dashboard');

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
      title: 'MRR',
      value: `R$ ${(metrics?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `+${metrics?.mrr_growth || 0}%`,
      changeType: 'positive' as const,
      description: 'vs. mês anterior',
      icon: DollarSign,
    },
    {
      title: 'Clientes Ativos',
      value: String(metrics?.active_tenants || 0),
      change: `+${metrics?.trial_tenants || 0}`,
      changeType: 'positive' as const,
      description: 'em trial',
      icon: Users,
    },
    {
      title: 'Máquinas',
      value: String(metrics?.total_machines || 0),
      change: '+0',
      changeType: 'positive' as const,
      description: 'na plataforma',
      icon: TrendingUp,
    },
    {
      title: 'Inadimplência',
      value: `R$ ${(metrics?.overdue_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${metrics?.overdue_count || 0} faturas`,
      changeType: 'negative' as const,
      description: 'em atraso',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema VendingPro
        </p>
      </div>

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

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Clientes</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ativos</span>
                <span className="font-medium">{metrics?.active_tenants || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Em Trial</span>
                <span className="font-medium">{metrics?.trial_tenants || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inadimplentes</span>
                <span className="font-medium text-yellow-600">{metrics?.overdue_tenants || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Suspensos</span>
                <span className="font-medium text-red-600">{metrics?.suspended_tenants || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas Financeiras</CardTitle>
            <CardDescription>Indicadores do mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ticket Médio</span>
                <span className="font-medium">
                  R$ {(metrics?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Churn Rate</span>
                <span className="font-medium">{(metrics?.churn_rate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Clientes</span>
                <span className="font-medium">{metrics?.total_tenants || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
