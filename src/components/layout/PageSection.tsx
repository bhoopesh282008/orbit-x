import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
  ...props
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            {title && (
              <h2 className="text-base sm:text-[17px] font-semibold tracking-[-0.015em] text-text-primary">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[13px] text-text-muted mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

