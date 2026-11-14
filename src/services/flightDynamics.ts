/**
 * ORBIT-X Flight Dynamics & Orbital Mechanics Engine
 * Implements standard astrodynamics formulas (SI units internally):
 * - Vis-viva equation: v = sqrt(mu * (2/r - 1/a))
 * - Orbital period: T = 2 * pi * sqrt(a^3 / mu)
 * - Hohmann transfer delta-v calculations (departure & arrival burns)
 * - Tsiolkovsky rocket equation & mass flow rate
 * - Circular, coplanar planetary transfer approximations (educational models)
 */

export interface CelestialBody {
  name: string
  mass: number // kg
  radius: number // meters
  mu: number // Standard gravitational parameter G*M (m^3 / s^2)
  orbitRadius: number // meters from primary (e.g. Sun or Earth)
  orbitPeriod: number // seconds
  color: string
}

// Standard Gravitational Parameters (mu = G * M)
export const CELESTIAL_BODIES: Record<string, CelestialBody> = {
  Sun: {
    name: 'Sun',
    mass: 1.989e30,
    radius: 6.9634e8,
    mu: 1.32712440018e20,
    orbitRadius: 0,
    orbitPeriod: 0,
    color: '#fbbf24',
  },
  Earth: {
    name: 'Earth',
    mass: 5.972e24,
    radius: 6.371e6, // 6,371 km
    mu: 3.986004418e14,
    orbitRadius: 1.496e11, // 1 AU (meters)
    orbitPeriod: 3.15576e7, // 365.25 days
    color: '#38bdf8',
  },
  Moon: {
    name: 'Moon',
    mass: 7.342e22,
    radius: 1.7374e6, // 1,737.4 km
    mu: 4.9048695e12,
    orbitRadius: 3.844e8, // 384,400 km from Earth
    orbitPeriod: 2.36059e6, // 27.32 days
    color: '#cbd5e1',
  },
  Mars: {
    name: 'Mars',
    mass: 6.4171e23,
    radius: 3.3895e6, // 3,389.5 km
    mu: 4.282837e13,
    orbitRadius: 2.279e11, // 1.524 AU
    orbitPeriod: 5.9355e7, // 687 days
    color: '#ef4444',
  },
}

export const G0 = 9.80665 // Earth standard sea-level gravitational acceleration (m/s^2)

/**
 * Calculates orbital velocity using Vis-Viva equation
 * v = sqrt(mu * (2/r - 1/a))
 * @param r current radial distance from center of body (m)
 * @param a semi-major axis (m). If circular orbit, a = r.
 * @param mu standard gravitational parameter of central body
 */
export function calculateVisVivaVelocity(r: number, a: number, mu: number): number {
  if (r <= 0 || a <= 0) return 0
  const vSq = mu * (2 / r - 1 / a)
  return vSq > 0 ? Math.sqrt(vSq) : 0
}

/**
 * Calculates orbital period
 * T = 2 * pi * sqrt(a^3 / mu)
 */
export function calculateOrbitalPeriod(a: number, mu: number): number {
  if (a <= 0 || mu <= 0) return 0
  return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu)
}

/**
 * Calculates mass flow rate
 * m_dot = Thrust / (Isp * g0)
 */
export function calculateMassFlowRate(thrustNewtons: number, ispSeconds: number): number {
  if (ispSeconds <= 0) return 0
  return thrustNewtons / (ispSeconds * G0)
}

/**
 * Tsiolkovsky Rocket Equation
 * deltaV = Isp * g0 * ln(m0 / mf)
 */
export function calculateTsiolkovskyDeltaV(
  wetMassKg: number,
  dryMassKg: number,
  ispSeconds: number
): number {
  if (dryMassKg <= 0 || wetMassKg < dryMassKg || ispSeconds <= 0) return 0
  return ispSeconds * G0 * Math.log(wetMassKg / dryMassKg)
}

/**
 * Hohmann Transfer Calculation between two coplanar circular orbits
 */
export interface HohmannTransferResult {
  deltaV1: number // departure burn (m/s)
  deltaV2: number // arrival insertion burn (m/s)
  totalDeltaV: number // total transfer delta-v (m/s)
  transferTimeSeconds: number // half of transfer ellipse period
  transferSemiMajorAxis: number // meters
  initialVelocity: number // m/s
  finalVelocity: number // m/s
}

