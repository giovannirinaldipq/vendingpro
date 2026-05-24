import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Empty state estilo Linear: ícone outline grande, título, descrição opcional,
 * 1 CTA. Sem ilustrações comerciais, sem mascotes.
 */
function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-16 px-4",
      className
    )}>
      {Icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-subtle">
          <Icon className="h-7 w-7 text-text-tertiary" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export { EmptyState }
