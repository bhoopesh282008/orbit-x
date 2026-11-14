import { useAuthStore } from '@/stores/authStore'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useCrewStore } from '@/stores/crewStore'
import { autoResolve } from '@/services/designAdvisor'
import { COMPONENT_CATALOGUE } from '@/data/components'
import type { SpacecraftComponent } from '@/stores/spacecraftStore'

/** Friendly aliases accepted in demo links (?demo=mars). */
const MISSION_ALIASES: Record<string, string> = {
  moon: 'lunar-explorer',
  lunar: 'lunar-explorer',
  'lunar-explorer': 'lunar-explorer',
  earth: 'earth-observer',
  eo: 'earth-observer',
  leo: 'earth-observer',
  'earth-observer': 'earth-observer',
  mars: 'mars-pathfinder',
  'mars-pathfinder': 'mars-pathfinder',
}

/** The mission lifecycle, in play order, with the route for each screen. */
export const DEMO_SCREENS = [
  { id: 'briefing', label: 'Brief', path: (m: string) => `/campaign/${m}` },
  { id: 'plan', label: 'Plan', path: (m: string) => `/mission-planner/${m}` },
  { id: 'design', label: 'Design', path: (m: string) => `/designer/${m}` },
  { id: 'vehicle', label: 'Rocket', path: (m: string) => `/launch/${m}` },
  { id: 'validate', label: 'Validate', path: (m: string) => `/validation/${m}` },
  { id: 'launch', label: 'Launch', path: (m: string) => `/launch-operations/${m}` },
  { id: 'control', label: 'Operate', path: (m: string) => `/mission-control/${m}` },
  { id: 'results', label: 'Debrief', path: (m: string) => `/results/${m}` },
] as const

export type DemoScreen = (typeof DEMO_SCREENS)[number]['id']

export const DEMO_MISSIONS = [
  { id: 'lunar-explorer', label: 'Moon', alias: 'moon' },
  { id: 'earth-observer', label: 'Earth orbit', alias: 'earth' },
  { id: 'mars-pathfinder', label: 'Mars', alias: 'mars' },
] as const

export function resolveMission(raw: string | null | undefined) {
  return MISSION_ALIASES[(raw ?? '').toLowerCase()] ?? 'earth-observer'
}

/**
 * Enters demo mode: password-less local judge session, every mission unlocked,
 * and a flight-ready baseline design fitted for the chosen mission.
 * Returns the route to open.
 */
/** Sample crew names for judge demos. */
export const DEMO_CREW = ['Ava', 'Ben', 'Chloe', 'Dev']

export const DEMO_FAILURES = ['short', 'breakup', 'power', 'scrub'] as const
export type DemoFailure = (typeof DEMO_FAILURES)[number]

const SINGLE_SLOT = ['structure', 'propulsion', 'fuel', 'power', 'energy', 'communication']

/** All designs reachable by one add/swap from `parts`. */
function neighbours(parts: SpacecraftComponent[]) {
  const out: SpacecraftComponent[][] = []
  for (const c of COMPONENT_CATALOGUE) {
    if (parts.some((p) => p.id === c.id)) continue
    out.push(SINGLE_SLOT.includes(c.category) ? [...parts.filter((p) => p.category !== c.category), c] : [...parts, c])
  }
  return out
}

/** Deliberately breaks a valid design so a judge can watch a specific failure mode. */
function sabotage(parts: SpacecraftComponent[], kind: DemoFailure, capacity: number) {
  const mass = (ps: SpacecraftComponent[]) => ps.reduce((s, c) => s + c.mass, 0)
  const power = (ps: SpacecraftComponent[]) => ps.reduce((s, c) => s + c.powerGeneration - c.powerConsumption, 0)
  if (kind === 'scrub') return parts.filter((p) => p.category !== 'structure')
  if (kind === 'power') {
    let cur = parts
    for (let i = 0; i < 4 && power(cur) >= 0; i++) {
      cur = neighbours(cur).sort((a, b) => power(a) - power(b))[0] ?? cur
    }
    return cur
  }
  // Mass-driven failures: steer the payload/capacity ratio into the target window
  const [lo, hi] = kind === 'short' ? [1.07, 1.2] : [1.45, 2.2]
  const target = (lo + hi) / 2
  let cur = parts
  for (let i = 0; i < 6; i++) {
    const r = mass(cur) / capacity
    if (r >= lo && r <= hi) break
    const options = neighbours(cur).filter((n) => mass(n) > mass(cur))
    if (!options.length) break
    // Prefer steps that stay under the window's upper edge; only overshoot if nothing else is left
    const safe = options.filter((n) => mass(n) / capacity <= hi)
    const pool = safe.length ? safe : options
    cur = pool.sort((a, b) => Math.abs(mass(a) / capacity - target) - Math.abs(mass(b) / capacity - target))[0]
  }
  return cur
}

export function enterDemo(
  rawMission: string | null | undefined,
  rawScreen: string | null | undefined,
  rawFail?: string | null,
  rawCrew?: string | null
) {
  const missionId = resolveMission(rawMission)
  useAuthStore.getState().startDemoSession()
  const crewSize = Number(rawCrew)
  if (crewSize >= 2 && crewSize <= 4) useCrewStore.getState().setupTeam(DEMO_CREW.slice(0, crewSize))
  else if (rawCrew === '1') useCrewStore.getState().setSolo()

  const missionStore = useMissionStore.getState()
  for (const m of missionStore.missions) {
    if (m.status === 'locked') missionStore.unlockMission(m.id)
  }

  const mission = useMissionStore.getState().missions.find((m) => m.id === missionId)
  const craft = useSpacecraftStore.getState()
  craft.setMissionId(missionId)
  craft.clearDesign()
  craft.autoEquipFlightReady({
    requiredInstruments: mission?.requiredInstruments,
    minDeltaV: mission?.minDeltaV,
    destination: mission?.destination,
  })
  // Make sure the baseline actually passes mass, budget and power checks
  const fitted = useSpacecraftStore.getState()
  const resolved = autoResolve(fitted.selectedComponents, {
    maxMass: mission?.maxPayloadMass ?? 0,
    budget: mission?.budget ?? 0,
    vehicleCost: fitted.selectedLaunchVehicle?.cost ?? 0,
    requiredInstruments: mission?.requiredInstruments ?? [],
    destination: mission?.destination,
  })
  const fail = DEMO_FAILURES.find((f) => f === rawFail)
  useSpacecraftStore.setState({
    selectedComponents: fail ? sabotage(resolved, fail, fitted.selectedLaunchVehicle?.payloadCapacity ?? 1500) : resolved,
  })

  if (rawScreen === 'physics') return '/model-check'
  const screen = DEMO_SCREENS.find((s) => s.id === rawScreen) ?? DEMO_SCREENS[0]
  return screen.path(missionId)
}
