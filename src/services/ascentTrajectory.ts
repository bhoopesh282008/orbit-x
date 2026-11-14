/**
 * Reference ascent profile for a two-stage, kerosene/LOX medium-lift launcher
 * flying from Cape Canaveral to a ~215 km low Earth orbit.
 *
 * Keyframes are based on publicly broadcast telemetry of real Falcon 9-class
 * launches (altitude and speed overlays shown during webcasts), so the timing
 * of Mach 1, Max-Q, MECO and SECO, and the altitude/speed relationship
 * between them, behave like a real flight. Between keyframes a monotone cubic
 * spline is used so altitude and speed never overshoot and the vertical
 * velocity (derivative of altitude) stays smooth.
 */

export const EARTH_RADIUS_KM = 6371
export const ORBIT_ALTITUDE_KM = 215
export const ORBIT_VELOCITY_MS = 7790 // circular speed at 215 km

/** Real-time event timeline in seconds after liftoff (T+). */
export const ASCENT_TIMELINE = {
  towerClear: 8,
  pitchKick: 12,
  mach1: 62,
  maxQ: 72,
  boosterSep: 120,
  meco: 150,
  stageSep: 153,
  stage2Ignition: 158,
  fairingSep: 195,
  seco: 510,
  payloadSep: 540,
  solarDeploy: 556,
  antennaDeploy: 570,
  orbitStabilized: 590,
  transInjection: 620,
  transInjectionCutoff: 740,
} as const

// [t (s), altitude (km), speed relative to Earth surface (m/s)]
const KEYFRAMES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [10, 0.2, 40],
  [20, 0.85, 95],
  [30, 2.0, 150],
  [45, 4.6, 232],
  [60, 7.9, 330],
  [72, 11.6, 445],
  [90, 19.5, 690],
  [120, 38, 1250],
  [150, 68, 2150],
  [158, 76, 2120],
  [180, 98, 2160],
  [240, 145, 2900],
  [300, 180, 3900],
  [360, 200, 5000],
  [420, 210, 6200],
  [480, 214, 7200],
  [510, ORBIT_ALTITUDE_KM, ORBIT_VELOCITY_MS],
]

