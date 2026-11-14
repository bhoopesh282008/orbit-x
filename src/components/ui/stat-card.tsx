import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  className?: string
  iconColor?: string
  hint?: string
}

/**
 * Instrument-style readout: small mono label, large tabular value,
 * icon tucked into the corner instead of a boxed chip.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
  iconColor = 'text-text-muted',
  hint,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group panel-surface relative overflow-hidden rounded-xl px-4 py-3.5 transition-colors duration-200 hover:border-white/15',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow truncate">{label}</p>
        <Icon className={cn('h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100', iconColor)} />
      </div>
      <p className="mt-2 font-mono text-[22px] font-semibold leading-none tracking-tight text-text-primary">
        {value}
      </p>
      {(trend || hint) && (
        <p
          className={cn(
            'mt-1.5 text-[11px] font-medium',
            trend ? (trendUp ? 'text-status-success' : 'text-status-danger') : 'text-text-muted'
          )}
        >
          {trend ?? hint}
        </p>
      )}
    </div>
  )
}
