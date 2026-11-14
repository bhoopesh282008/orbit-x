import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MissionDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'
export type MissionStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'failed'

export interface MissionObjective {
  id: string
  description: string
  required: boolean
  completed: boolean
}

export interface MissionRequirement {
  type: 'instrument' | 'communication' | 'power' | 'fuel' | 'mass'
  description: string
  value: number
  unit: string
}

export interface Mission {
  id: string
  name: string
  codename: string
  destination: string
  description: string
  briefing: string
  difficulty: MissionDifficulty
  budget: number
  duration: string
  durationDays: number
  objectives: MissionObjective[]
  requirements: MissionRequirement[]
  requiredInstruments: string[]
  maxPayloadMass: number
  minDeltaV: number
  unlockCondition: string | null
  status: MissionStatus
  completionPercentage: number
  score: number | null
  imageColor: string
  order: number
}

interface MissionState {
  missions: Mission[]
  activeMissionId: string | null
  campaignProgress: number
  
  // Actions
  initializeMissions: () => void
  selectMission: (missionId: string) => void
  startMission: (missionId: string) => void
  completeMission: (missionId: string, score: number, percentage: number) => void
  failMission: (missionId: string) => void
  unlockMission: (missionId: string) => void
  resetMissions: () => void
  loadUserMissions: (userId: string) => void
  getMission: (missionId: string) => Mission | undefined
}

function saveUserMissionsToStorage(userId: string, missions: Mission[], activeMissionId: string | null, campaignProgress: number) {
  if (!userId) return
  try {
    localStorage.setItem(`orbitx_user_${userId}_missions`, JSON.stringify({ missions, activeMissionId, campaignProgress }))
  } catch {}
}

const initialMissions: Mission[] = [
  {
    id: 'lunar-explorer',
    name: 'Lunar Explorer',
    codename: 'MISSION 01',
    destination: 'Moon',
    description: 'Deploy a scientific exploration spacecraft to lunar orbit. Your first step into deep space.',
    briefing: 'Mission Control has approved your first deep space assignment. You will design and deploy a spacecraft capable of reaching lunar orbit, conducting scientific observations, and maintaining communication with Earth. This mission will test your understanding of spacecraft engineering fundamentals including mass budgets, power systems, and orbital mechanics. Budget is limited — every component choice matters.',
    difficulty: 'Easy',
    budget: 230000, // cheapest valid lunar spacecraft + heavy launcher ≈ 192–206k
    duration: '14 days',
    durationDays: 14,
    objectives: [
      { id: 'lo-1', description: 'Reach lunar orbit', required: true, completed: false },
      { id: 'lo-2', description: 'Collect lunar observation data', required: true, completed: false },
      { id: 'lo-3', description: 'Maintain Earth communication', required: true, completed: false },
      { id: 'lo-4', description: 'Complete within budget', required: false, completed: false },
    ],
    requirements: [
      { type: 'fuel', description: 'Minimum delta-v for lunar transfer', value: 3200, unit: 'm/s' },
      { type: 'communication', description: 'Communication range', value: 400000, unit: 'km' },
      { type: 'power', description: 'Minimum power generation', value: 200, unit: 'W' },
    ],
    requiredInstruments: ['camera'],
    maxPayloadMass: 2500,
    minDeltaV: 3200,
    unlockCondition: null,
    status: 'available',
    completionPercentage: 0,
    score: null,
    imageColor: '#94A3B8',
    order: 1,
  },
  {
    id: 'earth-observer',
    name: 'Earth Observer',
    codename: 'MISSION 02',
    destination: 'Earth Orbit',
    description: 'Deploy an Earth observation satellite to low Earth orbit for environmental monitoring.',
    briefing: 'Environmental agencies require a new observation satellite in low Earth orbit. Your task is to design a spacecraft that can reach the target orbit, deploy its instruments, and continuously transmit observation data back to ground stations. Power management is critical — the satellite must operate through eclipse periods using battery reserves. This mission tests your ability to balance power generation, storage, and consumption.',
    difficulty: 'Medium',
    budget: 200000,
    duration: '30 days',
    durationDays: 30,
    objectives: [
      { id: 'eo-1', description: 'Reach target Earth orbit', required: true, completed: false },
      { id: 'eo-2', description: 'Deploy observation satellite', required: true, completed: false },
      { id: 'eo-3', description: 'Maintain electrical power', required: true, completed: false },
      { id: 'eo-4', description: 'Transmit observation data', required: true, completed: false },
      { id: 'eo-5', description: 'Achieve 95% uptime', required: false, completed: false },
    ],
    requirements: [
      { type: 'fuel', description: 'Minimum delta-v for orbit insertion', value: 2200, unit: 'm/s' },
      { type: 'communication', description: 'Communication range', value: 2000, unit: 'km' },
      { type: 'power', description: 'Minimum power generation', value: 350, unit: 'W' },
    ],
    requiredInstruments: ['camera', 'spectrometer'],
    maxPayloadMass: 3000,
    minDeltaV: 2200,
    unlockCondition: 'lunar-explorer',
    status: 'locked',
    completionPercentage: 0,
    score: null,
    imageColor: '#3B82F6',
    order: 2,
  },
  {
    id: 'mars-pathfinder',
    name: 'Mars Pathfinder',
    codename: 'MISSION 03',
    destination: 'Mars',
    description: 'Design a spacecraft for interplanetary travel to Mars. The ultimate engineering challenge.',
    briefing: 'You have been selected to lead humanity\'s next Mars mission. Design a spacecraft capable of surviving the 7-month journey to Mars, entering Mars orbit, and conducting extensive scientific observations. This is the most demanding mission available — requiring careful management of fuel for the long transit, robust power systems for deep space operation, and a deep-space communication antenna capable of reaching Earth from 225 million kilometers away. Every kilogram counts.',
    difficulty: 'Hard',
    budget: 350000,
    duration: '210 days',
    durationDays: 210,
    objectives: [
      { id: 'mp-1', description: 'Complete Earth departure', required: true, completed: false },
      { id: 'mp-2', description: 'Survive interplanetary cruise', required: true, completed: false },
      { id: 'mp-3', description: 'Reach Mars orbit', required: true, completed: false },
      { id: 'mp-4', description: 'Establish orbital operations', required: true, completed: false },
      { id: 'mp-5', description: 'Collect scientific data', required: true, completed: false },
      { id: 'mp-6', description: 'Maintain deep-space communication', required: false, completed: false },
    ],
    requirements: [
      { type: 'fuel', description: 'Minimum delta-v for Mars transfer', value: 5600, unit: 'm/s' },
      { type: 'communication', description: 'Deep space communication range', value: 225000000, unit: 'km' },
      { type: 'power', description: 'Minimum power generation', value: 500, unit: 'W' },
    ],
    requiredInstruments: ['camera', 'spectrometer', 'magnetometer'],
    maxPayloadMass: 5000,
    minDeltaV: 5600,
    unlockCondition: 'earth-observer',
    status: 'locked',
    completionPercentage: 0,
    score: null,
    imageColor: '#EF4444',
    order: 3,
  },
]

