import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "rounded-md border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap",
    "transition-colors duration-150",
    "outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:ring-brand-navy",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-brand-navy text-white hover:bg-brand-navy-hover",
        secondary:
          "bg-surface-card text-text-primary border-border-default hover:bg-surface-subtle dark:bg-surface-card dark:hover:bg-surface-subtle",
        ghost:
          "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
        destructive:
          "bg-danger text-white hover:opacity-90",
        link:
          "text-brand-navy underline-offset-4 hover:underline px-0 h-auto",
        // legado: alias pra primary (vários lugares ainda usam `variant=\"default\"`)
        default:
          "bg-brand-navy text-white hover:bg-brand-navy-hover",
        outline:
          "bg-surface-card text-text-primary border-border-default hover:bg-surface-subtle dark:bg-surface-card dark:hover:bg-surface-subtle",
      },
      size: {
        sm:  "h-8 px-3 text-[13px] gap-1.5 has-data-[icon=inline-start]:pl-2.5 has-data-[icon=inline-end]:pr-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        md:  "h-9 px-4 gap-2 has-data-[icon=inline-start]:pl-3 has-data-[icon=inline-end]:pr-3",
        lg:  "h-11 px-5 gap-2 text-[15px] has-data-[icon=inline-start]:pl-4 has-data-[icon=inline-end]:pr-4 [&_svg:not([class*='size-'])]:size-5",
        icon:    "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-5",
        // legado: aliases
        default: "h-9 px-4 gap-2 has-data-[icon=inline-start]:pl-3 has-data-[icon=inline-end]:pr-3",
        xs:     "h-7 px-2.5 text-xs gap-1 [&_svg:not([class*='size-'])]:size-3",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
