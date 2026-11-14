import type { LaunchVehicle, SpacecraftComponent } from '@/stores/spacecraftStore'
import type { Mission } from '@/stores/missionStore'
import { calculateSpacecraftMetrics } from '@/services/engineeringCalculations'
import type { RoleId } from '@/stores/crewStore'
import { ASCENT_TIMELINE, EARTH_RADIUS_KM, ORBIT_ALTITUDE_KM, ORBIT_VELOCITY_MS } from '@/services/ascentTrajectory'

/**
 * Predicts what actually happens on launch day for a given design, using the
 * same physics the rest of the game uses. Nothing is random: the same design
 * always fails the same way, so players can learn from it and fix it.
 */

export type LaunchFailureKind = 'scrub' | 'no-liftoff' | 'breakup' | 'short-of-orbit'
export type OrbitFailureKind = 'power' | 'comms' | 'delta-v' | 'instruments'

export interface Finding {
  title: string
  /** What happened, with the numbers that decided it */
  detail: string
  /** The physics/engineering reason in plain words */
  why: string
  /** Concrete change that would have prevented it */
  fix: string
  /** Crew role responsible for this subsystem (co-op) */
  area?: RoleId
}

export interface LaunchFailure extends Finding {
  kind: LaunchFailureKind
  /** Mission elapsed time (s) when it happens; countdown seconds for pre-liftoff events */
  atTime: number
  /** Short-of-orbit only: speed reached at upper-stage burnout (m/s) */
  burnoutSpeed?: number
  /** Short-of-orbit only: perigee altitude of the resulting trajectory (km, negative = below surface) */
  perigeeKm?: number
}

export interface OrbitFailure extends Finding {
  kind: OrbitFailureKind
}

export interface LaunchOutcome {
  launch: LaunchFailure | null
  orbit: OrbitFailure[]
  /** Payload mass / vehicle capacity */
  massRatio: number
  /** Readiness items for the GO/NO-GO poll */
  poll: { label: string; go: boolean }[]
  /** Per-role readiness for the co-op poll */
  roles: Record<RoleId, { go: boolean; note: string }>
}

const G0 = 9.81
const MU = 3.986e14
const UPPER_STAGE_ISP = 348 // s (kerosene vacuum engine)
/** Adapter structural rating relative to the vehicle's published payload capacity. */
const ADAPTER_SAFETY_FACTOR = 1.25

const fmt = (n: number) => Math.round(n).toLocaleString()

/** Upper stage sized from the vehicle's capacity (propellant ≈ 15×, dry ≈ 1.8× payload rating). */
function upperStageDeltaV(capacity: number, payload: number) {
  const prop = capacity * 15
  const dry = capacity * 1.8
  return UPPER_STAGE_ISP * G0 * Math.log((dry + prop + payload) / (dry + payload))
}

