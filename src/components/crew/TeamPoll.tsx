import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Play, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLES, useCrewView, type RoleId } from '@/stores/crewStore'
import type { LaunchOutcome } from '@/services/launchOutcome'

type Vote = 'go' | 'risk' | undefined

/**
 * Co-op launch poll: each role checks its own subsystem and signs GO (or
 * knowingly accepts a NO-GO risk). The Flight Director polls last and starts
 * the count only when every station has answered.
 */
export function TeamPoll({
  outcome,
  onLaunch,
  onFix,
}: {
  outcome: LaunchOutcome
  onLaunch: () => void
  onFix: () => void
}) {
  const crew = useCrewView()
  const [votes, setVotes] = useState<Partial<Record<RoleId, Vote>>>({})
  // Any design change invalidates earlier sign-offs
  useEffect(() => setVotes({}), [outcome])

  const stations = ROLES.filter((r) => r.id !== 'director')
  const allAnswered = stations.every((r) => votes[r.id])
  const directorStatus = outcome.roles.director
  // The Director's own NO-GO (budget) is a risk the team flies with too
  const risks = ROLES.filter((r) => votes[r.id] === 'risk' || (r.id === 'director' && !directorStatus.go))
  const directorName = crew.ownerOf('director').name

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Launch director poll · team</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        {allAnswered ? `${directorName}, the poll is complete` : 'Stations, report status'}
      </h2>
      <ul className="mt-3 space-y-2">
        {ROLES.map((role) => {
          const owner = crew.ownerOf(role.id)
          const status = outcome.roles[role.id]
          const vote = votes[role.id]
          const isDirector = role.id === 'director'
          return (
            <li key={role.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: owner.color }} aria-hidden />
                    <span className="truncate">{role.short}</span>
                    <span className="truncate text-xs font-normal text-white/50">· {owner.name}</span>
                  </div>
                  <p className={cn('mt-0.5 truncate text-[11px]', status.go ? 'text-white/55' : 'text-[#ffb4ae]')}>{status.note}</p>
                </div>
                {!isDirector &&
                  (vote ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-2 py-1 font-mono text-[11px] font-semibold',
                        vote === 'go' ? 'bg-[var(--status-success)]/15 text-[var(--status-success)]' : 'bg-[var(--status-danger)]/20 text-[#ffb4ae]'
                      )}
                    >
                      {vote === 'go' ? 'GO' : 'GO (RISK)'}
                    </span>
                  ) : (
                    <button
                      onClick={() => setVotes((v) => ({ ...v, [role.id]: status.go ? 'go' : 'risk' }))}
                      className={cn(
                        'shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition',
                        status.go
                          ? 'bg-[var(--status-success)] text-black hover:brightness-110'
                          : 'border border-[var(--status-danger)]/50 bg-[var(--status-danger)]/15 text-[#ffcdc8] hover:bg-[var(--status-danger)]/30'
                      )}
                      title={status.go ? `${owner.name} signs GO` : `${owner.name} accepts the risk of flying with this problem`}
                    >
                      {status.go ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" /> {owner.name}: GO
                        </span>
                      ) : (
                        'Accept risk'
                      )}
                    </button>
                  ))}
                {isDirector && (
                  <span className={cn('shrink-0 font-mono text-[11px] font-semibold', directorStatus.go ? 'text-[var(--status-success)]' : 'text-[#ffb4ae]')}>
                    {directorStatus.go ? 'BUDGET OK' : 'OVER BUDGET'}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {risks.length > 0 && (
        <p className="mt-3 rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 px-3 py-2 text-xs leading-relaxed text-[#ffcdc8]">
          {risks.map((r) => r.short).join(' and ')} {risks.length > 1 ? 'are' : 'is'} flying with a known problem. The Director can still send the
          team back to fix it.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onFix}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-medium transition hover:bg-white/15"
        >
          <Wrench className="h-4 w-4" /> Back to design
        </button>
        <button
          onClick={onLaunch}
          disabled={!allAnswered}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
            risks.length ? 'border border-[var(--status-danger)]/50 bg-[var(--status-danger)]/25 text-[#ffcdc8]' : 'bg-[var(--accent-blue)] text-white hover:brightness-110'
          )}
          title={allAnswered ? `${directorName} gives the final GO` : 'Every station must answer the poll first'}
        >
          {risks.length ? <AlertTriangle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {directorName}: {risks.length ? 'GO anyway' : 'GO for launch'}
        </button>
      </div>
    </div>
  )
}