export const useMissionStore = create<MissionState>()(
  persist(
    (set, get) => ({
      missions: initialMissions,
      activeMissionId: null,
      campaignProgress: 0,

      initializeMissions: () => {
        const { missions } = get()
        if (missions.length === 0) {
          set({ missions: initialMissions })
        }
      },

      selectMission: (missionId) => {
        set({ activeMissionId: missionId })
      },

      startMission: (missionId) => {
        set((state) => {
          const updatedMissions = state.missions.map((m) =>
            m.id === missionId ? { ...m, status: 'in-progress' as const } : m
          )
          const currentUserId = localStorage.getItem('orbitx_current_user_id') || ''
          saveUserMissionsToStorage(currentUserId, updatedMissions, missionId, state.campaignProgress)
          return {
            activeMissionId: missionId,
            missions: updatedMissions,
          }
        })
      },

      completeMission: (missionId, score, percentage) => {
        set((state) => {
          const updatedMissions = state.missions.map((m) => {
            if (m.id === missionId) {
              return { ...m, status: 'completed' as const, score, completionPercentage: percentage }
            }
            // Unlock next mission
            if (m.unlockCondition === missionId && m.status === 'locked') {
              return { ...m, status: 'available' as const }
            }
            return m
          })

          const completed = updatedMissions.filter((m) => m.status === 'completed').length
          const total = updatedMissions.length
          const progress = Math.round((completed / total) * 100)

          const currentUserId = localStorage.getItem('orbitx_current_user_id') || ''
          saveUserMissionsToStorage(currentUserId, updatedMissions, state.activeMissionId, progress)

          return {
            missions: updatedMissions,
            campaignProgress: progress,
          }
        })
      },

      failMission: (missionId) => {
        set((state) => ({
          missions: state.missions.map((m) =>
            m.id === missionId ? { ...m, status: 'available' as const } : m
          ),
        }))
      },

      unlockMission: (missionId) => {
        set((state) => ({
          missions: state.missions.map((m) =>
            m.id === missionId ? { ...m, status: 'available' as const } : m
          ),
        }))
        // Persist for the signed-in user so a later session reload keeps the unlock
        try {
          const userId = localStorage.getItem('orbitx_current_user_id')
          const st = get()
          if (userId) saveUserMissionsToStorage(userId, st.missions, st.activeMissionId, st.campaignProgress)
        } catch {
          /* storage unavailable */
        }
      },

      loadUserMissions: (userId: string) => {
        const scopedKey = `orbitx_user_${userId}_missions`
        try {
          const raw = localStorage.getItem(scopedKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.missions) && parsed.missions.length > 0) {
              // Keep the player's progress, but refresh mission definitions (budgets, limits)
              // so balance fixes reach existing saves.
              const merged = (parsed.missions as Mission[]).map((saved) => {
                const def = initialMissions.find((m) => m.id === saved.id)
                return def
                  ? { ...def, status: saved.status, score: saved.score, completionPercentage: saved.completionPercentage, objectives: saved.objectives ?? def.objectives }
                  : saved
              })
              set({
                missions: merged,
                activeMissionId: parsed.activeMissionId || null,
                campaignProgress: parsed.campaignProgress || 0,
              })
              return
            }
          }
        } catch {}

        set({
          missions: initialMissions,
          activeMissionId: null,
          campaignProgress: 0,
        })
        saveUserMissionsToStorage(userId, initialMissions, null, 0)
      },

      resetMissions: () => {
        set({
          missions: initialMissions,
          activeMissionId: null,
          campaignProgress: 0,
        })
      },

      getMission: (missionId) => {
        return get().missions.find((m) => m.id === missionId)
      },
    }),
    {
      name: 'orbit-x-missions',
    }
  )
)
