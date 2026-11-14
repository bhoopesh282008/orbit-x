import { create } from 'zustand'
import {
  type SubsystemHealthState,
  type ThermalState,
  type PowerState,
  type CommunicationState,
  type GNCState,
  type ScienceBufferState,
  calculateThermalStep,
  calculatePowerStep,
  calculateCommLink,
} from '@/services/spacecraftSystems'
import {
  type CommandId,
  type QueuedCommand,
  COMMAND_ALLOWLIST,
} from '@/services/commandSystem'
import { getGroundStationPass, type GroundStation } from '@/services/groundStations'
import type { SpacecraftComponent } from '@/stores/spacecraftStore'

export interface TelemetryLogPoint {
  time: number
  velocity: number
  altitudeKm: number
  batteryPercent: number
  busTemperatureC: number
  netPowerWatts: number
  linkMarginDb: number
}

export interface FlightAlarm {
  id: string
  time: number
  severity: 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL'
  subsystem: string
  title: string
  condition: string
  recommendedAction: string
  acknowledged: boolean
}

interface AdvancedSimulationState {
  missionId: string
  simTimeSeconds: number
  timeMultiplier: number // 1x, 5x, 10x, 50x
  isPaused: boolean
  isCompleted: boolean

  // Physical orbital telemetry
  currentAltitudeKm: number
  currentVelocityMS: number
  totalDeltaVSpent: number
  totalDeltaVRemaining: number
  fuelMassRemainingKg: number

  // Subsystems
  health: SubsystemHealthState
  thermal: ThermalState
  power: PowerState
  comm: CommunicationState
  gnc: GNCState
  science: ScienceBufferState

  // Environment
  solarDistanceAu: number
  inEclipse: boolean
  radiationIndex: number // 0-10 index

  // Command & ground
  groundStations: GroundStation[]
  commandQueue: QueuedCommand[]
  commandHistory: QueuedCommand[]
  alarms: FlightAlarm[]
  telemetryHistory: TelemetryLogPoint[]

  // Actions
  initializeSimulation: (missionId: string, components: SpacecraftComponent[]) => void
  advanceSimulationStep: (deltaSeconds: number, components: SpacecraftComponent[]) => void
  setSimulationSpeed: (speed: number) => void
  togglePause: () => void
  queueCommand: (commandId: CommandId) => { success: boolean; message: string }
  acknowledgeAlarm: (alarmId: string) => void
  clearResolvedAlarms: () => void
}

const initialThermal: ThermalState = {
  busTemperatureC: 21.4,
  payloadTemperatureC: 19.8,
  batteryTemperatureC: 22.0,
  radiatorEfficiency: 0.95,
  heaterActive: false,
  eclipseStatus: false,
}

const initialPower: PowerState = {
  generationWatts: 450,
  consumptionWatts: 280,
  netBalanceWatts: 170,
  batteryChargePercent: 98.5,
  batteryCapacityWh: 1500,
  solarArrayEfficiency: 1.0,
  isEclipse: false,
  powerDeficitAlert: false,
}

const initialComm: CommunicationState = {
  distanceKm: 384400,
  antennaMode: 'high-gain',
  signalStrengthDbm: -92,
  linkMarginDb: 8.4,
  latencySeconds: 1.28,
  dataRateKbps: 2500,
  groundStationVisible: true,
  activeGroundStation: 'Goldstone Deep Space Complex',
}

const initialGnc: GNCState = {
  attitudeMode: 'sun-pointing',
  pointingErrorDegrees: 0.08,
  reactionWheelSpeedRpm: 1420,
  starTrackerLocked: true,
  maneuverReadiness: true,
}

const initialScience: ScienceBufferState = {
  storedDataMb: 42,
  maxStorageMb: 512,
  pendingDownlinkMb: 42,
  totalDataCollectedMb: 128,
  activeInstrumentIds: ['inst-camera', 'inst-spectrometer'],
}

const initialHealth: SubsystemHealthState = {
  overallHealth: 100,
  structureHealth: 100,
  propulsionHealth: 100,
  powerHealth: 100,
  commHealth: 100,
  thermalHealth: 100,
  gncHealth: 100,
  obcHealth: 100,
  safeModeActive: false,
}

