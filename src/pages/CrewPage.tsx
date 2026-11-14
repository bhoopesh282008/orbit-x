import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { ROLES, useCrewView } from '@/stores/crewStore'

/** Choose solo or co-op (2–4 players, one screen), name the crew and assign roles. */
export default function CrewPage() {
  const crew = useCrewView()
  const [count, setCount] = useState(crew.team ? crew.players.length : 3)
  const [names, setNames] = useState<string[]>(() => {
    const existing = crew.team ? crew.players.map((p) => p.name) : []
    return Array.from({ length: 4 }, (_, i) => existing[i] ?? '')
  })

  const startTeam = () => crew.setupTeam(names.slice(0, count))

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Mission crew"
        title="Who's flying this mission?"
        description="Play alone, or as a team of up to four on one screen. Each role owns part of the spacecraft and a slice of the budget — and must sign off before launch."
        icon={Users}
      />

      {/* Mode */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={crew.setSolo}
          className={cn(
            'panel-surface flex items-start gap-3 rounded-2xl p-5 text-left transition',
            !crew.team ? 'ring-2 ring-accent-blue' : 'hover:border-white/20'
          )}
          aria-pressed={!crew.team}
        >
          <User className="mt-0.5 h-5 w-5 text-accent-blue" />
          <div>
            <p className="font-semibold">Solo</p>
            <p className="mt-1 text-sm text-text-secondary">You hold every role. Fastest way to learn the trade-offs.</p>
          </div>
        </button>
        <div className={cn('panel-surface rounded-2xl p-5', crew.team && 'ring-2 ring-accent-blue')}>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-accent-blue" />
            <div className="flex-1">
              <p className="font-semibold">Team (hot-seat)</p>
              <p className="mt-1 text-sm text-text-secondary">2–4 players share one screen and pass control between turns.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2" role="radiogroup" aria-label="Number of players">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  count === n ? 'border-accent-blue bg-accent-blue/15 text-text-primary' : 'border-white/10 text-text-secondary hover:border-white/25'
                )}
              >
                {n} players
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: count }).map((_, i) => (
              <label key={i} className="block">
                <span className="sr-only">Player {i + 1} name</span>
                <input
                  value={names[i]}
                  onChange={(e) => setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  placeholder={`Player ${i + 1}`}
                  maxLength={18}
                  className="w-full rounded-lg border border-white/10 bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-blue"
                />
              </label>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={startTeam}>
            {crew.team ? 'Re-form team' : 'Form team'}
          </Button>
        </div>
      </div>

      {/* Roles */}
      <section aria-label="Roles">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Roles</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ROLES.map((role) => {
            const owner = crew.ownerOf(role.id)
            return (
              <div key={role.id} className="panel-surface rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{role.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{role.responsibilities}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-text-muted">{Math.round(crew.shares[role.id] * 100)}% budget</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: owner.color }} aria-hidden />
                  {crew.team ? (
                    <select
                      value={crew.owners[role.id]}
                      onChange={(e) => crew.assignRole(role.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-bg-elevated px-2.5 py-1.5 text-sm"
                      aria-label={`${role.title} is played by`}
                    >
                      {crew.players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-text-secondary">{owner.name}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <Button asChild>
          <Link to="/campaign">
            Choose a mission <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </PageContainer>
  )
}
