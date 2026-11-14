import { create } from 'zustand'

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface TelemetryData {
  elapsedTime: number // seconds
  phase: string
  phaseIndex: number
  position: { x: number; y: number; z: number }
  velocity: number // m/s
  fuelRemaining: number // percentage
  batteryEnergy: number // Wh
  powerBalance: number // W
  communicationStatus: 'nominal' | 'degraded' | 'blackout'
  spacecraftHealth: number // percentage
}

export interface MissionEvent {
  id: string
  name: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
  choices: EventChoice[]
  resolved: boolean
  chosenOption: string | null
}

export interface EventChoice {
  id: string
  label: string
  description: string
  impact: Record<string, number>
}

export interface MissionResult {
  missionId: string
  outcome: 'excellent' | 'success' | 'partial' | 'failure'
  completionPercentage: number
  objectivesCompleted: number
  totalObjectives: number
  score: number
  scientificData: number
  totalCost: number
  remainingFuel: number
  finalBattery: number
  communicationScore: number
  healthScore: number
  engineeringEfficiency: number
  budgetEfficiency: number
  timeline: Array<{ time: number; event: string }>
  achievements: string[]
  recommendations: string[]
}

interface SimulationState {
  status: SimulationStatus
  speed: number
  telemetry: TelemetryData
  events: MissionEvent[]
  decisions: Array<{ eventId: string; choiceId: string }>
  result: MissionResult | null
  missionPhases: string[]
  currentPhaseIndex: number

  // Actions
  startSimulation: (phases: string[]) => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  resetSimulation: () => void
  setSpeed: (speed: number) => void
  updateTelemetry: (data: Partial<TelemetryData>) => void
  triggerEvent: (event: MissionEvent) => void
  resolveEvent: (eventId: string, choiceId: string) => void
  advancePhase: () => void
  completeSimulation: (result: MissionResult) => void
  failSimulation: (result: MissionResult) => void
}

const initialTelemetry: TelemetryData = {
  elapsedTime: 0,
  phase: 'Pre-launch',
  phaseIndex: 0,
  position: { x: 0, y: 0, z: 0 },
  velocity: 0,
  fuelRemaining: 100,
  batteryEnergy: 100,
  powerBalance: 0,
  communicationStatus: 'nominal',
  spacecraftHealth: 100,
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  status: 'idle',
  speed: 1,
  telemetry: initialTelemetry,
  events: [],
  decisions: [],
  result: null,
  missionPhases: [],
  currentPhaseIndex: 0,

  startSimulation: (phases) => {
    set({
      status: 'running',
      speed: 1,
      telemetry: { ...initialTelemetry, phase: phases[0] ?? 'Launch' },
      events: [],
      decisions: [],
      result: null,
      missionPhases: phases,
      currentPhaseIndex: 0,
    })
  },

  pauseSimulation: () => set({ status: 'paused' }),
  resumeSimulation: () => set({ status: 'running' }),

  resetSimulation: () => {
    set({
      status: 'idle',
      speed: 1,
      telemetry: initialTelemetry,
      events: [],
      decisions: [],
      result: null,
      missionPhases: [],
      currentPhaseIndex: 0,
    })
  },

  setSpeed: (speed) => set({ speed }),

  updateTelemetry: (data) => {
    set((state) => ({
      telemetry: { ...state.telemetry, ...data },
    }))
  },

  triggerEvent: (event) => {
    set((state) => ({
      events: [...state.events, event],
      status: 'paused',
    }))
  },

  resolveEvent: (eventId, choiceId) => {
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, resolved: true, chosenOption: choiceId } : e
      ),
      decisions: [...state.decisions, { eventId, choiceId }],
      status: 'running',
    }))
  },

  advancePhase: () => {
    const { currentPhaseIndex, missionPhases } = get()
    const nextIndex = currentPhaseIndex + 1
    if (nextIndex < missionPhases.length) {
      set({
        currentPhaseIndex: nextIndex,
        telemetry: {
          ...get().telemetry,
          phase: missionPhases[nextIndex]!,
          phaseIndex: nextIndex,
        },
      })
    }
  },

  completeSimulation: (result) => {
    set({ status: 'completed', result })
  },

  failSimulation: (result) => {
    set({ status: 'failed', result })
  },
}))
