/**
 * ORBIT-X Spacecraft Subsystems & Interconnected Simulation Engine
 * Models:
 * - Structural Mass Distribution (Dry, Wet, Payload fractions)
 * - Lumped Thermal Model (Solar flux, internal dissipation, radiative cooling to 3K space)
 * - Power Balance (Solar irradiance, array degradation, battery State-of-Charge SoC)
 * - Communication Link Budget (Free-space path loss, antenna gain, data rate, latency)
 * - Guidance, Navigation & Control (Attitude modes, pointing error)
 * - Onboard Data Storage & Flight Software Queue
 */

import type { SpacecraftComponent } from '@/stores/spacecraftStore'

export type AttitudeMode = 
  | 'sun-pointing' 
  | 'earth-pointing' 
  | 'target-tracking' 
  | 'maneuver-burn' 
  | 'science-observation' 
  | 'safe-mode'

export interface SubsystemHealthState {
  overallHealth: number // 0-100%
  structureHealth: number
  propulsionHealth: number
  powerHealth: number
  commHealth: number
  thermalHealth: number
  gncHealth: number
  obcHealth: number
  safeModeActive: boolean
}

export interface ThermalState {
  busTemperatureC: number // Current internal chassis temperature in Celsius (-40 to +85)
  payloadTemperatureC: number // Optical/scientific instruments temp
  batteryTemperatureC: number // Battery operating temperature
  radiatorEfficiency: number // 0-1
  heaterActive: boolean
  eclipseStatus: boolean
}

export interface PowerState {
  generationWatts: number
  consumptionWatts: number
  netBalanceWatts: number
  batteryChargePercent: number // 0-100%
  batteryCapacityWh: number
  solarArrayEfficiency: number // e.g. 1.0 down to 0.7 after radiation/micrometeoroid
  isEclipse: boolean
  powerDeficitAlert: boolean
}

export interface CommunicationState {
  distanceKm: number
  antennaMode: 'low-gain' | 'high-gain' | 'deep-space'
  signalStrengthDbm: number // -130 dBm to -60 dBm
  linkMarginDb: number // Link margin in decibels (>3 dB is healthy)
  latencySeconds: number // One-way light time (d / c)
  dataRateKbps: number
  groundStationVisible: boolean
  activeGroundStation: string | null
}

export interface GNCState {
  attitudeMode: AttitudeMode
  pointingErrorDegrees: number // 0.01 to 5.0 deg
  reactionWheelSpeedRpm: number
  starTrackerLocked: boolean
  maneuverReadiness: boolean
}

export interface ScienceBufferState {
  storedDataMb: number
  maxStorageMb: number
  pendingDownlinkMb: number
  totalDataCollectedMb: number
  activeInstrumentIds: string[]
}

/**
 * Calculates physical mass distribution
 */
export function calculateMassBreakdown(components: SpacecraftComponent[]) {
  let dryMass = 0
  let fuelMass = 0
  let payloadMass = 0

  for (const c of components) {
    if (c.category === 'fuel') {
      fuelMass += c.mass
    } else if (c.category === 'instruments') {
      payloadMass += c.mass
      dryMass += c.mass
    } else {
      dryMass += c.mass
    }
  }

  const wetMass = dryMass + fuelMass
  return {
    dryMass,
    fuelMass,
    payloadMass,
    wetMass,
    payloadFractionPercent: wetMass > 0 ? (payloadMass / wetMass) * 100 : 0,
    fuelFractionPercent: wetMass > 0 ? (fuelMass / wetMass) * 100 : 0,
  }
}

/**
 * Educational Lumped Thermal Balance Calculation
 * Q_in (Solar + Albedo + Internal Power) = Q_out (Radiated to deep space via Stefan-Boltzmann)
 * Bus temperature response over time delta (seconds)
 */
export function calculateThermalStep(
  currentThermal: ThermalState,
  powerConsumptionWatts: number,
  solarDistanceAu: number,
  isEclipse: boolean,
  deltaSeconds: number
): ThermalState {
  const solarConstantEarth = 1361 // W/m^2 at 1 AU
  const solarFlux = isEclipse ? 0 : solarConstantEarth / Math.pow(solarDistanceAu, 2)

  // Target equilibrium temperature in Celsius
  // Base cold equilibrium in eclipse is ~ -35 C, under full sun with avionics is ~ +25 C
  let targetTemp = -35 + (solarFlux / 1361) * 45 + (powerConsumptionWatts / 500) * 15

  if (currentThermal.heaterActive) {
    targetTemp += 15
  }

  // Thermal inertia smoothing: dT/dt = (T_target - T) / tau
  const thermalTau = 240 // Thermal mass time constant in seconds
  const tempDiff = targetTemp - currentThermal.busTemperatureC
  const tempChange = (tempDiff / thermalTau) * deltaSeconds

  const newBusTemp = Math.round((currentThermal.busTemperatureC + tempChange) * 10) / 10
  const newPayloadTemp = Math.round((newBusTemp - (isEclipse ? 4 : 1)) * 10) / 10
  const newBatTemp = Math.round((newBusTemp + 2) * 10) / 10

  return {
    ...currentThermal,
    busTemperatureC: newBusTemp,
    payloadTemperatureC: newPayloadTemp,
    batteryTemperatureC: newBatTemp,
    eclipseStatus: isEclipse,
    heaterActive: newBusTemp < 5, // Auto-heater trigger when chilling below +5 C
  }
}

