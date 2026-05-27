'use client';

import { useFetch } from '@/hooks/use-fetch';
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import type { AdminDashboardMetrics } from '@/types';

function DecorativeGrid() {
  const pattern = [
    [1, 0.18, 1],
    [0.18, 1, 0.18],
    [0.18, 0.18, 0.18],
  ];
  const cell = 10;
  const gap = 3;
  const total = cell * 3 + gap * 2;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${total} ${total}`}
      className="absolute right-5 top-5 h-9 w-9 opacity-60"
      style={{ pointerEvents: 'none' }}
    >
      {pattern.map((row, ri) =>
        row.map((alpha, ci) => {
          const x = ci * (cell + gap);
          const y = ri * (cell + gap);
          const isStrong = alpha === 1;
          return (
            <rect
              key={`${ri}-${ci}`}
              x={x} y={y}
              width={cell} height={cell}
              rx={2}
              fill={isStrong ? '#fbbf24' : 'rgba(255,255,255,0.4)'}
              fillOpacity={isStrong ? 0.5 : 0.08}
            />
          );
        })
      )}
    </svg>
  );
}

export default function AdminDashboard() {
  const { data: metrics, loading, error } = useFetch<AdminDashboardMetrics>('/api/admin/dashboard');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-white/50">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  const mrr = (metrics?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const mrrGrowth = metrics?.mrr_growth || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-white/60">
          Visão geral do sistema VendingPro
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Hero — MRR */}
        <div className="relative overflow-hidden rounded-xl p-6 shadow-soft"
          style={{
            background: 'rgba(251,191,36,0.04)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <DecorativeGrid />
          <div className="relative">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400/60" strokeWidth={2} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-400/80">
                MRR
              </p>
            </div>
            <p className="mt-2.5 font-mono text-4xl font-bold tabular-nums leading-none text-amber-400">
              R$ {mrr}
            </p>
            {mrrGrowth !== 0 && (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums bg-amber-400/15 text-amber-300">
                <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                +{mrrGrowth}%
              </span>
            )}
            <p className="mt-1.5 text-xs text-white/40">vs. mês anterior</p>
          </div>
        </div>

        {/* Secondary — Clientes Ativos */}
        <div className="rounded-xl p-6 bg-admin-surface border border-admin shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/50">
              Clientes Ativos
            </span>
            <Users className="h-4 w-4 text-white/30" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-[28px] font-medium tabular-nums leading-none text-white">
            {metrics?.active_tenants || 0}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium tabular-nums text-amber-400">
              +{metrics?.trial_tenants || 0}
            </span>
            <span className="text-xs text-white/40">em trial</span>
          </div>
        </div>

        {/* Secondary — Máquinas */}
        <div className="rounded-xl p-6 bg-admin-surface border border-admin shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/50">
              Máquinas
            </span>
            <TrendingUp className="h-4 w-4 text-white/30" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-[28px] font-medium tabular-nums leading-none text-white">
            {metrics?.total_machines || 0}
          </p>
          <p className="mt-3 text-xs text-white/40">na plataforma</p>
        </div>

        {/* Secondary — Inadimplência */}
        <div className="rounded-xl p-6 bg-admin-surface border border-admin shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/50">
              Inadimplência
            </span>
            <AlertTriangle className="h-4 w-4 text-white/30" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-[28px] font-medium tabular-nums leading-none text-white">
            R$ {(metrics?.overdue_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium tabular-nums text-red-400">
              {metrics?.overdue_count || 0} faturas
            </span>
            <span className="text-xs text-white/40">em atraso</span>
          </div>
        </div>
      </div>

      {/* Info Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl p-6 bg-admin-surface border border-admin">
          <h2 className="text-base font-semibold text-white">Resumo de Clientes</h2>
          <p className="text-sm text-white/50 mt-1">Distribuição por status</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Ativos</span>
              <span className="font-mono font-medium text-white tabular-nums">{metrics?.active_tenants || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Em Trial</span>
              <span className="font-mono font-medium text-white tabular-nums">{metrics?.trial_tenants || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Inadimplentes</span>
              <span className="font-mono font-medium text-amber-400 tabular-nums">{metrics?.overdue_tenants || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Suspensos</span>
              <span className="font-mono font-medium text-red-400 tabular-nums">{metrics?.suspended_tenants || 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 bg-admin-surface border border-admin">
          <h2 className="text-base font-semibold text-white">Métricas Financeiras</h2>
          <p className="text-sm text-white/50 mt-1">Indicadores do mês</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Ticket Médio</span>
              <span className="font-mono font-medium text-white tabular-nums">
                R$ {(metrics?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Churn Rate</span>
              <span className="font-mono font-medium text-white tabular-nums">{(metrics?.churn_rate || 0).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Total de Clientes</span>
              <span className="font-mono font-medium text-white tabular-nums">{metrics?.total_tenants || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
