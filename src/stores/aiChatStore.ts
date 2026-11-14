import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPONENT_CATALOGUE } from '@/data/components'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useMissionStore } from '@/stores/missionStore'
import { useGameStore } from '@/stores/gameStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useLaunchSimulationStore } from '@/stores/launchSimulationStore'
import { calculateSpacecraftMetrics } from '@/services/engineeringCalculations'

export type ChatMode =
  | 'GENERAL'
  | 'ANALYSIS'
  | 'PLANNING'
  | 'TROUBLESHOOTING'
  | 'OPTIMIZATION'
  | 'FAILURE_ANALYSIS'

export interface ComponentRecommendation {
  action: 'replace_component' | 'add_component' | 'remove_component'
  currentComponentId?: string
  recommendedComponentId: string
  reason: string
  estimatedImpact: {
    massDeltaKg?: number
    costDeltaCredits?: number
    powerDeltaWatts?: number
    deltaVDeltaMps?: number
  }
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  content: string
  timestamp: number
  mode?: ChatMode
  suggestions?: string[]
  recommendations?: ComponentRecommendation[]
  applied?: boolean
}

interface AIChatStore {
  isOpen: boolean
  isMinimized: boolean
  isLoading: boolean
  activeMode: ChatMode
  messages: ChatMessage[]
  lastUndoState: any | null

  // Actions
  toggleOpen: () => void
  setOpen: (open: boolean) => void
  toggleMinimize: () => void
  setMode: (mode: ChatMode) => void
  clearMessages: () => void
  sendMessage: (query: string) => Promise<void>
  applyRecommendation: (messageId: string, recIndex: number) => void
  applyAllRecommendations: (messageId: string) => void
  undoLastModifications: () => void
}

const INITIAL_WELCOME: ChatMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  content:
    'Welcome, Commander! I am your **ORBIT-X AI Mission Engineering Assistant**.\n\nI can analyze your spacecraft telemetry, troubleshoot engineering violations, recommend optimal component configurations, and guide you through complete launch readiness.\n\nWhat would you like to investigate today?',
  timestamp: Date.now(),
  suggestions: [
    'Analyze My Spacecraft',
    'Why Can’t I Launch?',
    'Fix Engineering Failures',
    'Optimize My Spacecraft',
    'Check Power Balance',
    'Improve Delta-v',
  ],
}

