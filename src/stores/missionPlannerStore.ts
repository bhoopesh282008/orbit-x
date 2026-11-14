import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMissionTrajectoryPlan, type MissionTrajectoryPlan } from '@/services/flightDynamics'

export interface PlannedManeuverNode {
  id: string
  name: string
  scheduledTimeSeconds: number
  deltaVRequired: number // m/s
  burnDurationSeconds: number
  propellantConsumptionKg: number
  purpose: string
  executed: boolean
}

interface MissionPlannerState {
  missionId: string
  selectedWindowId: string
  selectedDestinationOrbit: string
  trajectoryPlan: MissionTrajectoryPlan | null
  plannedManeuvers: PlannedManeuverNode[]
  userReserveDeltaVMargin: number // user adjusted safety buffer (m/s)

  // Actions
  initializePlan: (missionId: string) => void
  selectWindow: (windowId: string) => void
  setDestinationOrbit: (orbit: string) => void
  setReserveDeltaV: (reserve: number) => void
  addManeuverNode: (node: PlannedManeuverNode) => void
  removeManeuverNode: (nodeId: string) => void
}

export const useMissionPlannerStore = create<MissionPlannerState>()(
  persist(
    (set, get) => ({
      missionId: 'lunar-explorer',
      selectedWindowId: 'l1',
      selectedDestinationOrbit: 'Polar Circular (100km)',
      trajectoryPlan: getMissionTrajectoryPlan('lunar-explorer'),
      plannedManeuvers: [
        {
          id: 'mn-1',
          name: 'Trans-Destination Injection (TDI)',
          scheduledTimeSeconds: 3600,
          deltaVRequired: 3150,
          burnDurationSeconds: 420,
          propellantConsumptionKg: 380,
          purpose: 'Escape low Earth parking orbit into transfer ellipse',
          executed: false,
        },
        {
          id: 'mn-2',
          name: 'Mid-Course Correction 1 (MCC-1)',
          scheduledTimeSeconds: 86400,
          deltaVRequired: 85,
          burnDurationSeconds: 22,
          propellantConsumptionKg: 18,
          purpose: 'Correct injection dispersion error vectors',
          executed: false,
        },
        {
          id: 'mn-3',
          name: 'Target Orbit Insertion (TOI)',
          scheduledTimeSeconds: 328000,
          deltaVRequired: 850,
          burnDurationSeconds: 160,
          propellantConsumptionKg: 145,
          purpose: 'Retro-burn to achieve circular capture orbit',
          executed: false,
        },
      ],
      userReserveDeltaVMargin: 150,

      initializePlan: (missionId: string) => {
        const plan = getMissionTrajectoryPlan(missionId)
        set({
          missionId,
          trajectoryPlan: plan,
          selectedWindowId: plan.launchWindows[0]?.id || 'w1',
        })
      },

      selectWindow: (windowId: string) => {
        set({ selectedWindowId: windowId })
      },

      setDestinationOrbit: (orbit: string) => {
        set({ selectedDestinationOrbit: orbit })
      },

      setReserveDeltaV: (reserve: number) => {
        set({ userReserveDeltaVMargin: reserve })
      },

      addManeuverNode: (node: PlannedManeuverNode) => {
        set({ plannedManeuvers: [...get().plannedManeuvers, node] })
      },

      removeManeuverNode: (nodeId: string) => {
        set({ plannedManeuvers: get().plannedManeuvers.filter((m) => m.id !== nodeId) })
      },
    }),
    {
      name: 'orbit-x-mission-planner',
    }
  )
)