export function predictLaunchOutcome(
  components: SpacecraftComponent[],
  vehicle: LaunchVehicle | null,
  mission: Mission | undefined,
  reserveDeltaV = 150
): LaunchOutcome {
  const m = calculateSpacecraftMetrics(components, vehicle, mission, reserveDeltaV)
  const capacity = vehicle?.payloadCapacity ?? 1500
  const payload = m.totalMassKg
  const massRatio = payload / capacity

  let launch: LaunchFailure | null = null

  // 1. Nothing to launch: no structural bus means there is no spacecraft to integrate
  if (!m.hasStructureBus) {
    launch = {
      kind: 'scrub',
      area: 'spacecraft',
      atTime: 10,
      title: 'Launch scrubbed at T−10 s',
      detail: 'Payload integration check failed: there is no spacecraft bus for the instruments and systems to mount on.',
      why: 'Every part needs a structure to carry launch loads and route power and data. Without a bus the payload cannot be stacked on the rocket.',
      fix: 'Fit a spacecraft bus in the workstation (the small bus is the lightest and cheapest).',
    }
  }

  // 2. Thrust-to-weight below 1: the engines can't lift the stack
  if (!launch) {
    const liftoffMassNominal = capacity * 24
    const liftoffMass = liftoffMassNominal + (payload - capacity)
    const twr = (1.4 * liftoffMassNominal) / liftoffMass
    if (twr < 1) {
      launch = {
        kind: 'no-liftoff',
        area: 'spacecraft',
        atTime: 0,
        title: 'No liftoff — engines shut down on the pad',
        detail: `Liftoff thrust-to-weight was ${twr.toFixed(2)}. The vehicle weighed ${fmt(liftoffMass / 1000)} t but the engines push only ${fmt((1.4 * liftoffMassNominal) / 1000)} t-force.`,
        why: 'A rocket only rises when thrust is greater than its weight (thrust-to-weight > 1). Hold-down clamps stay locked and the computer aborts.',
        fix: `Cut payload mass below ${fmt(capacity)} kg, or choose a larger launch vehicle.`,
      }
    }
  }

  // 3. Payload adapter overloaded at Max-Q (peak combined aero + inertial loads)
  if (!launch && massRatio > ADAPTER_SAFETY_FACTOR) {
    const rating = capacity * ADAPTER_SAFETY_FACTOR
    launch = {
      kind: 'breakup',
      area: 'spacecraft',
      atTime: ASCENT_TIMELINE.maxQ + 2,
      title: 'Vehicle breakup at Max-Q',
      detail: `The payload adapter is rated for ${fmt(rating)} kg (${fmt(capacity)} kg × ${ADAPTER_SAFETY_FACTOR} safety factor). Your ${fmt(payload)} kg spacecraft loaded it to ${Math.round((payload / rating) * 100)}% at peak dynamic pressure.`,
      why: 'At Max-Q the airflow bends the rocket while thrust compresses it. An overweight payload multiplies those loads on the joint holding it, and the structure fails.',
      fix: `Remove ${fmt(payload - capacity)} kg from the spacecraft, or move to a launch vehicle rated for at least ${fmt(payload)} kg.`,
    }
  }

  // 4. Upper stage runs dry before orbital speed
  if (!launch && massRatio > 1) {
    const shortfall = upperStageDeltaV(capacity, capacity) - upperStageDeltaV(capacity, payload)
    const burnoutSpeed = ORBIT_VELOCITY_MS - shortfall
    // Burnout is horizontal at the top of the trajectory, so it is the apoapsis.
    // (Game speeds are orbital-frame; 7,790 m/s is circular at 215 km.)
    const ra = (EARTH_RADIUS_KM + ORBIT_ALTITUDE_KM) * 1000
    const v = burnoutSpeed
    const rp = (ra * v * v) / ((2 * MU) / ra - v * v)
    const perigeeKm = rp / 1000 - EARTH_RADIUS_KM
    // A slightly low perigee still leaves a usable (if eccentric) orbit
    if (perigeeKm < 140) {
      launch = {
        kind: 'short-of-orbit',
        area: 'spacecraft',
        atTime: ASCENT_TIMELINE.seco - 25,
        burnoutSpeed,
        perigeeKm,
        title: 'Failed to reach orbit',
        detail: `The upper stage ran out of propellant at ${fmt(burnoutSpeed)} m/s — ${fmt(shortfall)} m/s short of the ${fmt(ORBIT_VELOCITY_MS)} m/s needed. The resulting path dips to ${fmt(perigeeKm)} km, ${perigeeKm < 0 ? 'below the surface' : 'deep in the atmosphere'}, so the vehicle fell back and re-entered.`,
        why: `The rocket equation: every extra kilogram of payload lowers the speed the stage can reach. ${fmt(payload - capacity)} kg over the ${fmt(capacity)} kg rating cost ${fmt(shortfall)} m/s.`,
        fix: `Trim ${fmt(payload - capacity)} kg (try a smaller bus or tank), or pick a launch vehicle with more capacity.`,
      }
    }
  }

  // ---- Problems that only show up once the spacecraft is on its own
  const orbit: OrbitFailure[] = []
  if (m.powerBalanceWatts < 0) {
    const hours = m.batteryCapacityWh > 0 ? m.batteryCapacityWh / -m.powerBalanceWatts : 0
    orbit.push({
      kind: 'power',
      area: 'power',
      title: 'Spacecraft lost power',
      detail: `Systems draw ${fmt(m.powerConsumptionWatts)} W but the arrays make ${fmt(m.powerGenerationWatts)} W. The ${fmt(m.batteryCapacityWh)} Wh battery was flat ${hours > 0 ? `after ${hours.toFixed(1)} h` : 'immediately'}.`,
      why: 'Batteries only buffer eclipses; over a full orbit, generation must exceed consumption or the spacecraft browns out.',
      fix: 'Fit larger solar arrays, or remove a power-hungry instrument.',
    })
  }
  if (!m.hasCommunicationAntenna) {
    orbit.push({
      kind: 'comms',
      area: 'power',
      title: 'No signal after separation',
      detail: 'Ground stations listened for the first telemetry pass and heard nothing.',
      why: 'Without an antenna and transmitter the spacecraft cannot send data or receive commands — it is lost even if it works.',
      fix: 'Fit a communications system sized for the distance (deep-space for Mars).',
    })
  }
  if (m.totalAvailableDeltaV < m.requiredMissionDeltaV) {
    orbit.push({
      kind: 'delta-v',
      area: 'spacecraft',
      title: `Can't reach ${mission?.destination ?? 'the target'}`,
      detail: `Available Δv is ${fmt(m.totalAvailableDeltaV)} m/s; the transfer needs ${fmt(m.requiredMissionDeltaV)} m/s (including ${fmt(reserveDeltaV)} m/s reserve).`,
      why: 'Δv is the "fuel gauge" of spaceflight: each manoeuvre costs a fixed change in speed, set by orbital mechanics.',
      fix: 'Fit a larger propellant tank or a higher-efficiency engine, or a launcher with more Δv.',
    })
  }
  if (!m.hasMandatoryInstruments) {
    orbit.push({
      kind: 'instruments',
      area: 'science',
      title: 'Science objectives missed',
      detail: `Required instruments not on board: ${m.missingInstruments.join(', ')}.`,
      why: 'The mission exists to answer a science question; without its core instruments it cannot collect that data.',
      fix: 'Add the required instruments in the Science tab.',
    })
  }

  const poll = [
    { label: 'Range', go: true },
    { label: 'Weather', go: true },
    { label: 'Vehicle', go: massRatio <= 1 },
    { label: 'Payload', go: m.hasStructureBus && m.powerBalanceWatts >= 0 },
    { label: 'Flight dynamics', go: m.totalAvailableDeltaV >= m.requiredMissionDeltaV },
    { label: 'Ground network', go: m.hasCommunicationAntenna },
  ]

  const roles: LaunchOutcome['roles'] = {
    director: m.isOverBudget
      ? { go: false, note: `${fmt(-m.remainingBudgetCredits)} cr over the mission budget` }
      : { go: true, note: `${fmt(m.remainingBudgetCredits)} cr reserve` },
    spacecraft: !m.hasStructureBus
      ? { go: false, note: 'No spacecraft bus' }
      : massRatio > 1
        ? { go: false, note: `${fmt(payload)} kg vs ${fmt(capacity)} kg rocket limit` }
        : m.totalAvailableDeltaV < m.requiredMissionDeltaV
          ? { go: false, note: `Δv ${fmt(m.totalAvailableDeltaV)} of ${fmt(m.requiredMissionDeltaV)} m/s` }
          : { go: true, note: `${fmt(payload)} kg · Δv ${fmt(m.totalAvailableDeltaV)} m/s` },
    power: m.powerBalanceWatts < 0
      ? { go: false, note: `${fmt(m.powerBalanceWatts)} W power balance` }
      : !m.hasCommunicationAntenna
        ? { go: false, note: 'No radio link' }
        : { go: true, note: `+${fmt(m.powerBalanceWatts)} W margin, link closed` },
    science: m.hasMandatoryInstruments
      ? { go: true, note: 'All required instruments aboard' }
      : { go: false, note: `Missing: ${m.missingInstruments.join(', ')}` },
  }

  return { launch, orbit, massRatio, poll, roles }
}
