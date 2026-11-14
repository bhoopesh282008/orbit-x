import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Orbit,
  Wrench,
  FlaskConical,
  UserRound,
  Settings2,
  Menu,
  X,
  LogOut,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { AIChatAssistant } from '@/components/ai/AIChatAssistant'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { JudgeTourBar } from '@/components/layout/JudgeTourBar'

const navGroups = [
  {
    label: 'Operate',
    links: [
      { path: '/dashboard', match: '/dashboard', label: 'Overview', icon: LayoutGrid },
      { path: '/campaign', match: '/campaign', label: 'Campaign', icon: Orbit },
      { path: '/crew', match: '/crew', label: 'Mission crew', icon: Users },
    ],
  },
  {
    label: 'Build',
    links: [
      { path: '/designer/lunar-explorer', match: '/designer', label: 'Spacecraft workstation', icon: Wrench },
      { path: '/mission-lab', match: '/mission-lab', label: 'Mission lab', icon: FlaskConical },
      { path: '/model-check', match: '/model-check', label: 'Model accuracy', icon: ShieldCheck },
    ],
  },
  {
    label: 'Account',
    links: [
      { path: '/profile', match: '/profile', label: 'Commander profile', icon: UserRound },
      { path: '/settings', match: '/settings', label: 'Settings', icon: Settings2 },
    ],
  },
]

/** Human-readable label for the current route, shown in the header. */
const routeTitles: Record<string, string> = {
  dashboard: 'Overview',
  campaign: 'Campaign',
  crew: 'Mission crew',
  'model-check': 'Model accuracy',
  'mission-planner': 'Mission planner',
  designer: 'Spacecraft workstation',
  launch: 'Launch vehicle',
  'launch-operations': 'Launch operations',
  validation: 'Design validation',
  simulation: 'Flight simulation',
  'mission-control': 'Mission control',
  'mission-lab': 'Mission lab',
  results: 'Mission results',
  profile: 'Commander profile',
  settings: 'Settings',
}

function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now.toISOString().slice(11, 19)
}

function MarkLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <circle cx="16" cy="16" r="5" fill="var(--accent-blue)" />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        transform="rotate(-28 16 16)"
      />
      <circle cx="27" cy="10.5" r="1.8" fill="currentColor" />
    </svg>
  )
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const player = useGameStore((s) => s.player)
  const { logout, user } = useAuthStore()
  const utc = useUtcClock()

  const commanderDisplayName = user?.fullName || player.name
  const initials = commanderDisplayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const segment = location.pathname.split('/')[1] ?? ''
  const pageTitle = routeTitles[segment] ?? 'ORBIT-X'
  const missionSlug = location.pathname.split('/')[2]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="app-ambient flex h-dvh w-full overflow-hidden text-text-primary">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[244px] shrink-0 flex-col border-r border-border-subtle bg-bg-secondary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:z-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className="group flex items-center gap-2.5 text-text-primary">
            <span className="transition-transform duration-500 group-hover:rotate-[20deg]">
              <MarkLogo />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-[0.16em]">ORBIT-X</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted">Mission design program</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">{group.label}</p>
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const isActive = location.pathname.startsWith(link.match)
                  return (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors duration-150',
                          isActive
                            ? 'bg-bg-elevated font-semibold text-text-primary'
                            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="nav-indicator"
                            className="absolute inset-y-0 left-0 w-[3px] bg-[#fc3d21]"
                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          />
                        )}
                        <link.icon
                          className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-blue' : 'text-text-muted')}
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Commander card */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-blue/15 font-mono text-xs font-semibold text-accent-blue ring-1 ring-accent-blue/25"
              aria-label="Open commander profile"
            >
              {initials || 'CX'}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text-primary">{commanderDisplayName}</p>
              <p className="truncate font-mono text-[11px] text-text-muted">
                L{player.level} · {player.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-text-muted hover:bg-status-danger/10 hover:text-status-danger"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-bg-secondary px-4 sm:px-6 lg:px-10">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[#fc3d21]" aria-hidden />
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-text-muted hover:bg-white/5 hover:text-text-primary lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted sm:inline">Mission console</span>
              <span className="hidden text-text-muted/50 sm:inline">/</span>
              <span className="truncate font-medium text-text-primary">{pageTitle}</span>
              {missionSlug && (
                <span className="hidden truncate rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-text-muted md:inline">
                  {missionSlug}
                </span>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-5">
            <dl className="hidden items-center gap-5 md:flex">
              <div className="flex items-center gap-2">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-status-success" aria-hidden />
                <dt className="sr-only">UTC time</dt>
                <dd className="font-mono text-[12px] text-text-secondary">{utc} UTC</dd>
              </div>
              <div className="h-5 w-px bg-white/10" aria-hidden />
              <div className="text-right">
                <dt className="eyebrow !text-[9.5px] leading-none">Budget</dt>
                <dd className="mt-1 font-mono text-[13px] font-medium leading-none text-text-primary">
                  {player.credits.toLocaleString()} <span className="text-text-muted">cr</span>
                </dd>
              </div>
              <div className="text-right">
                <dt className="eyebrow !text-[9.5px] leading-none">Rank</dt>
                <dd className="mt-1 font-mono text-[13px] font-medium leading-none text-accent-blue">L{player.level}</dd>
              </div>
            </dl>
            <ThemeToggle compact />
          </div>
        </header>

        <JudgeTourBar />

        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <AIChatAssistant />
      </div>
    </div>
  )
}
