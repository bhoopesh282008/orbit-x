import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEMO_CREW, DEMO_MISSIONS, DEMO_SCREENS, enterDemo } from '@/demo/judgeDemo'
import { useCrewStore } from '@/stores/crewStore'
import { useAuthStore, DEMO_USER_ID } from '@/stores/authStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'

/** One-click navigation through the whole mission lifecycle for judges (demo sessions only). */
export function JudgeTourBar() {
  const user = useAuthStore((s) => s.user)
  const designMission = useSpacecraftStore((s) => s.missionId)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const teamMode = useCrewStore((s) => s.mode === 'team')
  if (user?.id !== DEMO_USER_ID) return null

  const segments = pathname.split('/').filter(Boolean)
  const routeMission = DEMO_MISSIONS.find((m) => segments.includes(m.id))?.id
  const missionId = routeMission ?? designMission ?? 'earth-observer'
  const currentScreen = DEMO_SCREENS.find((s) => s.path(missionId) === pathname)?.id

  return (
    <nav
      aria-label="Judge demo tour"
      className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-white/[0.06] bg-[var(--accent-blue)]/[0.07] px-4 py-2 sm:px-6 lg:px-10"
    >
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
        <Gavel className="h-3.5 w-3.5" aria-hidden /> Judge demo
      </span>
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-bg-elevated p-0.5" role="radiogroup" aria-label="Mission">
        {DEMO_MISSIONS.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={m.id === missionId}
            onClick={() => navigate(enterDemo(m.id, currentScreen ?? 'briefing'))}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition',
              m.id === missionId ? 'bg-[var(--accent-blue)] text-white' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => (teamMode ? useCrewStore.getState().setSolo() : useCrewStore.getState().setupTeam(DEMO_CREW))}
        className="shrink-0 rounded-lg bg-bg-elevated px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
        aria-pressed={teamMode}
        title="Switch between solo play and a 4-player hot-seat team"
      >
        {teamMode ? 'Team of 4 · switch to solo' : 'Solo · try team of 4'}
      </button>
      <Link
        to="/model-check"
        className="shrink-0 rounded-lg bg-bg-elevated px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
      >
        Physics check
      </Link>
      <ol className="flex shrink-0 items-center gap-1">
        {DEMO_SCREENS.map((s, i) => {
          const active = s.id === currentScreen
          return (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-muted/50" aria-hidden>›</span>}
              <Link
                to={s.path(missionId)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'rounded-md px-2 py-1 text-xs transition',
                  active ? 'bg-white/10 font-semibold text-text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                )}
              >
                <span className="mr-1 font-mono text-[10px] text-text-muted">{i + 1}</span>
                {s.label}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
