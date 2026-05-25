'use client';

import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KpiCardHero — variante hero do card de KPI.
 *
 * Especificação (redesign v2 "Minimalist Cartoon Premium"):
 *  - 1 por tela (a métrica mais importante)
 *  - Border navy/20, padding 24, fundo surface-card
 *  - Label uppercase navy (NÃO tertiary) + tracking wide
 *  - Número 36px JetBrains Mono bold em navy
 *  - Delta: pill amber se positivo (ícone TrendingUp), slate se negativo (TrendingDown)
 *  - Decoração: grid 3x3 amber/navy no canto sup. direito, opacity 0.08 — eco da logo
 */
interface KpiCardHeroProps {
  label: string;
  value: string;
  /** Delta percentual (positivo ou negativo). Se omitido, não mostra pill. */
  deltaPercent?: number;
  /** Texto auxiliar abaixo do valor (ex: "vs mês anterior") */
  subtitle?: string;
  /** Ícone Lucide na decoração — default sem ícone */
  icon?: LucideIcon;
  className?: string;
  /** Children pra conteúdo customizado abaixo (ex: sparkline) */
  children?: ReactNode;
}

export function KpiCardHero({
  label, value, deltaPercent, subtitle, icon: Icon, className, children,
}: KpiCardHeroProps) {
  const isPositive = deltaPercent !== undefined && deltaPercent >= 0;
  const showDelta = deltaPercent !== undefined && deltaPercent !== 0;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border border-brand-navy/20 bg-surface-card p-6',
      'shadow-soft',
      className
    )}>
      {/* Decoração: grid 3x3 amber/navy no canto superior direito */}
      <DecorativeGrid />

      <div className="relative min-w-0">
        <div className="flex items-center gap-2 pr-12">
          {Icon && <Icon className="h-3.5 w-3.5 text-brand-navy/60" strokeWidth={2} />}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-navy">
            {label}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 min-w-0">
          <p
            className={cn(
              'font-mono font-bold tabular-nums leading-none text-brand-navy break-words',
              // Auto-shrink: text-4xl (default) → text-3xl (>10) → text-2xl (>14) → text-xl (>18)
              value.length <= 10 && 'text-4xl',
              value.length > 10 && value.length <= 14 && 'text-3xl',
              value.length > 14 && value.length <= 18 && 'text-2xl',
              value.length > 18 && 'text-xl'
            )}
            title={value}
          >
            {value}
          </p>
          {showDelta && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums shrink-0',
              isPositive
                ? 'bg-brand-amber/15 text-[#92400e] dark:text-brand-amber'
                : 'bg-surface-subtle text-text-secondary'
            )}>
              {isPositive
                ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
              {isPositive ? '+' : ''}{deltaPercent!.toFixed(1)}%
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1.5 text-xs text-text-tertiary">{subtitle}</p>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Eco visual da logo: grid 3x3 no canto superior direito.
 * Padrão alternado: amber (cantos pulsantes) + navy (centros), opacidade baixa.
 * Mesma estrutura que o ícone oficial pra reforçar identidade.
 */
function DecorativeGrid() {
  // Padrão de fill: 1=amber, 0.18=fade. Espelha o icon-light.svg
  const pattern = [
    [1, 0.18, 1],
    [0.18, 1, 0.18],
    [0.18, 0.18, 0.18],
  ];
  const cell = 10;
  const gap = 3;
  const total = cell * 3 + gap * 2; // 36

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
              fill={isStrong ? '#fbbf24' : '#1e40af'}
              fillOpacity={isStrong ? 0.4 : 0.12}
            />
          );
        })
      )}
    </svg>
  );
}
