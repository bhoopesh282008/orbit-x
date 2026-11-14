import {
  ASCENT_TIMELINE,
  ORBIT_ALTITUDE_KM,
  ORBIT_VELOCITY_MS,
  atmosphericDensity,
  sampleAscent,
  speedOfSound,
} from '@/services/ascentTrajectory'
import type { LaunchFailure } from '@/services/launchOutcome'
import { create } from 'zustand'

export type LaunchPhase =
  | 'STANDBY'
  | 'COUNTDOWN'
  | 'ENGINE_START'
  | 'LIFTOFF'
  | 'ASCENT'
  | 'BOOSTER_SEPARATION'
  | 'STAGE_SEPARATION'
  | 'FAIRING_SEPARATION'
  | 'ORBITAL_INSERTION'
  | 'DEPLOYMENT'
  | 'ORBITAL_FLIGHT'
  | 'TRANS_INJECTION' // TLI for Lunar Explorer / TMI for Mars Pathfinder
  | 'MISSION_CRUISE'
  | 'MISSION_COMPLETE'
  | 'REENTRY' // Failed to reach orbit, falling back
  | 'ABORTED'

export interface MissionEventLogItem {
  id: string
  met: string
  timeStr: string
  message: string
  phase: LaunchPhase
  severity: 'nominal' | 'info' | 'warning' | 'critical'
}

/**
 * Fast, highly-tuned stage timing configuration (Part 4)
 * Allows rapid progression through both stages without excessive waiting
 */
/**
 * Real-time event timeline (seconds after liftoff), taken from the reference
 * ascent profile so events line up with the altitude/speed curves.
 */
export const STAGE_TIMING_CONFIG = {
  towerClearTime: ASCENT_TIMELINE.towerClear,
  gravityTurnStartTime: ASCENT_TIMELINE.pitchKick,
  mach1Time: ASCENT_TIMELINE.mach1,
  maxQTime: ASCENT_TIMELINE.maxQ,
  boosterSepTime: ASCENT_TIMELINE.boosterSep,
  mecoTime: ASCENT_TIMELINE.meco,
  stage2IgnitionTime: ASCENT_TIMELINE.stage2Ignition,
  fairingSepTime: ASCENT_TIMELINE.fairingSep,
  secoTime: ASCENT_TIMELINE.seco,
  spacecraftDeployTime: ASCENT_TIMELINE.payloadSep,
  solarDeployTime: ASCENT_TIMELINE.solarDeploy,
  antennaDeployTime: ASCENT_TIMELINE.antennaDeploy,
  orbitStabilizedTime: ASCENT_TIMELINE.orbitStabilized,
  transInjectionTime: ASCENT_TIMELINE.transInjection,
  missionCruiseTime: ASCENT_TIMELINE.transInjectionCutoff,
}

export interface LaunchTelemetry {
  phase: LaunchPhase
  countdownSeconds: number // 30 down to 0
  flightTime: number // seconds after T-0 (MET)
  statusMessage: string // Milestone & telemetry status message
  altitude: number // km
  downrange: number // km travelled along the ground track
  groundVelocity: number // m/s (relative to Earth surface)
  inertialVelocity: number // m/s (including Earth rotation ~465 m/s)
  orbitalVelocity: number // m/s (horizontal velocity vector)
  verticalVelocity: number // m/s
  totalVelocity: number // m/s
  acceleration: number // m/s^2
  gForce: number // g's
  machNumber: number // Mach (v / 340)
  dynamicPressure: number // kPa (q = 0.5 * rho * v^2)
  maxQPeak: number // Recorded peak kPa
  atmosphericDensity: number // kg/m^3
  pitchAngle: number // degrees (90 = vertical, 0 = horizontal)
  yawAngle: number // degrees
  rollAngle: number // degrees
  thrust: number // kN
  vehicleMass: number // kg
  stage1Propellant: number // percentage (0 - 100)
  stage2Propellant: number // percentage (0 - 100)
  totalPropellant: number // percentage (0 - 100)
  remainingDeltaV: number // m/s (Tsiolkovsky equation)
  stage1Separated: boolean
  boostersSeparated: boolean
  fairingSeparated: boolean
  spacecraftDeployed: boolean
  solarPanelsDeployed: boolean
  antennasDeployed: boolean
  orbitalStabilized: boolean
  transInjectionComplete: boolean
  communicationLocked: boolean
  /** Vehicle destroyed (breakup / re-entry) */
  vehicleLost: boolean
  batteryState: number // %
  powerGeneration: number // Watts
  spacecraftHealth: number // 0 - 100%
  missionTarget: 'Earth Orbit' | 'Lunar Transfer' | 'Mars Transfer'
}