/** Fritsch–Carlson monotone cubic Hermite interpolation. */
function buildMonotoneSpline(xs: number[], ys: number[]) {
  const n = xs.length
  const d: number[] = []
  const m: number[] = new Array(n).fill(0)
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }

  const evaluate = (x: number): { value: number; slope: number } => {
    if (x <= xs[0]) return { value: ys[0], slope: m[0] }
    if (x >= xs[n - 1]) return { value: ys[n - 1], slope: 0 }
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const t = (x - xs[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + t
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2
    const value = h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
    const dh00 = (6 * t2 - 6 * t) / h
    const dh10 = 3 * t2 - 4 * t + 1
    const dh01 = (-6 * t2 + 6 * t) / h
    const dh11 = 3 * t2 - 2 * t
    const slope = dh00 * ys[i] + dh10 * m[i] + dh01 * ys[i + 1] + dh11 * m[i + 1]
    return { value, slope }
  }
  return evaluate
}

const ts = KEYFRAMES.map((k) => k[0])
const altSpline = buildMonotoneSpline(ts, KEYFRAMES.map((k) => k[1]))
const speedSpline = buildMonotoneSpline(ts, KEYFRAMES.map((k) => k[2]))

/** Raw flight-path angle implied by the altitude and speed splines (deg). */
function rawFlightPath(t: number) {
  if (t < ASCENT_TIMELINE.pitchKick) return 90
  const speed = Math.max(0, speedSpline(t).value)
  const vv = Math.min(speed, Math.max(0, altSpline(t).slope * 1000))
  const vh = Math.sqrt(Math.max(0, speed * speed - vv * vv))
  return (Math.atan2(vv, Math.max(vh, 1e-3)) * 180) / Math.PI
}

/**
 * Gravity turns pitch over monotonically. Small wiggles in the spline
 * derivatives are removed by taking the running minimum on a 0.5 s grid.
 */
const FPA_STEP = 0.5
const FPA_TABLE: number[] = (() => {
  const out: number[] = []
  let prev = 90
  for (let t = 0; t <= ASCENT_TIMELINE.seco + FPA_STEP; t += FPA_STEP) {
    prev = Math.min(prev, rawFlightPath(t))
    out.push(prev)
  }
  return out
})()

function monotoneFlightPath(t: number) {
  const x = Math.max(0, t) / FPA_STEP
  const i = Math.min(FPA_TABLE.length - 2, Math.floor(x))
  const f = Math.min(1, x - i)
  return FPA_TABLE[i] + (FPA_TABLE[i + 1] - FPA_TABLE[i]) * f
}

export interface AscentState {
  altitudeKm: number
  speed: number // m/s, Earth-relative
  verticalVelocity: number // m/s
  horizontalVelocity: number // m/s
  flightPathAngle: number // deg, 90 = straight up
  acceleration: number // m/s², along the velocity vector (sensed thrust accel)
}

/** Earth-relative ascent state at T+t seconds (valid 0 … SECO). */
export function sampleAscent(t: number): AscentState {
  const a = altSpline(t)
  const s = speedSpline(t)
  const altitudeKm = Math.max(0, a.value)
  const speed = Math.max(0, s.value)
  const vv = Math.min(speed, Math.max(0, a.slope * 1000))
  const vh = Math.sqrt(Math.max(0, speed * speed - vv * vv))
  // The vehicle flies straight up until the pitch kick, then follows a gravity turn
  // that only ever pitches over (never back up) — see FPA_TABLE.
  const gamma = monotoneFlightPath(t)
  const g = 9.81 / Math.pow(1 + altitudeKm / EARTH_RADIUS_KM, 2)
  // Sensed acceleration = dv/dt + gravity component along the flight path (+ drag, ignored)
  const sensed = s.slope + g * Math.sin((gamma * Math.PI) / 180)
  return {
    altitudeKm,
    speed,
    verticalVelocity: vv,
    horizontalVelocity: vh,
    flightPathAngle: gamma,
    acceleration: Math.max(0, sensed),
  }
}

/**
 * US Standard Atmosphere 1976, layered model up to 86 km
 * (base altitude km, base temperature K, lapse rate K/m, base pressure Pa).
 */
const ATMOSPHERE_LAYERS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 288.15, -0.0065, 101325],
  [11, 216.65, 0, 22632.06],
  [20, 216.65, 0.001, 5474.889],
  [32, 228.65, 0.0028, 868.0187],
  [47, 270.65, 0, 110.9063],
  [51, 270.65, -0.0028, 66.93887],
  [71, 214.65, -0.002, 3.95642],
]
const GM_OVER_R = 0.0341632 // g0·M / R*, K/m
const R_AIR = 287.053 // J/(kg·K)

function atmosphereAt(altKm: number): { temperature: number; pressure: number } {
  const h = Math.max(0, Math.min(altKm, 86))
  let layer = ATMOSPHERE_LAYERS[0]
  for (const l of ATMOSPHERE_LAYERS) if (h >= l[0]) layer = l
  const [hb, Tb, L, pb] = layer
  const dh = (h - hb) * 1000
  const T = Tb + L * dh
  const p = L === 0 ? pb * Math.exp((-GM_OVER_R * dh) / Tb) : pb * Math.pow(Tb / T, GM_OVER_R / L)
  return { temperature: T, pressure: p }
}

/** Air density in kg/m³ (US Standard Atmosphere 1976; exponential tail above 86 km). */
export function atmosphericDensity(altKm: number): number {
  const { temperature, pressure } = atmosphereAt(altKm)
  const rho = pressure / (R_AIR * temperature)
  return altKm > 86 ? rho * Math.exp(-(altKm - 86) / 6.5) : rho
}

/** Speed of sound (m/s) from the local temperature: a = √(γRT). */
export function speedOfSound(altKm: number): number {
  return Math.sqrt(1.4 * R_AIR * atmosphereAt(altKm).temperature)
}
