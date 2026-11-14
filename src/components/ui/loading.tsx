import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

/** Orbit loader: a dot travelling around a faint ring. */
export function Loading({ size = 'md', text, className }: LoadingProps) {
  const dims = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status">
      <div className={cn('relative', dims)}>
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-0 animate-spin [animation-duration:1.4s]">
          <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue shadow-[0_0_10px_var(--accent-blue)]" />
        </div>
      </div>
      {text && <p className="eyebrow">{text}</p>}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

/** Full-page loader shaped like the app shell so the layout doesn't jump. */
export function PageLoading() {
  return (
    <div className="app-ambient flex min-h-dvh items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[18px] rounded-full bg-accent-blue/15" />
          <div className="absolute inset-0 animate-spin [animation-duration:1.6s]">
            <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue shadow-[0_0_14px_var(--accent-blue)]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-text-primary">ORBIT-X</p>
          <p className="eyebrow mt-1">Acquiring signal</p>
        </div>
      </div>
    </div>
  )
}
