import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { detectDefaultQuality } from '@/hooks/useGraphicsProfile'

export interface PlayerProfile {
  id: string
  name: string
  title: string
  level: number
  xp: number
  xpToNextLevel: number
  credits: number
  totalMissions: number
  completedMissions: number
  successRate: number
  totalDiscoveries: number
  achievements: string[]
  createdAt: string
}

const defaultPlayer: PlayerProfile = {
  id: 'commander-001',
  name: 'Commander',
  title: 'Mission Engineer',
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  credits: 500000,
  totalMissions: 0,
  completedMissions: 0,
  successRate: 0,
  totalDiscoveries: 0,
  achievements: [],
  createdAt: new Date().toISOString(),
}

interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  graphicsQuality: 'low' | 'medium' | 'high'
  showTutorials: boolean
  simulationSpeed: number
  units: 'metric' | 'imperial'
  customCursorEnabled: boolean
  cursorMode: 'targeting' | 'spacecraft'
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  graphicsQuality: detectDefaultQuality(),
  showTutorials: true,
  simulationSpeed: 1,
  units: 'metric',
  customCursorEnabled: true,
  cursorMode: 'targeting',
}

interface GameState {
  player: PlayerProfile
  settings: GameSettings
  isInitialized: boolean
  
  // Actions
  initializeGame: () => void
  updatePlayer: (updates: Partial<PlayerProfile>) => void
  addXP: (amount: number) => void
  addCredits: (amount: number) => void
  spendCredits: (amount: number) => boolean
  unlockAchievement: (achievementId: string) => void
  updateSettings: (updates: Partial<GameSettings>) => void
  resetProgress: () => void
  loadUserGameData: (userId: string, defaultName?: string) => void
}

function saveUserGameDataToStorage(userId: string, player: PlayerProfile, settings: GameSettings) {
  if (!userId) return
  try {
    localStorage.setItem(`orbitx_user_${userId}_game`, JSON.stringify({ player, settings }))
  } catch {}
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: defaultPlayer,
      settings: defaultSettings,
      isInitialized: false,

      loadUserGameData: (userId: string, defaultName?: string) => {
        const scopedKey = `orbitx_user_${userId}_game`
        try {
          const raw = localStorage.getItem(scopedKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.player) {
              set({
                player: {
                  ...defaultPlayer,
                  ...parsed.player,
                  id: userId,
                  name: defaultName || parsed.player.name || defaultPlayer.name,
                },
                settings: { ...defaultSettings, ...(parsed.settings || {}) },
                isInitialized: true,
              })
              return
            }
          }
        } catch {}

        const freshPlayer: PlayerProfile = {
          ...defaultPlayer,
          id: userId,
          name: defaultName || 'Commander',
          createdAt: new Date().toISOString(),
        }
        set({
          player: freshPlayer,
          settings: defaultSettings,
          isInitialized: true,
        })
        saveUserGameDataToStorage(userId, freshPlayer, defaultSettings)
      },

      initializeGame: () => {
        set({ isInitialized: true })
      },

      updatePlayer: (updates) => {
        set((state) => {
          const updated = { ...state.player, ...updates }
          saveUserGameDataToStorage(state.player.id, updated, state.settings)
          return { player: updated }
        })
      },

      addXP: (amount) => {
        set((state) => {
          let newXP = state.player.xp + amount
          let newLevel = state.player.level
          let newXPToNext = state.player.xpToNextLevel

          while (newXP >= newXPToNext) {
            newXP -= newXPToNext
            newLevel += 1
            newXPToNext = Math.floor(newXPToNext * 1.5)
          }

          const updatedPlayer = {
            ...state.player,
            xp: newXP,
            level: newLevel,
            xpToNextLevel: newXPToNext,
          }
          saveUserGameDataToStorage(state.player.id, updatedPlayer, state.settings)

          return { player: updatedPlayer }
        })
      },

      addCredits: (amount) => {
        set((state) => {
          const updatedPlayer = { ...state.player, credits: state.player.credits + amount }
          saveUserGameDataToStorage(state.player.id, updatedPlayer, state.settings)
          return { player: updatedPlayer }
        })
      },

      spendCredits: (amount) => {
        const { player, settings } = get()
        if (player.credits >= amount) {
          const updatedPlayer = { ...player, credits: player.credits - amount }
          set({ player: updatedPlayer })
          saveUserGameDataToStorage(player.id, updatedPlayer, settings)
          return true
        }
        return false
      },

      unlockAchievement: (achievementId) => {
        set((state) => {
          if (state.player.achievements.includes(achievementId)) return state
          const updatedPlayer = {
            ...state.player,
            achievements: [...state.player.achievements, achievementId],
          }
          saveUserGameDataToStorage(state.player.id, updatedPlayer, state.settings)
          return { player: updatedPlayer }
        })
      },

      updateSettings: (updates) => {
        set((state) => {
          const updatedSettings = { ...state.settings, ...updates }
          saveUserGameDataToStorage(state.player.id, state.player, updatedSettings)
          return { settings: updatedSettings }
        })
      },

      resetProgress: () => {
        set({
          player: defaultPlayer,
          isInitialized: false,
        })
      },
    }),
    {
      name: 'orbit-x-game',
      partialize: (state) => ({
        player: state.player,
        settings: state.settings,
        isInitialized: state.isInitialized,
      }),
    }
  )
)