/**
 * Electrical Power System (EPS) Step
 */
export function calculatePowerStep(
  components: SpacecraftComponent[],
  currentPower: PowerState,
  solarDistanceAu: number,
  isEclipse: boolean,
  isSafeMode: boolean,
  deltaSeconds: number
): PowerState {
  const solarFluxRatio = isEclipse ? 0 : 1 / Math.pow(solarDistanceAu, 2)
  const baseGen = components.reduce((sum, c) => sum + c.powerGeneration, 0)
  const generationWatts = Math.round(baseGen * solarFluxRatio * currentPower.solarArrayEfficiency)

  // In safe mode, non-essential instruments and payloads are cut
  let consumptionWatts = components.reduce((sum, c) => {
    if (isSafeMode && c.category === 'instruments') return sum
    return sum + c.powerConsumption
  }, 0)

  if (isSafeMode) {
    consumptionWatts = Math.round(consumptionWatts * 0.45) // Avionics sleep mode
  }

  const netBalanceWatts = generationWatts - consumptionWatts

  // Energy delta: Watt * hours = (Watts * deltaSeconds) / 3600
  const energyDeltaWh = (netBalanceWatts * deltaSeconds) / 3600
  const batteryCap = currentPower.batteryCapacityWh > 0 ? currentPower.batteryCapacityWh : 1200
  const currentEnergyWh = (currentPower.batteryChargePercent / 100) * batteryCap
  const newEnergyWh = Math.max(0, Math.min(batteryCap, currentEnergyWh + energyDeltaWh))
  const newChargePercent = Math.round((newEnergyWh / batteryCap) * 1000) / 10

  return {
    ...currentPower,
    generationWatts,
    consumptionWatts,
    netBalanceWatts,
    batteryChargePercent: newChargePercent,
    isEclipse,
    powerDeficitAlert: newChargePercent < 25 || (netBalanceWatts < 0 && isEclipse),
  }
}

/**
 * Communication Link Budget Calculation
 * Free-space path loss (FSPL): 20*log10(d) + 20*log10(f) + 92.45
 * One-way light time: distance / speed of light
 */
export function calculateCommLink(
  distanceKm: number,
  components: SpacecraftComponent[],
  hasGroundVisibility: boolean
): CommunicationState {
  const speedOfLightKmS = 299792.458
  const latencySeconds = Math.max(0.05, Math.round((distanceKm / speedOfLightKmS) * 100) / 100)

  const hasDeepSpace = components.some((c) => c.id === 'comm-deep')
  const hasHighGain = components.some((c) => c.id === 'comm-high')

  const antennaMode = hasDeepSpace ? 'deep-space' : hasHighGain ? 'high-gain' : 'low-gain'

  // Approximate signal strength in dBm based on distance and antenna gain
  let baseEIRP = antennaMode === 'deep-space' ? 85 : antennaMode === 'high-gain' ? 65 : 45
  // Path loss approximation
  const pathLossFactor = Math.log10(Math.max(distanceKm, 100)) * 18
  const signalStrengthDbm = Math.round(baseEIRP - pathLossFactor - 110)

  const noiseFloorDbm = -125
  const linkMarginDb = Math.max(-10, Math.round((signalStrengthDbm - noiseFloorDbm) * 10) / 10)

  let dataRateKbps = 0
  if (hasGroundVisibility && linkMarginDb > 0) {
    if (antennaMode === 'deep-space') dataRateKbps = 12000
    else if (antennaMode === 'high-gain') dataRateKbps = 2500
    else dataRateKbps = 128
  }

  return {
    distanceKm: Math.round(distanceKm),
    antennaMode,
    signalStrengthDbm,
    linkMarginDb,
    latencySeconds,
    dataRateKbps,
    groundStationVisible: hasGroundVisibility,
    activeGroundStation: hasGroundVisibility ? 'Deep Space Network (Madrid/Goldstone)' : null,
  }
}