export const useAIChatStore = create<AIChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      isLoading: false,
      activeMode: 'GENERAL',
      messages: [INITIAL_WELCOME],
      lastUndoState: null,

      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen, isMinimized: false })),
      setOpen: (open) => set({ isOpen: open, isMinimized: false }),
      toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
      setMode: (mode) => set({ activeMode: mode }),

      clearMessages: () => set({ messages: [INITIAL_WELCOME] }),

      sendMessage: async (query: string) => {
        if (!query.trim() || get().isLoading) return

        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'user',
          content: query.trim(),
          timestamp: Date.now(),
          mode: get().activeMode,
        }

        set((s) => ({
          messages: [...s.messages, userMsg],
          isLoading: true,
        }))

        // Collect comprehensive real-time context
        const player = useGameStore.getState().player
        const missions = useMissionStore.getState().missions
        const missionId = useSpacecraftStore.getState().missionId
        const activeMission = missions.find((m) => m.id === missionId) || missions[0]
        const components = useSpacecraftStore.getState().selectedComponents
        const launchVehicle = useSpacecraftStore.getState().selectedLaunchVehicle
        const metrics = calculateSpacecraftMetrics(components, launchVehicle, activeMission)
        const simTelemetry = useSimulationStore.getState().telemetry
        const launchTelemetry = useLaunchSimulationStore.getState().telemetry

        const context = {
          player: {
            name: player.name,
            level: player.level,
            credits: player.credits,
            completedMissions: player.completedMissions,
          },
          mission: {
            id: activeMission?.id,
            name: activeMission?.name,
            destination: activeMission?.destination,
            budget: activeMission?.budget,
            requiredInstruments: activeMission?.requiredInstruments,
          },
          spacecraft: {
            vehicle: launchVehicle?.name,
            components: components.map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
              mass: c.mass,
              cost: c.cost,
              powerGeneration: c.powerGeneration,
              powerConsumption: c.powerConsumption,
            })),
          },
          metrics: {
            totalMassKg: metrics.totalMassKg,
            propellantMassKg: metrics.propellantMassKg,
            totalAvailableDeltaV: metrics.totalAvailableDeltaV,
            requiredMissionDeltaV: metrics.requiredMissionDeltaV,
            powerGenerationWatts: metrics.powerGenerationWatts,
            powerConsumptionWatts: metrics.powerConsumptionWatts,
            powerBalanceWatts: metrics.powerBalanceWatts,
            isOverBudget: metrics.isOverBudget,
            isOverMassLimit: metrics.isOverMassLimit,
            hasStructureBus: metrics.hasStructureBus,
            missingInstruments: metrics.missingInstruments,
          },
          simulation: {
            flightPhase: launchTelemetry.phase,
            altitudeKm: launchTelemetry.altitude,
            totalVelocityMps: launchTelemetry.totalVelocity,
            spacecraftDeployed: launchTelemetry.spacecraftDeployed,
            health: simTelemetry.spacecraftHealth,
          },
        }

        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              mode: get().activeMode,
              context,
            }),
          })

          const data = await res.json()
          if (!data.success) {
            throw new Error(data.error || 'AI request failed')
          }

          const aiData = data.data
          const aiMsg: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: 'assistant',
            content: aiData.message || 'Analysis complete.',
            timestamp: Date.now(),
            mode: get().activeMode,
            suggestions: aiData.suggestions || [
              'Review spacecraft configuration',
              'Check launch readiness',
              'Optimize power margins',
            ],
            recommendations: aiData.recommendations || [],
            applied: false,
          }

          set((s) => ({
            messages: [...s.messages, aiMsg],
            isLoading: false,
          }))
        } catch (err: any) {
          const errorMsg: ChatMessage = {
            id: `msg-err-${Date.now()}`,
            sender: 'assistant',
            content:
              '⚠️ **AI service is temporarily unavailable.**\n\nYour spacecraft configuration has not been modified. You may retry your question or continue manual spacecraft configuration in the Workstation.',
            timestamp: Date.now(),
            suggestions: ['Retry question', 'Check power balance', 'Optimize delta-v'],
          }
          set((s) => ({
            messages: [...s.messages, errorMsg],
            isLoading: false,
          }))
        }
      },

      applyRecommendation: (messageId: string, recIndex: number) => {
        const msg = get().messages.find((m) => m.id === messageId)
        if (!msg || !msg.recommendations || !msg.recommendations[recIndex]) return

        const rec = msg.recommendations[recIndex]
        const spacecraft = useSpacecraftStore.getState()

        // Save undo snapshot
        set({ lastUndoState: [...spacecraft.selectedComponents] })

        const targetComponent = COMPONENT_CATALOGUE.find(
          (c) => c.id === rec.recommendedComponentId
        )

        if (rec.action === 'replace_component' && targetComponent) {
          if (rec.currentComponentId) {
            spacecraft.replaceComponent(rec.currentComponentId, targetComponent)
          } else {
            const old = spacecraft.selectedComponents.find(
              (c) => c.category === targetComponent.category
            )
            if (old) {
              spacecraft.replaceComponent(old.id, targetComponent)
            } else {
              spacecraft.addComponent(targetComponent)
            }
          }
        } else if (rec.action === 'add_component' && targetComponent) {
          spacecraft.addComponent(targetComponent)
        } else if (rec.action === 'remove_component' && rec.currentComponentId) {
          spacecraft.removeComponent(rec.currentComponentId)
        }

        // Mark as applied
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, applied: true } : m
          ),
        }))
      },

      applyAllRecommendations: (messageId: string) => {
        const msg = get().messages.find((m) => m.id === messageId)
        if (!msg || !msg.recommendations) return

        msg.recommendations.forEach((_, idx) => {
          get().applyRecommendation(messageId, idx)
        })
      },

      undoLastModifications: () => {
        const undo = get().lastUndoState
        if (undo) {
          useSpacecraftStore.setState({ selectedComponents: undo })
          set({ lastUndoState: null })
        }
      },
    }),
    {
      name: 'orbitx_ai_chat_session',
      partialize: (state) => ({
        messages: state.messages.slice(-25), // keep last 25 messages
      }),
    }
  )
)

