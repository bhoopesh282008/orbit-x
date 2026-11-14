import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  eyebrow?: string
  description?: string
  badge?: React.ReactNode
  icon?: LucideIcon
  iconColor?: string
  backTo?: string
  backLabel?: string
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  eyebrow,
  description,
  badge,
  icon: Icon,
  iconColor = 'text-accent-blue',
  backTo,
  backLabel = 'Back',
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between shrink-0',
        // Signal-red rule segment along the bottom edge, like an agency report header
        "after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-16 after:bg-accent-blue after:content-['']",
        className
      )}
      {...props}
    >
      <div className="space-y-2 min-w-0">
        {backTo && (
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2.5 text-xs text-text-muted hover:text-text-primary -ml-2"
            >
              <Link to={backTo}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                {backLabel}
              </Link>
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {Icon && (
            <div className={cn('grid h-10 w-10 place-items-center rounded-md bg-[#121316] text-white shrink-0', iconColor && 'text-white')}>
              <Icon className="h-[18px] w-[18px]" />
            </div>
          )}
          <h1 className="text-[28px] sm:text-[34px] lg:text-[40px] font-[800] leading-[1.02] tracking-[-0.03em] [font-stretch:92%] text-text-primary truncate">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-sm text-text-secondary max-w-[62ch] leading-relaxed">
            {description}
          </p>
        )}
        {eyebrow && <p className="font-mono text-[11px] text-text-muted">{eyebrow}</p>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  )
}

