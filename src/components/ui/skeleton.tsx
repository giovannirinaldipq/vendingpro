import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton genérico. Para variantes específicas (KpiSkeleton, TableSkeleton, etc),
 * componha esses blocos.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-subtle dark:bg-surface-subtle",
        className
      )}
      {...props}
    />
  )
}

/** KPI card placeholder — mesma altura/forma do KpiCard real */
function KpiSkeleton() {
  return (
    <div className="rounded-[10px] border border-border-default bg-surface-card p-6 shadow-soft">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  )
}

/** Linhas de tabela placeholder */
function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border-default">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn("h-4", j === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Chart placeholder */
function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-[10px] border border-border-default bg-surface-card p-6 shadow-soft">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-1 h-3 w-48" />
      <div className="mt-6 flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, KpiSkeleton, TableSkeleton, ChartSkeleton }