export type LaunchCameraPreset =
  | 'auto' // Broadcast director: switches shots by flight phase
  | 'pad' // 1. Launchpad Wide View
  | 'tracking' // 2. Launch Tracking View (keeps pad & Earth visible)
  | 'curvature' // 3. Earth Curvature View (rocket against curved horizon)
  | 'rocket' // 4. Rocket Tracking View (smooth follow into atmosphere)
  | 'staging' // 5. Stage Separation View
  | 'space' // 6. External Space View (rocket & Earth in same 3D scene)
  | 'earth' // External Space View (alias)
  | 'manual' // 7. Free 360-Degree Camera
  | 'close'
  | 'tower'
  | 'onboard'
  | 'payload'
  | 'spacecraft'
  | 'side'
  | 'orbit'

interface LaunchSimulationStore {
  phase: LaunchPhase
  simSpeed: number // 1, 2, 5, 10, 50
  isPaused: boolean
  isMuted: boolean
  activeCameraPreset: LaunchCameraPreset
  userCameraControlActive: boolean
  /** Vehicle has strap-on boosters (heavy / deep-space classes) */
  hasBoosters: boolean
  /** Predicted consequence of flying a flawed design (null = nominal flight) */
  launchFailure: LaunchFailure | null

  telemetry: LaunchTelemetry
  eventLog: MissionEventLogItem[]

  // Actions
  startCountdown: () => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  restartSimulation: () => void
  abortLaunch: () => void
  setSimSpeed: (speed: number) => void
  toggleMute: () => void
  setCameraPreset: (preset: LaunchCameraPreset) => void
  setUserCameraControlActive: (active: boolean) => void
  setVehicleProfile: (profile: { hasBoosters: boolean }) => void
  setLaunchFailure: (failure: LaunchFailure | null) => void
  tickSimulation: (deltaSeconds: number, missionTarget?: string) => void
  resetToStandby: () => void
  addEventLog: (message: string, phase: LaunchPhase, severity?: 'nominal' | 'info' | 'warning' | 'critical') => void
  clearEventLog: () => void
}

const INITIAL_TELEMETRY: LaunchTelemetry = {
  phase: 'STANDBY',
  countdownSeconds: 30,
  flightTime: 0,
  statusMessage: 'TERMINAL COUNTDOWN READY — ALL SYSTEMS GO',
  altitude: 0,
  downrange: 0,
  groundVelocity: 0,
  inertialVelocity: 465, // Equatorial Earth rotation velocity baseline
  orbitalVelocity: 0,
  verticalVelocity: 0,
  totalVelocity: 0,
  acceleration: 0,
  gForce: 1.0,
  machNumber: 0,
  dynamicPressure: 0,
  maxQPeak: 0,
  atmosphericDensity: 1.225, // sea level kg/m^3
  thrust: 0,
  vehicleMass: 549000,
  pitchAngle: 90,
  yawAngle: 0,
  rollAngle: 0,
  stage1Propellant: 100,
  stage2Propellant: 100,
  totalPropellant: 100,
  remainingDeltaV: 9400,
  stage1Separated: false,
  boostersSeparated: false,
  fairingSeparated: false,
  spacecraftDeployed: false,
  solarPanelsDeployed: false,
  antennasDeployed: false,
  orbitalStabilized: false,
  transInjectionComplete: false,
  communicationLocked: true,
  vehicleLost: false,
  batteryState: 100,
  powerGeneration: 450,
  spacecraftHealth: 100,
  missionTarget: 'Earth Orbit',
}