export function calculateHohmannTransfer(
  r1: number, // radius of departure orbit (m)
  r2: number, // radius of target orbit (m)
  muCentralBody: number
): HohmannTransferResult {
  const v1 = Math.sqrt(muCentralBody / r1) // speed in initial circular orbit
  const v2 = Math.sqrt(muCentralBody / r2) // speed in final circular orbit

  const aTransfer = (r1 + r2) / 2 // semi-major axis of transfer ellipse

  // Velocity on transfer ellipse at periapsis (r1)
  const vTransfer1 = Math.sqrt(muCentralBody * (2 / r1 - 1 / aTransfer))
  const deltaV1 = Math.abs(vTransfer1 - v1)

  // Velocity on transfer ellipse at apoapsis (r2)
  const vTransfer2 = Math.sqrt(muCentralBody * (2 / r2 - 1 / aTransfer))
  const deltaV2 = Math.abs(v2 - vTransfer2)

  const transferTimeSeconds = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / muCentralBody)

  return {
    deltaV1: Math.round(deltaV1),
    deltaV2: Math.round(deltaV2),
    totalDeltaV: Math.round(deltaV1 + deltaV2),
    transferTimeSeconds: Math.round(transferTimeSeconds),
    transferSemiMajorAxis: aTransfer,
    initialVelocity: Math.round(v1),
    finalVelocity: Math.round(v2),
  }
}

/**
 * Mission-specific planetary transfer planning approximations
 */
export interface MissionTrajectoryPlan {
  missionId: string
  departureBody: string
  destinationBody: string
  departureAltitudeKm: number
  destinationAltitudeKm: number
  tliDeltaV: number // Trans-destination Injection delta-v (m/s)
  insertionDeltaV: number // Orbit capture delta-v (m/s)
  midcourseReserveDeltaV: number // Course corrections margin (m/s)
  totalMissionDeltaV: number // Combined required delta-v (m/s)
  transferDurationDays: number
  launchWindows: Array<{
    id: string
    dateString: string
    windowOpenHours: number
    c3Energy: number // km^2 / s^2 characteristic energy
    deltaVOffset: number // m/s variation from optimal
    status: 'optimal' | 'standard' | 'constrained'
  }>
}

export function getMissionTrajectoryPlan(missionId: string): MissionTrajectoryPlan {
  switch (missionId) {
    case 'earth-observer':
      return {
        missionId,
        departureBody: 'Earth (Surface)',
        destinationBody: 'Earth (Sun-Synchronous Orbit)',
        departureAltitudeKm: 0,
        destinationAltitudeKm: 650,
        tliDeltaV: 2450, // Upper stage circularization & inclination burn
        insertionDeltaV: 350, // Final trim
        midcourseReserveDeltaV: 150,
        totalMissionDeltaV: 2950,
        transferDurationDays: 0.1, // ~2.5 hours to deploy
        launchWindows: [
          { id: 'w1', dateString: '2026-03-15', windowOpenHours: 4.5, c3Energy: -15.2, deltaVOffset: 0, status: 'optimal' },
          { id: 'w2', dateString: '2026-03-22', windowOpenHours: 3.8, c3Energy: -14.8, deltaVOffset: 45, status: 'standard' },
          { id: 'w3', dateString: '2026-04-05', windowOpenHours: 2.2, c3Energy: -14.1, deltaVOffset: 120, status: 'constrained' },
        ],
      }
    case 'mars-pathfinder':
      return {
        missionId,
        departureBody: 'Earth (Low Earth Orbit)',
        destinationBody: 'Mars (Low Mars Orbit)',
        departureAltitudeKm: 250,
        destinationAltitudeKm: 320,
        tliDeltaV: 3600, // Trans-Mars Injection (TMI) from LEO
        insertionDeltaV: 2100, // Mars Orbit Insertion (MOI)
        midcourseReserveDeltaV: 350, // 3x Trajectory Correction Maneuvers (TCM)
        totalMissionDeltaV: 6050,
        transferDurationDays: 210, // ~7 months
        launchWindows: [
          { id: 'm1', dateString: '2026-10-08', windowOpenHours: 2.5, c3Energy: 14.8, deltaVOffset: 0, status: 'optimal' },
          { id: 'm2', dateString: '2026-10-18', windowOpenHours: 2.0, c3Energy: 16.2, deltaVOffset: 85, status: 'standard' },
          { id: 'm3', dateString: '2026-11-02', windowOpenHours: 1.2, c3Energy: 19.5, deltaVOffset: 240, status: 'constrained' },
        ],
      }
    case 'lunar-explorer':
    default:
      return {
        missionId,
        departureBody: 'Earth (Low Earth Orbit)',
        destinationBody: 'Moon (Low Lunar Orbit)',
        departureAltitudeKm: 200,
        destinationAltitudeKm: 100,
        tliDeltaV: 3150, // Trans-Lunar Injection (TLI)
        insertionDeltaV: 850, // Lunar Orbit Insertion (LOI)
        midcourseReserveDeltaV: 200, // Mid-course corrections
        totalMissionDeltaV: 4200,
        transferDurationDays: 3.8, // ~92 hours
        launchWindows: [
          { id: 'l1', dateString: '2026-05-12', windowOpenHours: 3.5, c3Energy: -1.8, deltaVOffset: 0, status: 'optimal' },
          { id: 'l2', dateString: '2026-05-24', windowOpenHours: 2.8, c3Energy: -1.2, deltaVOffset: 60, status: 'standard' },
          { id: 'l3', dateString: '2026-06-08', windowOpenHours: 2.0, c3Energy: -0.8, deltaVOffset: 140, status: 'constrained' },
        ],
      }
  }
}

