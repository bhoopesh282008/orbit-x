import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ComponentCategory, SpacecraftComponent } from '@/stores/spacecraftStore'

/**
 * Co-op crew (1–4 players, hot-seat on one screen). Each role owns part of
 * the spacecraft and a slice of the mission budget; the Flight Director
 * balances the budget and every role must sign off before launch.
 */

export type RoleId = 'director' | 'spacecraft' | 'power' | 'science'

export interface RoleInfo {
  id: RoleId
  title: string
  short: string
  categories: ComponentCategory[]
  /** Owns the launch-vehicle choice */
  ownsVehicle?: boolean
  responsibilities: string
  /** Default share of the mission budget */
  defaultShare: number
}

export const ROLES: RoleInfo[] = [
  {
    id: 'director',
    title: 'Flight Director',
    short: 'Director',
    categories: [],
    ownsVehicle: true,
    responsibilities: 'Picks the rocket, splits the budget between the team, approves funding requests and gives the final GO.',
    defaultShare: 0.25,
  },
  {
    id: 'spacecraft',
    title: 'Spacecraft Engineer',
    short: 'Spacecraft',
    categories: ['structure', 'propulsion', 'fuel'],
    responsibilities: 'Owns the bus, engine and propellant: total mass, Δv and fitting the rocket’s payload limit.',
    defaultShare: 0.35,
  },
  {
    id: 'power',
    title: 'Power & Comms Engineer',
    short: 'Power & Comms',
    categories: ['power', 'energy', 'communication'],
    responsibilities: 'Owns solar arrays, batteries and the radio link: power balance and getting data home.',
    defaultShare: 0.2,
  },
  {
    id: 'science',
    title: 'Science Lead',
    short: 'Science',
    categories: ['instruments'],
    responsibilities: 'Owns the instruments: meets the science objectives without starving the others of mass and power.',
    defaultShare: 0.2,
  },
]

export const roleInfo = (id: RoleId) => ROLES.find((r) => r.id === id)!
export const roleForCategory = (cat: ComponentCategory): RoleId =>
  ROLES.find((r) => r.categories.includes(cat))?.id ?? 'director'

export interface CrewPlayer {
  id: string
  name: string
  color: string
}

export interface FundingRequest {
  id: string
  role: RoleId
  share: number
  createdAt: number
}

const PLAYER_COLORS = ['#f0703f', '#4fb3e8', '#3fb97a', '#c58af0']

/** Default role split for a given team size (roles merge for smaller teams). */
function defaultOwners(players: CrewPlayer[]): Record<RoleId, string> {
  const p = players.map((x) => x.id)
  switch (p.length) {
    case 1:
      return { director: p[0], spacecraft: p[0], power: p[0], science: p[0] }
    case 2:
      return { director: p[0], science: p[0], spacecraft: p[1], power: p[1] }
    case 3:
      return { director: p[0], science: p[0], spacecraft: p[1], power: p[2] }
    default:
      return { director: p[0], spacecraft: p[1], power: p[2], science: p[3] }
  }
}

const makePlayers = (names: string[]): CrewPlayer[] =>
  names.map((name, i) => ({ id: `p${i + 1}`, name, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }))

const defaultShares = (): Record<RoleId, number> =>
  Object.fromEntries(ROLES.map((r) => [r.id, r.defaultShare])) as Record<RoleId, number>

interface CrewState {
  mode: 'solo' | 'team'
  players: CrewPlayer[]
  owners: Record<RoleId, string>
  activePlayerId: string
  shares: Record<RoleId, number>
  requests: FundingRequest[]

  setupTeam: (names: string[]) => void
  setSolo: () => void
  renamePlayer: (id: string, name: string) => void
  assignRole: (role: RoleId, playerId: string) => void
  setActivePlayer: (id: string) => void
  /** Move `amount` of the budget share to `role`, taken from the role with the most unspent share. */
  transferShare: (role: RoleId, amount: number, spentShare: Record<RoleId, number>) => void
  requestFunds: (role: RoleId, share?: number) => void
  resolveRequest: (id: string, approve: boolean, spentShare: Record<RoleId, number>) => void
}

export const useCrewStore = create<CrewState>()(
  persist(
    (set, get) => ({
      mode: 'solo',
      players: makePlayers(['Commander']),
      owners: defaultOwners(makePlayers(['Commander'])),
      activePlayerId: 'p1',
      shares: defaultShares(),
      requests: [],

      setupTeam: (names) => {
        const players = makePlayers(names.map((n, i) => n.trim() || `Player ${i + 1}`))
        set({
          mode: players.length > 1 ? 'team' : 'solo',
          players,
          owners: defaultOwners(players),
          activePlayerId: players[0].id,
          shares: defaultShares(),
          requests: [],
        })
      },
      setSolo: () => {
        const players = makePlayers(['Commander'])
        set({ mode: 'solo', players, owners: defaultOwners(players), activePlayerId: 'p1', requests: [] })
      },
      renamePlayer: (id, name) => set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, name } : p)) })),
      assignRole: (role, playerId) => set((s) => ({ owners: { ...s.owners, [role]: playerId } })),
      setActivePlayer: (id) => set({ activePlayerId: id }),

      transferShare: (role, amount, spentShare) => {
        const { shares } = get()
        // Donor: the other role with the most unspent budget
        const donor = ROLES.filter((r) => r.id !== role)
          .map((r) => ({ id: r.id, free: shares[r.id] - (spentShare[r.id] ?? 0) }))
          .sort((a, b) => b.free - a.free)[0]
        if (!donor || donor.free <= 0) return
        const moved = Math.min(amount, donor.free, shares[donor.id])
        set({ shares: { ...shares, [role]: shares[role] + moved, [donor.id]: shares[donor.id] - moved } })
      },
      requestFunds: (role, share = 0.05) => {
        if (get().requests.some((r) => r.role === role)) return
        set((s) => ({ requests: [...s.requests, { id: `${role}-${Date.now()}`, role, share, createdAt: Date.now() }] }))
      },
      resolveRequest: (id, approve, spentShare) => {
        const req = get().requests.find((r) => r.id === id)
        if (!req) return
        if (approve) get().transferShare(req.role, req.share, spentShare)
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }))
      },
    }),
    { name: 'orbit-x-crew' }
  )
)

// ---------------------------------------------------------------------------
// Helpers shared by the designer, launch poll and reports
// ---------------------------------------------------------------------------

/** Credits each role has committed (the Director's spend is the launch vehicle). */
export function roleSpend(components: SpacecraftComponent[], vehicleCost: number): Record<RoleId, number> {
  const spend: Record<RoleId, number> = { director: vehicleCost, spacecraft: 0, power: 0, science: 0 }
  for (const c of components) spend[roleForCategory(c.category)] += c.cost
  return spend
}

export function useCrewView() {
  const crew = useCrewStore()
  const team = crew.mode === 'team' && crew.players.length > 1
  const playerById = (id: string) => crew.players.find((p) => p.id === id) ?? crew.players[0]
  const ownerOf = (role: RoleId) => playerById(crew.owners[role])
  const active = playerById(crew.activePlayerId)
  /** Can the active (hot-seat) player change this role's part of the design? */
  const canEdit = (role: RoleId) => !team || crew.owners[role] === crew.activePlayerId
  const rolesOf = (playerId: string) => ROLES.filter((r) => crew.owners[r.id] === playerId)
  return { ...crew, team, ownerOf, active, canEdit, rolesOf, playerById }
}
