import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnomalyOutcome } from '@/services/anomalies'
import type { RoleId } from '@/stores/crewStore'

export interface ResolvedAnomaly {
  anomalyId: string
  title: string
  role: RoleId
  /** Display name of whoever made the call (co-op) */
  decidedBy?: string
  choice: string
  outcome: AnomalyOutcome
  atSimTime: number
}

interface AnomalyState {
  missionId: string | null
  /** Anomaly waiting for a decision (sim is paused while set) */
  activeId: string | null
  /** Outcome shown after a decision, until the player resumes */
  lastResolved: ResolvedAnomaly | null
  resolved: ResolvedAnomaly[]

  reset: (missionId: string) => void
  trigger: (anomalyId: string) => void
  resolve: (r: ResolvedAnomaly) => void
  dismissOutcome: () => void
}

export const useAnomalyStore = create<AnomalyState>()(
  persist(
    (set) => ({
      missionId: null,
      activeId: null,
      lastResolved: null,
      resolved: [],

      reset: (missionId) => set({ missionId, activeId: null, lastResolved: null, resolved: [] }),
      trigger: (anomalyId) => set({ activeId: anomalyId }),
      resolve: (r) => set((s) => ({ activeId: null, lastResolved: r, resolved: [...s.resolved, r] })),
      dismissOutcome: () => set({ lastResolved: null }),
    }),
    { name: 'orbit-x-anomalies' }
  )
)

/** Stable empty list so selectors never return a fresh array (avoids re-render loops). */
export const NO_DECISIONS: ResolvedAnomaly[] = []

/** Aggregate effect of all decisions on the mission debrief. */
export function summarizeDecisions(resolved: ResolvedAnomaly[]) {
  // Science losses compound: two 20% losses leave 64%, not 60%
  const scienceRetained = resolved.reduce((acc, r) => acc * (1 - r.outcome.scienceLossPct / 100), 1)
  return {
    scienceRetainedPct: Math.round(scienceRetained * 100),
    scoreDelta: resolved.reduce((s, r) => s + r.outcome.scoreDelta, 0),
    deltaVUsed: resolved.reduce((s, r) => s + r.outcome.deltaVUsed, 0),
    good: resolved.filter((r) => r.outcome.verdict === 'good').length,
    bad: resolved.filter((r) => r.outcome.verdict === 'bad').length,
  }
}
