import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Pill — para status, contadores, filtros aplicados.
 * Diferente do Badge: pill é totalmente arredondado (full radius).
 * Use semantic ("operational", "warning", "danger") quando faz sentido
 * ou tone "neutral" pra textuais genéricos.
 */
const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:     "bg-surface-subtle text-text-secondary",
        navy:        "bg-brand-navy/10 text-brand-navy",
        amber:       "bg-brand-amber/15 text-[#92400e] dark:text-brand-amber",
        success:     "bg-success-soft text-success",
        warning:     "bg-warning-soft text-warning",
        danger:      "bg-danger-soft text-danger",
        info:        "bg-info-soft text-info",
        outline:     "border border-border-default text-text-secondary",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
      dot: {
        true: "pl-1.5",
        false: "",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
      dot: false,
    },
  }
)

interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  dot?: boolean
}

function Pill({ className, tone, size, dot, children, ...props }: PillProps) {
  const dotColor = {
    neutral:  "bg-text-tertiary",
    navy:     "bg-brand-navy",
    amber:    "bg-brand-amber",
    success:  "bg-success",
    warning:  "bg-warning",
    danger:   "bg-danger",
    info:     "bg-info",
    outline:  "bg-text-tertiary",
  }[tone ?? "neutral"]

  return (
    <span className={cn(pillVariants({ tone, size, dot }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {children}
    </span>
  )
}

export { Pill, pillVariants }
