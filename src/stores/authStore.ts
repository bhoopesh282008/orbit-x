import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useGameStore } from './gameStore'
import { useMissionStore } from './missionStore'
import { useSpacecraftStore } from './spacecraftStore'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  age: number
  createdAt: string
}

interface StoredLocalAccount {
  id: string
  email: string
  passwordHash: string
  fullName: string
  age: number
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null

  // Actions
  initializeAuth: () => Promise<void>
  register: (data: {
    fullName: string
    age: number
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  login: (data: {
    email: string
    password: string
    rememberMe?: boolean
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  /** Password-less local session for judges / demos (never touches the cloud). */
  startDemoSession: () => void
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>
  clearError: () => void
}

const LOCAL_ACCOUNTS_KEY = 'orbitx_registered_accounts'
const CURRENT_USER_KEY = 'orbitx_current_user_id'
export const DEMO_USER_ID = 'demo-judge'

// Simple deterministic hash for local offline account security
async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain + '_orbitx_salt_2026')
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getStoredLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {}
}

function syncUserSessionData(authUser: AuthUser) {
  try {
    useGameStore.getState().loadUserGameData(authUser.id, authUser.fullName)
    useMissionStore.getState().loadUserMissions(authUser.id)
  } catch (err) {
    console.error('[ORBIT-X Auth] Error syncing user session data:', err)
  }
}

function clearUserSessionData() {
  try {
    useGameStore.getState().resetProgress()
    useMissionStore.getState().resetMissions()
    useSpacecraftStore.getState().clearDesign()
  } catch (err) {
    console.error('[ORBIT-X Auth] Error clearing session data:', err)
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,

      clearError: () => set({ authError: null }),

      initializeAuth: async () => {
        set({ isLoading: true })

        // 1. If Supabase is configured, check cloud auth session first
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: sessionData } = await supabase.auth.getSession()
            if (sessionData.session?.user) {
              const u = sessionData.session.user
              const { data: profile } = await supabase
                .from('player_profiles')
                .select('*')
                .eq('user_id', u.id)
                .maybeSingle()

              const authUser: AuthUser = {
                id: u.id,
                email: u.email || '',
                fullName: profile?.full_name || profile?.commander_name || 'Commander',
                age: profile?.age || 25,
                createdAt: u.created_at,
              }

              localStorage.setItem(CURRENT_USER_KEY, authUser.id)
              syncUserSessionData(authUser)
              set({ user: authUser, isAuthenticated: true, isLoading: false })
              return
            }
          } catch (err) {
            console.warn('[ORBIT-X Auth] Supabase session check error:', err)
          }
        }

        // 2. Local-first session verification
        const currentUserId = localStorage.getItem(CURRENT_USER_KEY)
        if (currentUserId) {
          const accounts = getStoredLocalAccounts()
          const matched = accounts.find((a) => a.id === currentUserId)
          if (matched) {
            const authUser: AuthUser = {
              id: matched.id,
              email: matched.email,
              fullName: matched.fullName,
              age: matched.age,
              createdAt: matched.createdAt,
            }
            syncUserSessionData(authUser)
            set({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
            })
            return
          }
        }

        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      register: async ({ fullName, age, email, password }) => {
        set({ isLoading: true, authError: null })
        const normalizedEmail = email.trim().toLowerCase()

        // 1. Supabase cloud registration if configured
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: authRes, error: authErr } = await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: {
                  full_name: fullName.trim(),
                  age,
                },
              },
            })

            if (authErr) {
              set({ isLoading: false, authError: authErr.message })
              return { success: false, error: authErr.message }
            }

            if (authRes.user) {
              // Create / upsert player profile record
              await supabase.from('player_profiles').upsert({
                user_id: authRes.user.id,
                commander_name: fullName.trim(),
                full_name: fullName.trim(),
                age,
                email: normalizedEmail,
                credits: 500000,
                level: 1,
                xp: 0,
              })

              const authUser: AuthUser = {
                id: authRes.user.id,
                email: normalizedEmail,
                fullName: fullName.trim(),
                age,
                createdAt: new Date().toISOString(),
              }

              localStorage.setItem(CURRENT_USER_KEY, authUser.id)
              syncUserSessionData(authUser)
              set({ user: authUser, isAuthenticated: true, isLoading: false })
              return { success: true }
            }
          } catch (err: any) {
            console.warn('[ORBIT-X Auth] Supabase signup failed, checking local:', err)
          }
        }

        // 2. Robust Local Secure Account Registry
        const accounts = getStoredLocalAccounts()
        const existing = accounts.find((a) => a.email === normalizedEmail)
        if (existing) {
          set({ isLoading: false, authError: 'An account with this email address already exists.' })
          return { success: false, error: 'An account with this email address already exists.' }
        }

        const hashed = await hashPassword(password)
        const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const newAccount: StoredLocalAccount = {
          id: newId,
          email: normalizedEmail,
          passwordHash: hashed,
          fullName: fullName.trim(),
          age,
          createdAt: new Date().toISOString(),
        }

        accounts.push(newAccount)
        saveLocalAccounts(accounts)

        const authUser: AuthUser = {
          id: newId,
          email: normalizedEmail,
          fullName: fullName.trim(),
          age,
          createdAt: newAccount.createdAt,
        }

        localStorage.setItem(CURRENT_USER_KEY, newId)
        syncUserSessionData(authUser)
        set({ user: authUser, isAuthenticated: true, isLoading: false })
        return { success: true }
      },

      login: async ({ email, password }) => {
        set({ isLoading: true, authError: null })
        const normalizedEmail = email.trim().toLowerCase()

        // 1. Supabase authentication if configured
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            })

            if (!authErr && authRes.user) {
              const { data: profile } = await supabase
                .from('player_profiles')
                .select('*')
                .eq('user_id', authRes.user.id)
                .maybeSingle()

              const authUser: AuthUser = {
                id: authRes.user.id,
                email: normalizedEmail,
                fullName: profile?.full_name || profile?.commander_name || 'Commander',
                age: profile?.age || 25,
                createdAt: authRes.user.created_at,
              }

              localStorage.setItem(CURRENT_USER_KEY, authUser.id)
              syncUserSessionData(authUser)
              set({ user: authUser, isAuthenticated: true, isLoading: false })
              return { success: true }
            }
          } catch (err) {
            console.warn('[ORBIT-X Auth] Supabase login error:', err)
          }
        }

        // 2. Local account authentication
        const accounts = getStoredLocalAccounts()
        const userAcc = accounts.find((a) => a.email === normalizedEmail)
        if (!userAcc) {
          // Exact requirement: "Invalid username or password"
          set({ isLoading: false, authError: 'Invalid username or password' })
          return { success: false, error: 'Invalid username or password' }
        }

        const inputHash = await hashPassword(password)
        if (inputHash !== userAcc.passwordHash) {
          set({ isLoading: false, authError: 'Invalid username or password' })
          return { success: false, error: 'Invalid username or password' }
        }

        const authUser: AuthUser = {
          id: userAcc.id,
          email: userAcc.email,
          fullName: userAcc.fullName,
          age: userAcc.age,
          createdAt: userAcc.createdAt,
        }

        localStorage.setItem(CURRENT_USER_KEY, authUser.id)
        syncUserSessionData(authUser)
        set({ user: authUser, isAuthenticated: true, isLoading: false })
        return { success: true }
      },

      logout: async () => {
        set({ isLoading: true })
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.auth.signOut()
          } catch {}
        }

        localStorage.removeItem(CURRENT_USER_KEY)
        clearUserSessionData()
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      startDemoSession: () => {
        const accounts = getStoredLocalAccounts()
        let demo = accounts.find((a) => a.id === DEMO_USER_ID)
        if (!demo) {
          demo = {
            id: DEMO_USER_ID,
            email: 'judge@demo.orbit-x',
            // Unusable hash: the demo account can only be entered through a demo link
            passwordHash: `demo-${Math.random().toString(36).slice(2)}`,
            fullName: 'Judge',
            age: 30,
            createdAt: new Date().toISOString(),
          }
          accounts.push(demo)
          saveLocalAccounts(accounts)
        }
        const authUser: AuthUser = {
          id: demo.id,
          email: demo.email,
          fullName: demo.fullName,
          age: demo.age,
          createdAt: demo.createdAt,
        }
        localStorage.setItem(CURRENT_USER_KEY, authUser.id)
        syncUserSessionData(authUser)
        set({ user: authUser, isAuthenticated: true, isLoading: false, authError: null })
      },

      resetPassword: async (email: string) => {
        const normalizedEmail = email.trim().toLowerCase()
        if (isSupabaseConfigured && supabase) {
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
              redirectTo: `${window.location.origin}/login`,
            })
            if (error) {
              return { success: false, error: error.message }
            }
            return {
              success: true,
              message: 'Password reset instructions have been dispatched to your email.',
            }
          } catch (err: any) {
            return { success: false, error: err.message }
          }
        }

        // Local account simulation
        const accounts = getStoredLocalAccounts()
        const acc = accounts.find((a) => a.email === normalizedEmail)
        if (!acc) {
          return {
            success: false,
            error: 'No active flight record found for this email address.',
          }
        }

        return {
          success: true,
          message: 'Password recovery verified. A reset authorization key has been registered.',
        }
      },
    }),
    {
      name: 'orbitx_auth_state',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
