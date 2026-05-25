import * as React from "react"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string | number
  /** Delta numérico em % (positivo ou negativo). Pinta semantic. */
  delta?: number
  /** Texto contextual abaixo do delta. Ex: "vs últimos 30 dias" */
  deltaLabel?: string
  /** Ícone opcional no canto superior direito (text-tertiary). */
  icon?: LucideIcon
  /** Acentar o card (estado destacado, ex: KPI principal). */
  tone?: "default" | "primary"
  /** Texto auxiliar abaixo do valor (ex: "12 vendas") */
  hint?: string
}

function KpiCard({ label, value, delta, deltaLabel, icon: Icon, tone = "default", hint }: KpiCardProps) {
  const deltaPositive = typeof delta === "number" && delta > 0
  const deltaNegative = typeof delta === "number" && delta < 0
  const DeltaIcon = deltaPositive ? TrendingUp : deltaNegative ? TrendingDown : Minus

  return (
    <div className={cn(
      "rounded-[10px] border bg-surface-card p-6 shadow-soft",
      tone === "primary" ? "border-brand-navy/30" : "border-border-default"
    )}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-text-tertiary">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />}
      </div>
      <div
        className={cn(
          "mt-3 font-mono-num font-medium leading-none text-text-primary break-words min-w-0",
          // Auto-shrink: 28px (≤10) → 24px (≤14) → 20px (≤18) → 18px (>18)
          (() => {
            const len = String(value).length;
            if (len <= 10) return "text-[28px]";
            if (len <= 14) return "text-[24px]";
            if (len <= 18) return "text-[20px]";
            return "text-[18px]";
          })(),
        )}
        title={String(value)}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-text-tertiary">{hint}</div>
      )}
      {typeof delta === "number" && (
        <div className="mt-3 flex items-center gap-1.5">
          <DeltaIcon
            className={cn(
              "h-3.5 w-3.5",
              deltaPositive && "text-success",
              deltaNegative && "text-danger",
              !deltaPositive && !deltaNegative && "text-text-tertiary"
            )}
            strokeWidth={2.5}
          />
          <span className={cn(
            "font-mono-num text-xs font-medium",
            deltaPositive && "text-success",
            deltaNegative && "text-danger",
            !deltaPositive && !deltaNegative && "text-text-tertiary"
          )}>
            {deltaPositive && "+"}{delta.toFixed(1)}%
          </span>
          {deltaLabel && (
            <span className="text-xs text-text-tertiary">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export { KpiCard }
