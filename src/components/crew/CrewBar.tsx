import { Link } from 'react-router-dom'
import { Check, HandCoins, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLES, roleInfo, roleSpend, useCrewView, type RoleId } from '@/stores/crewStore'
import type { SpacecraftComponent } from '@/stores/spacecraftStore'

/**
 * Team panel for co-op play: whose turn it is (hot-seat), each role's slice of
 * the budget, and funding requests the Flight Director approves or declines.
 */
export function CrewBar({
  components,
  vehicleCost,
  budget,
}: {
  components: SpacecraftComponent[]
  vehicleCost: number
  budget: number
}) {
  const crew = useCrewView()
  if (!crew.team) return null

  const spend = roleSpend(components, vehicleCost)
  const spentShare = Object.fromEntries(ROLES.map((r) => [r.id, budget ? spend[r.id] / budget : 0])) as Record<RoleId, number>
  const activeIsDirector = crew.owners.director === crew.activePlayerId
  const activeRoles = crew.rolesOf(crew.activePlayerId)

  return (
    <section className="panel-surface rounded-2xl p-4" aria-label="Mission crew">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-blue" aria-hidden />
          <span className="eyebrow !text-[10px]">At the console</span>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Active player">
            {crew.players.map((p) => {
              const active = p.id === crew.activePlayerId
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => crew.setActivePlayer(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                    active ? 'border-transparent bg-white/10 font-semibold text-text-primary' : 'border-white/10 text-text-secondary hover:border-white/25'
                  )}
                  style={active ? { boxShadow: `inset 0 0 0 1.5px ${p.color}` } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>
        <p className="text-xs text-text-muted">
          {crew.active.name} controls: <span className="text-text-secondary">{activeRoles.map((r) => r.short).join(' · ')}</span>
          <Link to="/crew" className="ml-3 text-accent-blue hover:underline">
            Edit crew
          </Link>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role) => {
          const owner = crew.ownerOf(role.id)
          const allocated = crew.shares[role.id] * budget
          const used = spend[role.id]
          const over = used > allocated
          const pct = allocated ? Math.min(100, (used / allocated) * 100) : 100
          const mine = crew.owners[role.id] === crew.activePlayerId
          const pending = crew.requests.find((r) => r.role === role.id)
          return (
            <div key={role.id} className={cn('rounded-xl border p-3', mine ? 'border-white/15 bg-white/[0.03]' : 'border-white/[0.06]')}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{role.short}</span>
                <span className="flex items-center gap-1 truncate text-[11px] text-text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: owner.color }} aria-hidden />
                  {owner.name}
                </span>
              </div>
              <p className={cn('mt-1.5 font-mono text-sm', over ? 'text-status-danger' : 'text-text-primary')}>
                {(used / 1000).toFixed(0)}k <span className="text-text-muted">/ {(allocated / 1000).toFixed(0)}k cr</span>
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className={cn('h-full rounded-full', over ? 'bg-status-danger' : 'bg-accent-blue')} style={{ width: `${pct}%` }} />
              </div>
              {over && <p className="mt-1.5 text-[11px] text-status-danger">{((used - allocated) / 1000).toFixed(1)}k over this role’s slice</p>}

              {pending ? (
                activeIsDirector ? (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                    <span className="flex-1 text-status-warning">Asks +{Math.round(pending.share * 100)}%</span>
                    <button
                      onClick={() => crew.resolveRequest(pending.id, true, spentShare)}
                      className="flex items-center gap-1 rounded-md bg-status-success/15 px-1.5 py-0.5 text-status-success hover:bg-status-success/25"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => crew.resolveRequest(pending.id, false, spentShare)}
                      className="flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 hover:bg-white/15"
                      aria-label={`Decline ${role.short} request`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-status-warning">Waiting for {crew.ownerOf('director').name} to approve +{Math.round(pending.share * 100)}%</p>
                )
              ) : (
                mine &&
                role.id !== 'director' && (
                  <button
                    onClick={() => crew.requestFunds(role.id)}
                    className="mt-2 flex items-center gap-1 text-[11px] text-accent-blue hover:underline"
                  >
                    <HandCoins className="h-3 w-3" /> Request +5% from the Director
                  </button>
                )
              )}
              {activeIsDirector && role.id !== 'director' && !pending && (
                <button
                  onClick={() => crew.transferShare(role.id, 0.05, spentShare)}
                  className="mt-1 text-[11px] text-text-muted hover:text-text-primary"
                  title="Move 5% of the budget to this role from whoever has the most unspent"
                >
                  + Give 5%
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Small "owned by" note for controls the active player may not touch. */
export function OwnerLock({ role }: { role: RoleId }) {
  const crew = useCrewView()
  const owner = crew.ownerOf(role)
  return (
    <span className="flex items-center gap-1 text-[11px] text-text-muted" title={`${roleInfo(role).title} is ${owner.name}'s job`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: owner.color }} aria-hidden />
      {owner.name}’s call
    </span>
  )
}