const INITIAL_EVENTS: MissionEventLogItem[] = [
  {
    id: 'evt-init',
    met: 'T-30.0s',
    timeStr: '00:00:00',
    message: 'TERMINAL COUNTDOWN SEQUENCER STANDBY — RANGE SAFETY GO',
    phase: 'STANDBY',
    severity: 'info',
  },
]

export const useLaunchSimulationStore = create<LaunchSimulationStore>((set, get) => ({
  phase: 'STANDBY',
  simSpeed: 1,
  isPaused: false,
  isMuted: false,
  activeCameraPreset: 'auto',
  userCameraControlActive: false,
  hasBoosters: false,
  launchFailure: null,
  telemetry: { ...INITIAL_TELEMETRY },
  eventLog: [...INITIAL_EVENTS],

  addEventLog: (message, phase, severity = 'nominal') => {
    const { telemetry, eventLog } = get()
    const metStr =
      telemetry.countdownSeconds > 0
        ? `T-${telemetry.countdownSeconds.toFixed(1)}s`
        : `T+${telemetry.flightTime.toFixed(1)}s`

    const newItem: MissionEventLogItem = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      met: metStr,
      timeStr: new Date().toLocaleTimeString(),
      message,
      phase,
      severity,
    }

    set({ eventLog: [newItem, ...eventLog.slice(0, 39)] })
  },

  clearEventLog: () => set({ eventLog: [...INITIAL_EVENTS] }),

  startCountdown: () => {
    const startMsg = 'TERMINAL COUNTDOWN INITIATED — AUTONOMOUS FLIGHT SEQUENCER ACTIVE'
    set((state) => ({
      phase: 'COUNTDOWN',
      isPaused: false,
      telemetry: {
        ...state.telemetry,
        phase: 'COUNTDOWN',
        countdownSeconds: 30,
        statusMessage: startMsg,
      },
    }))
    get().addEventLog(startMsg, 'COUNTDOWN', 'nominal')
  },

  pauseSimulation: () => set({ isPaused: true }),
  resumeSimulation: () => set({ isPaused: false }),

  restartSimulation: () => {
    set({
      phase: 'STANDBY',
      isPaused: false,
      activeCameraPreset: 'auto',
      telemetry: { ...INITIAL_TELEMETRY },
      eventLog: [...INITIAL_EVENTS],
    })
  },

  resetToStandby: () => {
    set({
      phase: 'STANDBY',
      isPaused: false,
      activeCameraPreset: 'auto',
      telemetry: { ...INITIAL_TELEMETRY },
      eventLog: [...INITIAL_EVENTS],
    })
  },

  abortLaunch: () => {
    const abortMsg = 'LAUNCH ABORTED — RANGE SAFETY TERMINATION ACTIVATED'
    set((state) => ({
      phase: 'ABORTED',
      telemetry: {
        ...state.telemetry,
        phase: 'ABORTED',
        thrust: 0,
        acceleration: -9.81,
        statusMessage: abortMsg,
      },
    }))
    get().addEventLog(abortMsg, 'ABORTED', 'critical')
  },

  setSimSpeed: (speed: number) => set({ simSpeed: speed }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  setCameraPreset: (preset) => set({ activeCameraPreset: preset, userCameraControlActive: false }),
  setUserCameraControlActive: (active) => set({ userCameraControlActive: active }),
  setVehicleProfile: ({ hasBoosters }) => set({ hasBoosters }),
  setLaunchFailure: (launchFailure) => set({ launchFailure }),

  tickSimulation: (deltaSeconds: number, missionTarget = 'Earth Orbit') => {
    const { phase, isPaused, simSpeed, telemetry, eventLog, addEventLog, hasBoosters } = get()
    if (isPaused || phase === 'ABORTED' || phase === 'STANDBY' || phase === 'MISSION_COMPLETE') {
      return
    }

    const dt = deltaSeconds * simSpeed
    let newPhase: LaunchPhase = phase
    let cd = telemetry.countdownSeconds
    let ft = telemetry.flightTime
    let statusMsg = telemetry.statusMessage
    let alt = telemetry.altitude
    let vv = telemetry.verticalVelocity
    let ov = telemetry.orbitalVelocity
    let pitch = telemetry.pitchAngle
    let yaw = telemetry.yawAngle
    let roll = telemetry.rollAngle
    let s1Prop = telemetry.stage1Propellant
    let s2Prop = telemetry.stage2Propellant
    let thrust = telemetry.thrust
    let mass = telemetry.vehicleMass
    let s1Sep = telemetry.stage1Separated
    let bSep = telemetry.boostersSeparated
    let fairingSep = telemetry.fairingSeparated
    let scDep = telemetry.spacecraftDeployed
    let solarDep = telemetry.solarPanelsDeployed
    let antDep = telemetry.antennasDeployed
    let orbitStab = telemetry.orbitalStabilized
    let transInj = telemetry.transInjectionComplete
    let maxQ = telemetry.maxQPeak
    let batt = telemetry.batteryState
    let pwr = telemetry.powerGeneration

    let downrange = telemetry.downrange
    let accel = telemetry.acceleration

    // 2. Countdown phase (Part 8: Exactly 30 seconds)
    if (phase === 'COUNTDOWN') {
      const prevCd = cd
      cd -= dt

      if (prevCd > 25 && cd <= 25) {
        statusMsg = 'CRYOGENIC PROPELLANT TANKS PRESSURIZED TO FLIGHT LEVELS'
        addEventLog(statusMsg, 'COUNTDOWN', 'nominal')
      } else if (prevCd > 20 && cd <= 20) {
        statusMsg = 'FLIGHT CONTROL HYDRAULICS & THRUST VECTOR ACTUATORS TESTED'
        addEventLog(statusMsg, 'COUNTDOWN', 'nominal')
      } else if (prevCd > 15 && cd <= 15) {
        statusMsg = 'RANGE SAFETY CLEARANCE VERIFIED — FLIGHT TERMINATION SYSTEM ARMED'
        addEventLog(statusMsg, 'COUNTDOWN', 'nominal')
      } else if (prevCd > 10 && cd <= 10) {
        statusMsg = 'TERMINAL GUIDANCE GO FOR LAUNCH — INTERNAL POWER TRANSFER COMPLETE'
        addEventLog(statusMsg, 'COUNTDOWN', 'nominal')
      }

      // T-6 seconds: Engine start sequence initiates
      if (cd <= 6.0 && cd > 0) {
        newPhase = 'ENGINE_START'
        thrust = 7200
        statusMsg = 'MAIN ENGINE START SEQUENCE INITIATED'
        addEventLog(statusMsg, 'ENGINE_START', 'nominal')
      }
      if (cd <= 0) {
        cd = 0
        newPhase = 'LIFTOFF'
        ft = 0
        thrust = 7600
        statusMsg = 'IGNITION & LIFTOFF — TOWER CLEARED'
        if (get().launchFailure?.kind !== 'no-liftoff') addEventLog(statusMsg, 'LIFTOFF', 'nominal')
      }
    } else if (phase === 'ENGINE_START') {
      const prevCd = cd
      cd -= dt
      thrust = Math.min(7600, thrust + 800 * dt)

      if (prevCd > 3.0 && cd <= 3.0) {
        statusMsg = 'TURBOPUMP FULL SPEED — ALL ENGINES AT 100% RATED THRUST'
        addEventLog(statusMsg, 'ENGINE_START', 'nominal')
      } else if (prevCd > 2.0 && cd <= 2.0) {
        statusMsg = 'PAD HOLD-DOWN CLAMPS RELEASE COMMITTED'
        addEventLog(statusMsg, 'ENGINE_START', 'nominal')
      } else if (prevCd > 1.0 && cd <= 1.0) {
        statusMsg = 'SOUND SUPPRESSION DELUGE MAXIMUM FLOW'
        addEventLog(statusMsg, 'ENGINE_START', 'nominal')
      }

      if (cd <= 0) {
        cd = 0
        newPhase = 'LIFTOFF'
        ft = 0
        thrust = 7600
        statusMsg = 'IGNITION & LIFTOFF — TOWER CLEARED'
        if (get().launchFailure?.kind !== 'no-liftoff') addEventLog(statusMsg, 'LIFTOFF', 'nominal')
      }
    } else {
      // 3. Fast, realistic flight dynamics progression (Part 4)
      const prevFt = ft
      ft += dt

      const {
        towerClearTime,
        gravityTurnStartTime,
        mach1Time,
        maxQTime,
        boosterSepTime,
        mecoTime,
        stage2IgnitionTime,
        fairingSepTime,
        secoTime,
        spacecraftDeployTime,
        solarDeployTime,
        antennaDeployTime,
        orbitStabilizedTime,
        transInjectionTime,
        missionCruiseTime,
      } = STAGE_TIMING_CONFIG

      // Phase state machine with shortened burn durations
      if (ft > 0 && ft <= towerClearTime) {
        newPhase = 'LIFTOFF'
      } else if (ft > towerClearTime && (ft <= boosterSepTime || (!hasBoosters && ft <= mecoTime))) {
        newPhase = 'ASCENT'
      } else if (ft > boosterSepTime && ft <= mecoTime) {
        newPhase = 'BOOSTER_SEPARATION'
      } else if (ft > mecoTime && ft <= fairingSepTime) {
        newPhase = 'STAGE_SEPARATION'
      } else if (ft > fairingSepTime && ft <= secoTime) {
        newPhase = 'FAIRING_SEPARATION'
      } else if (ft > secoTime && ft <= spacecraftDeployTime) {
        newPhase = 'ORBITAL_INSERTION'
      } else if (ft > spacecraftDeployTime && ft <= orbitStabilizedTime) {
        newPhase = 'DEPLOYMENT'
      } else if (ft > orbitStabilizedTime && ft <= transInjectionTime) {
        newPhase = 'ORBITAL_FLIGHT'
      } else if (ft > transInjectionTime && ft <= missionCruiseTime && (missionTarget === 'Lunar Explorer' || missionTarget === 'Mars Pathfinder')) {
        newPhase = 'TRANS_INJECTION'
      } else if (ft > missionCruiseTime && (missionTarget === 'Lunar Explorer' || missionTarget === 'Mars Pathfinder')) {
        newPhase = 'MISSION_CRUISE'
      } else if (ft > orbitStabilizedTime && missionTarget === 'Earth Observer') {
        newPhase = 'MISSION_COMPLETE'
      }

      const failedShort = get().launchFailure?.kind === 'short-of-orbit' && ft > (get().launchFailure?.atTime ?? Infinity)
      // Live milestone triggers & event logging
      if (prevFt <= gravityTurnStartTime && ft > gravityTurnStartTime) {
        statusMsg = 'GRAVITY TURN INITIATED — PITCHING DOWN RANGE TO ORBIT'
        addEventLog(statusMsg, 'ASCENT', 'nominal')
      }
      if (prevFt <= mach1Time && ft > mach1Time) {
        addEventLog('TRANSONIC REGIME — VEHICLE REACHED MACH 1.0', 'ASCENT', 'nominal')
      }
      if (prevFt <= maxQTime && ft > maxQTime && !eventLog.some((e) => e.message.includes('MAX-Q'))) {
        statusMsg = 'PASSING MAX-Q — MAXIMUM DYNAMIC PRESSURE PEAK'
        addEventLog(statusMsg, 'ASCENT', 'nominal')
      }
      if (hasBoosters && prevFt <= boosterSepTime && ft > boosterSepTime) {
        bSep = true
        statusMsg = 'SOLID ROCKET BOOSTERS BURNOUT & PHYSICAL SEPARATION CONFIRMED'
        addEventLog(statusMsg, 'BOOSTER_SEPARATION', 'nominal')
      }
      if (prevFt <= mecoTime && ft > mecoTime) {
        s1Sep = true
        statusMsg = 'MAIN ENGINE CUTOFF (MECO) — STAGE 1 SEPARATION CONFIRMED'
        addEventLog(statusMsg, 'STAGE_SEPARATION', 'nominal')
      }
      if (prevFt <= stage2IgnitionTime && ft > stage2IgnitionTime) {
        addEventLog('STAGE 2 VACUUM ENGINE IGNITION CONFIRMED', 'STAGE_SEPARATION', 'nominal')
      }
      if (prevFt <= fairingSepTime && ft > fairingSepTime) {
        fairingSep = true
        statusMsg = 'PAYLOAD FAIRING JETTISONED — STAGE 2 VACUUM ACCELERATION'
        addEventLog(statusMsg, 'FAIRING_SEPARATION', 'nominal')
      }
      if (!failedShort && prevFt <= secoTime && ft > secoTime) {
        statusMsg = 'SECOND STAGE ENGINE CUTOFF (SECO) — CIRCULAR ORBIT NOMINAL'
        addEventLog(statusMsg, 'ORBITAL_INSERTION', 'nominal')
      }
      if (!failedShort && prevFt <= spacecraftDeployTime && ft > spacecraftDeployTime) {
        scDep = true
        statusMsg = 'PAYLOAD SEPARATION CONFIRMED — SPACE VEHICLE AUTONOMOUS'
        addEventLog(statusMsg, 'DEPLOYMENT', 'nominal')
      }
      if (!failedShort && prevFt <= solarDeployTime && ft > solarDeployTime) {
        solarDep = true
        addEventLog('SOLAR ARRAY WINGS UNFOLDED & ORIENTED TO SUN', 'DEPLOYMENT', 'nominal')
      }
      if (!failedShort && prevFt <= antennaDeployTime && ft > antennaDeployTime) {
        antDep = true
        addEventLog('HIGH-GAIN DEEP SPACE COMMUNICATIONS DISH DEPLOYED', 'DEPLOYMENT', 'nominal')
      }
      if (!failedShort && prevFt <= transInjectionTime && ft > transInjectionTime) {
        if (missionTarget === 'Lunar Explorer') {
          statusMsg = 'TRANS-LUNAR INJECTION (TLI) BURN INITIATED'
          addEventLog(statusMsg, 'TRANS_INJECTION', 'nominal')
        } else if (missionTarget === 'Mars Pathfinder') {
          statusMsg = 'TRANS-MARS INJECTION (TMI) INTERPLANETARY ESCAPE BURN INITIATED'
          addEventLog(statusMsg, 'TRANS_INJECTION', 'nominal')
        } else {
          statusMsg = 'MISSION INSERTION SUCCESSFUL — TELEMETRY HANDOFF TO MISSION CONTROL'
          addEventLog(statusMsg, 'MISSION_COMPLETE', 'nominal')
        }
      }

      // 4. Flight state from the reference ascent profile (real timeline)
      const g0 = 9.81
      if (ft <= secoTime) {
        const st = sampleAscent(ft)
        alt = st.altitudeKm
        vv = st.verticalVelocity
        ov = st.horizontalVelocity
        pitch = st.flightPathAngle
        roll = ft < towerClearTime ? 0 : Math.min(90, (ft - towerClearTime) * 9) // roll program to azimuth
        downrange += (ov * dt) / 1000

        if (ft < mecoTime) {
          // Stage 1: 9 engines, ~7,600 kN at sea level rising to ~8,200 kN in vacuum
          const burn = ft / mecoTime
          s1Prop = 100 * (1 - burn)
          mass = 549000 - 395700 * burn
          // Throttle down through Max-Q and to cap loads near 4 g before MECO
          const throttle = ft > 60 && ft < 80 ? 0.72 : 1
          thrust = Math.round((7600 + 600 * Math.min(1, alt / 40)) * throttle)
          accel = Math.min(3.9 * g0, (thrust * 1000) / mass)
        } else if (ft < stage2IgnitionTime) {
          // Coast: MECO -> stage separation -> second-stage ignition
          s1Prop = 0
          s1Sep = ft >= ASCENT_TIMELINE.stageSep || s1Sep
          mass = 116000
          thrust = 0
          accel = 0
        } else {
          s1Prop = 0
          s1Sep = true
          const burn = Math.min(1, (ft - stage2IgnitionTime) / (secoTime - stage2IgnitionTime))
          s2Prop = Math.max(6, 100 * (1 - burn * 0.94))
          mass = (fairingSep ? 114100 : 116000) - 101000 * burn
          thrust = 981
          // Upper stage throttles back near burnout to hold ~4 g
          accel = Math.min(4.0 * g0, (thrust * 1000) / mass)
          thrust = Math.round(Math.min(thrust, (accel * mass) / 1000))
        }
      } else if (newPhase === 'TRANS_INJECTION') {
        // Upper stage relight: accelerate from circular orbit towards escape speed
        transInj = true
        thrust = 981
        mass = Math.max(9000, mass - 150 * dt)
        accel = (thrust * 1000) / mass
        ov = Math.min(10900, ov + accel * dt * 0.25)
        vv = Math.min(1500, vv + 6 * dt)
        alt += (vv * dt) / 1000
        downrange += (ov * dt) / 1000
        pitch = Math.max(0, (Math.atan2(vv, ov) * 180) / Math.PI)
      } else {
        // Coasting in a circular parking orbit, or cruising after injection
        thrust = 0
        accel = 0
        if (!transInj) {
          alt = ORBIT_ALTITUDE_KM
          vv = 0
          ov = ORBIT_VELOCITY_MS
          pitch = 0
        } else {
          alt += (vv * dt) / 1000
        }
        downrange += (ov * dt) / 1000
        s2Prop = Math.max(0, s2Prop)
        orbitStab = true
        if (newPhase === 'MISSION_CRUISE' || newPhase === 'MISSION_COMPLETE') {
          pwr = 620
          batt = 100
        }
      }
      if (!failedShort) {
        if (ft > secoTime) orbitStab = true
        if (ft > spacecraftDeployTime) scDep = true
        if (ft > solarDeployTime) solarDep = true
        if (ft > antennaDeployTime) antDep = true
      }
    }

    // ---- Consequences of flying a flawed design ("launch anyway") ----
    const failure = get().launchFailure
    let lost = telemetry.vehicleLost
    if (failure) {
      const counting = newPhase === 'COUNTDOWN' || newPhase === 'ENGINE_START'
      if (failure.kind === 'scrub' && counting && cd <= failure.atTime) {
        newPhase = 'ABORTED'
        cd = failure.atTime
        thrust = 0
        statusMsg = 'HOLD HOLD HOLD — LAUNCH SCRUBBED: PAYLOAD INTEGRATION CHECK FAILED'
        addEventLog(statusMsg, 'ABORTED', 'critical')
      } else if (failure.kind === 'no-liftoff' && newPhase === 'LIFTOFF') {
        newPhase = 'ABORTED'
        ft = 0
        thrust = 0
        alt = 0
        vv = 0
        ov = 0
        accel = 0
        statusMsg = 'ABORT — THRUST-TO-WEIGHT BELOW 1.0, NO LIFTOFF, ENGINES SAFED ON PAD'
        addEventLog(statusMsg, 'ABORTED', 'critical')
      } else if (failure.kind === 'breakup' && !counting && ft >= failure.atTime) {
        newPhase = 'ABORTED'
        lost = true
        thrust = 0
        statusMsg = 'VEHICLE BREAKUP AT MAX-Q — LOSS OF VEHICLE CONFIRMED'
        addEventLog(statusMsg, 'ABORTED', 'critical')
      } else if (failure.kind === 'short-of-orbit' && !counting && ft > ASCENT_TIMELINE.stage2Ignition) {
        const tFail = failure.atTime
        const vEnd = failure.burnoutSpeed ?? ORBIT_VELOCITY_MS
        const atFail = sampleAscent(tFail)
        if (ft <= tFail) {
          // The heavier stack accelerates more slowly through the second-stage burn
          const p = (ft - ASCENT_TIMELINE.stage2Ignition) / (tFail - ASCENT_TIMELINE.stage2Ignition)
          ov *= 1 - (1 - vEnd / Math.max(1, atFail.horizontalVelocity)) * p
        } else {
          if (telemetry.flightTime <= tFail) {
            statusMsg = `STAGE 2 PROPELLANT DEPLETION AT ${Math.round(vEnd).toLocaleString()} M/S — SHORT OF ORBITAL VELOCITY`
            addEventLog(statusMsg, 'REENTRY', 'critical')
          }
          newPhase = 'REENTRY'
          thrust = 0
          accel = 0
          s2Prop = 0
          // Ballistic fall back from the top of the trajectory
          const tau = ft - tFail
          const D = 1150
          const a0 = atFail.altitudeKm
          alt = Math.max(0, a0 * (1 - (tau / D) * (tau / D)))
          vv = (-2 * a0 * 1000 * tau) / (D * D)
          ov = vEnd + tau * 0.9
          pitch = (Math.atan2(vv, ov) * 180) / Math.PI
          if (telemetry.altitude >= 100 && alt < 100) {
            statusMsg = 'ENTRY INTERFACE — PLASMA BLACKOUT, VEHICLE NOT DESIGNED TO SURVIVE RE-ENTRY'
            addEventLog(statusMsg, 'REENTRY', 'critical')
          }
          if (alt <= 45) {
            newPhase = 'ABORTED'
            lost = true
            statusMsg = 'VEHICLE BROKE UP DURING RE-ENTRY — DEBRIS IN THE ATLANTIC'
            addEventLog(statusMsg, 'ABORTED', 'critical')
          }
        }
      }
    }

    const density = atmosphericDensity(alt)
    const totV = Math.sqrt(vv * vv + ov * ov)
    const mach = alt < 80 ? totV / speedOfSound(alt) : telemetry.machNumber
    const dynPressure = (0.5 * density * totV * totV) / 1000
    if (dynPressure > maxQ) maxQ = dynPressure

    const currentTotV = totV
    const onPad = newPhase === 'COUNTDOWN' || newPhase === 'ENGINE_START'
    const currentAccel = onPad ? 0 : accel
    const currentGForce = onPad ? 1 : Math.max(0, currentAccel / 9.81)
    // Cape Canaveral (28.5°N) gets ~408 m/s for free from Earth's rotation
    const inertV = Math.sqrt(Math.pow(ov + 408, 2) + vv * vv)
    const targetV = missionTarget === 'Lunar Explorer' || missionTarget === 'Mars Pathfinder' ? 10900 : ORBIT_VELOCITY_MS
    const remDeltaV = Math.round(Math.max(0, targetV - currentTotV) * (alt < 100 ? 1.18 : 1.02))

    set({
      phase: newPhase,
      telemetry: {
        phase: newPhase,
        countdownSeconds: Math.max(0, cd),
        flightTime: ft,
        statusMessage: statusMsg,
        altitude: Math.max(0, alt),
        downrange,
        groundVelocity: currentTotV,
        inertialVelocity: inertV,
        orbitalVelocity: ov,
        verticalVelocity: vv,
        totalVelocity: currentTotV,
        acceleration: currentAccel,
        gForce: currentGForce,
        machNumber: mach,
        dynamicPressure: Math.max(0, dynPressure),
        maxQPeak: maxQ,
        atmosphericDensity: Math.max(0, density),
        pitchAngle: pitch,
        yawAngle: yaw,
        rollAngle: roll,
        thrust,
        vehicleMass: mass,
        stage1Propellant: Math.max(0, s1Prop),
        stage2Propellant: Math.max(0, s2Prop),
        totalPropellant: Math.max(0, (s1Prop + s2Prop) / 2),
        remainingDeltaV: remDeltaV,
        stage1Separated: s1Sep,
        boostersSeparated: bSep,
        fairingSeparated: fairingSep,
        spacecraftDeployed: scDep,
        solarPanelsDeployed: solarDep,
        antennasDeployed: antDep,
        orbitalStabilized: orbitStab,
        transInjectionComplete: transInj,
        communicationLocked: true,
        vehicleLost: lost,
        batteryState: batt,
        powerGeneration: pwr,
        spacecraftHealth: 100,
        missionTarget:
          missionTarget === 'Lunar Explorer'
            ? 'Lunar Transfer'
            : missionTarget === 'Mars Pathfinder'
            ? 'Mars Transfer'
            : 'Earth Orbit',
      },
    })
  },
}))
