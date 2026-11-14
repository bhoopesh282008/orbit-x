import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertOctagon, CheckCircle2, CircleDot, Lightbulb, Play, TriangleAlert, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { anomaliesForMission, buildAnomalyContext, type AnomalyDef, type AnomalyOption, type Verdict } from '@/services/anomalies'
import { useAnomalyStore, summarizeDecisions, NO_DECISIONS } from '@/stores/anomalyStore'
import { useAdvancedSimulationStore, type FlightAlarm } from '@/stores/advancedSimulationStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useMissionStore } from '@/stores/missionStore'
import { useMissionPlannerStore } from '@/stores/missionPlannerStore'
import { roleInfo, useCrewView } from '@/stores/crewStore'

const VERDICT: Record<Verdict, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  good: { label: 'Good call', tone: 'text-status-success', icon: CheckCircle2 },
  ok: { label: 'Acceptable', tone: 'text-status-warning', icon: CircleDot },
  bad: { label: 'Costly decision', tone: 'text-status-danger', icon: XCircle },
}

/**
 * Watches the mission clock, pauses for scripted anomalies, asks the
 * responsible role to decide, then applies the design-dependent outcome.
 */
export function AnomalyConsole({ missionId }: { missionId: string }) {
  const simTime = useAdvancedSimulationStore((s) => s.simTimeSeconds)
  const components = useSpacecraftStore((s) => s.selectedComponents)
  const vehicle = useSpacecraftStore((s) => s.selectedLaunchVehicle)
  const mission = useMissionStore((s) => s.missions.find((m) => m.id === missionId))
  const reserve = useMissionPlannerStore((s) => s.userReserveDeltaVMargin)
  const { activeId, lastResolved, resolved, trigger, resolve, dismissOutcome } = useAnomalyStore()
  const crew = useCrewView()

  const defs = useMemo(() => anomaliesForMission(missionId), [missionId])
  const ctx = useMemo(
    () => buildAnomalyContext(missionId, components, vehicle, mission, reserve),
    [missionId, components, vehicle, mission, reserve]
  )
  const active = defs.find((d) => d.id === activeId)

  // Trigger the next anomaly when its time comes, and hold the clock
  useEffect(() => {
    if (activeId || lastResolved) return
    const next = defs.find((d) => d.triggerAt <= simTime && !resolved.some((r) => r.anomalyId === d.id))
    if (next) {
      trigger(next.id)
      useAdvancedSimulationStore.setState({ isPaused: true })
    }
  }, [simTime, activeId, lastResolved, defs, resolved, trigger])

  const choose = (def: AnomalyDef, option: AnomalyOption) => {
    const outcome = option.resolve(ctx)
    const owner = crew.team ? crew.ownerOf(def.role).name : undefined
    resolve({
      anomalyId: def.id,
      title: def.title,
      role: def.role,
      decidedBy: owner,
      choice: option.label,
      outcome,
      atSimTime: Math.round(simTime),
    })
    // Apply consequences to the live spacecraft
    useAdvancedSimulationStore.setState((s) => ({
      health: outcome.health
        ? { ...s.health, [outcome.health.subsystem]: Math.max(0, s.health[outcome.health.subsystem] - outcome.health.amount) }
        : s.health,
      totalDeltaVRemaining: Math.max(0, s.totalDeltaVRemaining - outcome.deltaVUsed),
      totalDeltaVSpent: s.totalDeltaVSpent + outcome.deltaVUsed,
      alarms: [
        {
          id: `anomaly-${def.id}-${Date.now()}`,
          severity: (outcome.verdict === 'bad' ? 'WARNING' : 'INFO') as FlightAlarm['severity'],
          time: Math.round(simTime),
          subsystem: def.subsystem.toUpperCase(),
          title: `${def.title}: ${option.label}`,
          condition: outcome.result,
          recommendedAction: outcome.lesson,
          acknowledged: true,
        },
        ...s.alarms,
      ].slice(0, 15),
    }))
  }

  const resume = () => {
    dismissOutcome()
    useAdvancedSimulationStore.setState({ isPaused: false })
  }

  return (
    <AnimatePresence>
      {(active || lastResolved) && (
        <motion.div
          key="anomaly-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-label={active ? `Anomaly: ${active.title}` : 'Anomaly outcome'}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="panel-surface max-h-[calc(100vh-2rem)] w-[min(640px,100%)] overflow-y-auto rounded-2xl p-6"
          >
            {active ? (
              <>
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-status-danger">
                  <AlertOctagon className="live-dot h-4 w-4" /> Anomaly · {active.subsystem}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{active.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{active.situation}</p>

                <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                  {active.facts(ctx).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                      <dt className="text-[11px] text-text-muted">{k}</dt>
                      <dd className="mt-0.5 font-mono text-sm text-text-primary">{v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 text-xs text-text-muted">
                  Decision owner:{' '}
                  <span className="font-semibold text-text-primary">
                    {crew.team ? `${crew.ownerOf(active.role).name} · ` : ''}
                    {roleInfo(active.role).title}
                  </span>
                  {' '}— the mission clock is held until you decide.
                </p>

                <div className="mt-3 space-y-2">
                  {active.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => choose(active, opt)}
                      className="w-full rounded-xl border border-white/10 bg-bg-elevated px-4 py-3 text-left transition hover:border-accent-blue/60 hover:bg-accent-blue/[0.07]"
                    >
                      <span className="block font-medium text-text-primary">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-text-muted">{opt.tradeoff}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              lastResolved && (
                <>
                  {(() => {
                    const v = VERDICT[lastResolved.outcome.verdict]
                    return (
                      <div className={cn('flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]', v.tone)}>
                        <v.icon className="h-4 w-4" /> {v.label}
                      </div>
                    )
                  })()}
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">{lastResolved.title}</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {lastResolved.decidedBy ? `${lastResolved.decidedBy} chose: ` : 'You chose: '}
                    <span className="text-text-secondary">{lastResolved.choice}</span>
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-text-primary">{lastResolved.outcome.result}</p>
                  <p className="mt-3 flex gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-sm leading-relaxed text-text-secondary">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
                    {lastResolved.outcome.lesson}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[11px] text-text-muted">Science lost</p>
                      <p className="font-mono text-sm">{lastResolved.outcome.scienceLossPct}%</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[11px] text-text-muted">Δv used</p>
                      <p className="font-mono text-sm">{lastResolved.outcome.deltaVUsed} m/s</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2">
                      <p className="text-[11px] text-text-muted">Score</p>
                      <p className={cn('font-mono text-sm', lastResolved.outcome.scoreDelta > 0 ? 'text-status-success' : lastResolved.outcome.scoreDelta < 0 ? 'text-status-danger' : '')}>
                        {lastResolved.outcome.scoreDelta > 0 ? '+' : ''}
                        {lastResolved.outcome.scoreDelta}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resume}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-3 font-semibold text-white transition hover:brightness-110"
                  >
                    <Play className="h-4 w-4" /> Resume operations
                  </button>
                </>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Compact log of decisions made so far, for the mission control page. */
export function DecisionLog({ missionId }: { missionId: string }) {
  const resolved = useAnomalyStore((s) => (s.missionId === missionId ? s.resolved : NO_DECISIONS))
  const total = anomaliesForMission(missionId).length
  const summary = summarizeDecisions(resolved)
  const nextAt = anomaliesForMission(missionId).find((d) => !resolved.some((r) => r.anomalyId === d.id))?.triggerAt
  return (
    <section className="panel-surface rounded-xl p-4" aria-label="Operations decisions">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-status-warning">
          <TriangleAlert className="h-4 w-4" /> Operations decisions
        </h3>
        <span className="font-mono text-[11px] text-text-muted">
          {resolved.length}/{total} · science retained {summary.scienceRetainedPct}%
        </span>
      </div>
      {resolved.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          Nominal so far. {nextAt !== undefined ? 'Stay alert — spacecraft rarely stay nominal for long.' : ''}
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {resolved.map((r) => {
            const v = VERDICT[r.outcome.verdict]
            return (
              <li key={r.anomalyId} className="flex items-start gap-2 text-xs">
                <v.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', v.tone)} />
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {r.title} <span className="font-normal text-text-muted">— {r.choice}</span>
                  </p>
                  <p className="text-text-muted">{r.outcome.result}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