export const useAdvancedSimulationStore = create<AdvancedSimulationState>()((set, get) => ({
  missionId: 'lunar-explorer',
  simTimeSeconds: 0,
  timeMultiplier: 1,
  isPaused: false,
  isCompleted: false,

  currentAltitudeKm: 350,
  currentVelocityMS: 7680,
  totalDeltaVSpent: 0,
  totalDeltaVRemaining: 4250,
  fuelMassRemainingKg: 450,

  health: initialHealth,
  thermal: initialThermal,
  power: initialPower,
  comm: initialComm,
  gnc: initialGnc,
  science: initialScience,

  solarDistanceAu: 1.0,
  inEclipse: false,
  radiationIndex: 1.2,

  groundStations: getGroundStationPass(0),
  commandQueue: [],
  commandHistory: [],
  alarms: [],
  telemetryHistory: [],

  initializeSimulation: (missionId: string, components: SpacecraftComponent[]) => {
    const fuelComp = components.find((c) => c.category === 'fuel')
    const fuelMass = fuelComp ? (fuelComp.id === 'fuel-large' ? 1600 : fuelComp.id === 'fuel-medium' ? 650 : 200) : 150

    set({
      missionId,
      simTimeSeconds: 0,
      isPaused: false,
      isCompleted: false,
      currentAltitudeKm: missionId === 'earth-observer' ? 650 : 250,
      currentVelocityMS: 7750,
      fuelMassRemainingKg: fuelMass,
      totalDeltaVRemaining: 4400,
      totalDeltaVSpent: 0,
      groundStations: getGroundStationPass(0),
      commandQueue: [],
      commandHistory: [],
      alarms: [
        {
          id: 'alm-init',
          time: 0,
          severity: 'INFO',
          subsystem: 'TELEMETRY',
          title: 'Mission Clock Initialized',
          condition: 'T-0 Separation confirmation received',
          recommendedAction: 'Monitor primary bus deployment voltages',
          acknowledged: true,
        },
      ],
      telemetryHistory: [
        {
          time: 0,
          velocity: 7750,
          altitudeKm: 250,
          batteryPercent: 98.5,
          busTemperatureC: 21.4,
          netPowerWatts: 170,
          linkMarginDb: 8.4,
        },
      ],
    })
  },

  advanceSimulationStep: (deltaSeconds: number, components: SpacecraftComponent[]) => {
    const state = get()
    if (state.isPaused || state.isCompleted) return

    const newTime = state.simTimeSeconds + deltaSeconds

    // Simulate periodic eclipse when orbiting (e.g. 35 mins every 90 mins orbit)
    const orbitPeriodSeconds = 5400
    const phaseInOrbit = (newTime % orbitPeriodSeconds) / orbitPeriodSeconds
    const isEclipse = phaseInOrbit > 0.65 && phaseInOrbit < 0.95

    // Physical distance (increasing during transfer)
    const maxDist = state.missionId === 'mars-pathfinder' ? 225000000 : 384400
    const progressRatio = Math.min(newTime / 300000, 1)
    const distanceKm = Math.max(300, progressRatio * maxDist)

    // Calculate ground stations
    const updatedGroundStations = getGroundStationPass(newTime)
    const hasGroundContact = updatedGroundStations.some((g) => g.contactActive)

    // Run subsystem physical calculations
    const updatedThermal = calculateThermalStep(
      state.thermal,
      state.power.consumptionWatts,
      state.solarDistanceAu,
      isEclipse,
      deltaSeconds
    )

    const updatedPower = calculatePowerStep(
      components,
      state.power,
      state.solarDistanceAu,
      isEclipse,
      state.health.safeModeActive,
      deltaSeconds
    )

    const updatedComm = calculateCommLink(distanceKm, components, hasGroundContact)

    // Science generation & downlink
    let newStoredData = state.science.storedDataMb
    let newCollected = state.science.totalDataCollectedMb
    let newPendingDownlink = state.science.pendingDownlinkMb

    if (!state.health.safeModeActive && !isEclipse && updatedPower.batteryChargePercent > 35) {
      // Instruments accumulate science data
      const dataRateMbPerSec = 0.08
      newStoredData = Math.min(state.science.maxStorageMb, newStoredData + dataRateMbPerSec * deltaSeconds)
      newCollected += dataRateMbPerSec * deltaSeconds
      newPendingDownlink = newStoredData
    }

    // Downlink if ground station active
    if (hasGroundContact && updatedComm.dataRateKbps > 0 && newStoredData > 0) {
      const downlinkMb = (updatedComm.dataRateKbps / 8000) * deltaSeconds
      newStoredData = Math.max(0, newStoredData - downlinkMb)
      newPendingDownlink = newStoredData
    }

    // Process queued commands
    const newQueue = [...state.commandQueue]
    const newHistory = [...state.commandHistory]

    if (newQueue.length > 0) {
      const cmd = newQueue.shift()!
      cmd.status = 'ACKNOWLEDGED'
      cmd.responseMessage = 'Telemetry verified. Subsystem state updated.'
      newHistory.unshift(cmd)

      // Execute command effects
      if (cmd.commandId === 'CMD_SAFE_MODE_ENTER') {
        state.health.safeModeActive = true
        state.gnc.attitudeMode = 'safe-mode'
      } else if (cmd.commandId === 'CMD_SAFE_MODE_EXIT') {
        state.health.safeModeActive = false
        state.gnc.attitudeMode = 'sun-pointing'
      } else if (cmd.commandId === 'CMD_ATTITUDE_POINT_EARTH') {
        state.gnc.attitudeMode = 'earth-pointing'
      } else if (cmd.commandId === 'CMD_ATTITUDE_POINT_SUN') {
        state.gnc.attitudeMode = 'sun-pointing'
      } else if (cmd.commandId === 'CMD_ATTITUDE_POINT_TARGET') {
        state.gnc.attitudeMode = 'target-tracking'
      }
    }

    // Check Alarm Triggers
    const newAlarms = [...state.alarms]
    if (updatedPower.powerDeficitAlert && !newAlarms.some((a) => a.title.includes('Battery Depletion Warning'))) {
      newAlarms.unshift({
        id: `alm-bat-${newTime}`,
        time: Math.round(newTime),
        severity: 'WARNING',
        subsystem: 'EPS',
        title: 'Battery Depletion Warning (<30%)',
        condition: 'Eclipse state drawing power from reserves',
        recommendedAction: 'Engage safe mode or shed non-essential instrument loads',
        acknowledged: false,
      })
    }

    if (updatedThermal.busTemperatureC < -15 && !newAlarms.some((a) => a.title.includes('Thermal Cold Stress'))) {
      newAlarms.unshift({
        id: `alm-thm-${newTime}`,
        time: Math.round(newTime),
        severity: 'CAUTION',
        subsystem: 'THERMAL',
        title: 'Thermal Cold Stress Warning',
        condition: 'Bus temperature below -15°C',
        recommendedAction: 'Verify survival heaters active and reorient to solar vector',
        acknowledged: false,
      })
    }

    // Append telemetry history point periodically
    let newHistoryPoints = state.telemetryHistory
    if (state.telemetryHistory.length === 0 || newTime - state.telemetryHistory[state.telemetryHistory.length - 1].time >= 3) {
      newHistoryPoints = [
        ...state.telemetryHistory.slice(-40), // keep last 40 points
        {
          time: Math.round(newTime),
          velocity: Math.round(state.currentVelocityMS),
          altitudeKm: Math.round(state.currentAltitudeKm),
          batteryPercent: updatedPower.batteryChargePercent,
          busTemperatureC: updatedThermal.busTemperatureC,
          netPowerWatts: updatedPower.netBalanceWatts,
          linkMarginDb: updatedComm.linkMarginDb,
        },
      ]
    }

    set({
      simTimeSeconds: newTime,
      inEclipse: isEclipse,
      groundStations: updatedGroundStations,
      thermal: updatedThermal,
      power: updatedPower,
      comm: updatedComm,
      science: {
        ...state.science,
        storedDataMb: Math.round(newStoredData * 10) / 10,
        pendingDownlinkMb: Math.round(newPendingDownlink * 10) / 10,
        totalDataCollectedMb: Math.round(newCollected * 10) / 10,
      },
      commandQueue: newQueue,
      commandHistory: newHistory.slice(0, 20),
      alarms: newAlarms.slice(0, 15),
      telemetryHistory: newHistoryPoints,
    })
  },

  setSimulationSpeed: (speed: number) => set({ timeMultiplier: speed }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  queueCommand: (commandId: CommandId) => {
    const def = COMMAND_ALLOWLIST[commandId]
    if (!def) return { success: false, message: 'Invalid command code' }

    const newCmd: QueuedCommand = {
      queueId: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      commandId,
      timestamp: Math.round(get().simTimeSeconds),
      status: 'QUEUED',
    }

    set((state) => ({
      commandQueue: [...state.commandQueue, newCmd],
    }))

    return { success: true, message: `Command ${def.name} queued for uplink` }
  },

  acknowledgeAlarm: (alarmId: string) => {
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === alarmId ? { ...a, acknowledged: true } : a)),
    }))
  },

  clearResolvedAlarms: () => {
    set((state) => ({
      alarms: state.alarms.filter((a) => !a.acknowledged),
    }))
  },
}))
