import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue',
        success: 'border-status-success/25 bg-status-success/10 text-status-success',
        warning: 'border-status-warning/25 bg-status-warning/10 text-status-warning',
        danger: 'border-status-danger/25 bg-status-danger/10 text-status-danger',
        outline: 'border-white/15 text-text-secondary',
        cyan: 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
