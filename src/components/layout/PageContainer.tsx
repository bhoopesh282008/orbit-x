import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'wide' | 'full'
}

/**
 * Standardized PageContainer for consistent page margins and gutters across ORBIT-X.
 * - default: max-w-7xl (~1280px) for standard content pages (Dashboard, Campaign, Briefing, Launch, Validation, Results, Profile, Settings)
 * - wide: max-w-[1600px] for high-density workstations (Spacecraft Designer, Mission Simulation)
 * - full: 100% width with standard gutters
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24 md:pt-8 lg:pt-10 space-y-7 box-border',
          variant === 'default' && 'max-w-7xl',
          variant === 'wide' && 'max-w-[1600px]',
          variant === 'full' && 'max-w-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PageContainer.displayName = 'PageContainer'

