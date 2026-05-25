"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Toaster — redesign v2 "Minimalist Cartoon Premium".
 *
 * Visual: bg surface-card + borda 4px à esquerda na cor semântica.
 *   - success → amber (celebração de marca, não verde genérico)
 *   - info    → navy
 *   - warning → warning token
 *   - error   → danger (apenas erro real)
 *
 * Ícones Lucide pequenos, sem fundos coloridos completos.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      icons={{
        success: <CheckIcon className="size-4 text-brand-amber" strokeWidth={2.5} />,
        info:    <InfoIcon className="size-4 text-brand-navy" strokeWidth={2} />,
        warning: <TriangleAlertIcon className="size-4 text-warning" strokeWidth={2} />,
        error:   <OctagonXIcon className="size-4 text-danger" strokeWidth={2} />,
        loading: <Loader2Icon className="size-4 animate-spin text-text-tertiary" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast flex items-start gap-3 rounded-lg border bg-surface-card text-text-primary " +
            "shadow-popover p-4 pr-8 border-l-[4px] border-l-text-tertiary",
          title:   "text-sm font-semibold",
          description: "text-xs text-text-secondary mt-0.5",
          actionButton:
            "inline-flex items-center rounded-md bg-brand-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-navy-800",
          cancelButton:
            "inline-flex items-center rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-medium text-text-secondary",
          closeButton:
            "border border-border-default bg-surface-card hover:bg-surface-subtle",
          success: "!border-l-brand-amber",
          info:    "!border-l-brand-navy",
          warning: "!border-l-warning",
          error:   "!border-l-danger",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
