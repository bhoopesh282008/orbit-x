import type { SpacecraftComponent, LaunchVehicle } from '@/stores/spacecraftStore'
import type { Mission } from '@/stores/missionStore'
import { calculateTsiolkovskyDeltaV } from '@/services/flightDynamics'

export interface SpacecraftEngineeringMetrics {
  totalMassKg: number
  dryMassKg: number
  wetMassKg: number
  propellantMassKg: number
  remainingPropellantKg: number
  spacecraftDeltaV: number
  vehicleDeltaV: number
  totalAvailableDeltaV: number
  requiredMissionDeltaV: number
  powerGenerationWatts: number
  powerConsumptionWatts: number
  powerBalanceWatts: number
  batteryCapacityWh: number
  totalCostCredits: number
  remainingBudgetCredits: number
  isOverBudget: boolean
  isOverMassLimit: boolean
  isPowerDeficit: boolean
  hasStructureBus: boolean
  hasPropulsionEngine: boolean
  hasPropellantTank: boolean
  hasBatteryStorage: boolean
  hasCommunicationAntenna: boolean
  hasMandatoryInstruments: boolean
  missingInstruments: string[]
}

/**
 * Single source of truth calculation for all Spacecraft systems
 */
export function calculateSpacecraftMetrics(
  components: SpacecraftComponent[],
  vehicle: LaunchVehicle | null,
  mission: Mission | undefined,
  userReserveDeltaV = 150
): SpacecraftEngineeringMetrics {
  // Mass breakdown
  const totalMassKg = components.reduce((sum, c) => sum + c.mass, 0)
  const fuelComp = components.find((c) => c.category === 'fuel')
  const propulsionComp = components.find((c) => c.category === 'propulsion')

  // Propellant sizing
  let propellantMassKg = 0
  if (fuelComp) {
    if (fuelComp.id === 'fuel-large') propellantMassKg = 1600
    else if (fuelComp.id === 'fuel-medium') propellantMassKg = 650
    else propellantMassKg = 200
  }

  const dryMassKg = Math.max(totalMassKg - propellantMassKg, 40)
  const wetMassKg = dryMassKg + propellantMassKg

  // Specific Impulse Isp determination
  let ispSeconds = 0
  if (propulsionComp && fuelComp) {
    if (propulsionComp.id === 'prop-chemical') ispSeconds = 320
    else if (propulsionComp.id === 'prop-electric') ispSeconds = 1800
    else if (propulsionComp.id === 'prop-ion') ispSeconds = 4100
    else ispSeconds = 300
  }

  // Astrodynamic Tsiolkovsky delta-V
  const spacecraftDeltaV = Math.round(calculateTsiolkovskyDeltaV(wetMassKg, dryMassKg, ispSeconds))
  const vehicleDeltaV = vehicle?.maxDeltaV ?? 0
  const totalAvailableDeltaV = vehicleDeltaV + spacecraftDeltaV

  // Required delta-V (mission nominal requirement + user safety reserve)
  const missionBaseDV = mission?.minDeltaV ?? 3200
  const requiredMissionDeltaV = missionBaseDV + userReserveDeltaV

  // Electrical Power & Energy Storage
  const powerGenerationWatts = components.reduce((sum, c) => sum + c.powerGeneration, 0)
  const powerConsumptionWatts = components.reduce((sum, c) => sum + c.powerConsumption, 0)
  const powerBalanceWatts = powerGenerationWatts - powerConsumptionWatts

  const batteryComp = components.find((c) => c.category === 'energy')
  let batteryCapacityWh = 0
  if (batteryComp) {
    if (batteryComp.id === 'energy-high') batteryCapacityWh = 1800
    else batteryCapacityWh = 600
  }

  // Financial accounting
  const componentCost = components.reduce((sum, c) => sum + c.cost, 0)
  const vehicleCost = vehicle?.cost ?? 0
  const totalCostCredits = componentCost + vehicleCost
  const missionBudget = mission?.budget ?? 0
  const remainingBudgetCredits = missionBudget - totalCostCredits

  // Readiness flags
  const hasStructureBus = components.some((c) => c.category === 'structure')
  const hasPropulsionEngine = Boolean(propulsionComp)
  const hasPropellantTank = Boolean(fuelComp)
  const hasBatteryStorage = Boolean(batteryComp)
  const hasCommunicationAntenna = components.some((c) => c.category === 'communication')

  const requiredInsts = mission?.requiredInstruments ?? []
  const missingInstruments = requiredInsts.filter((req) => {
    const reqNormalized = req.toLowerCase().replace('inst-', '')
    return !components.some(
      (c) => c.id.toLowerCase() === req.toLowerCase() ||
             c.id.toLowerCase() === `inst-${reqNormalized}` ||
             c.name.toLowerCase().includes(reqNormalized)
    )
  })
  const hasMandatoryInstruments = missingInstruments.length === 0

  const isOverMassLimit = Boolean(vehicle && totalMassKg > vehicle.payloadCapacity)
  const isOverBudget = remainingBudgetCredits < 0
  const isPowerDeficit = powerBalanceWatts < 0

  return {
    totalMassKg,
    dryMassKg,
    wetMassKg,
    propellantMassKg,
    remainingPropellantKg: propellantMassKg,
    spacecraftDeltaV,
    vehicleDeltaV,
    totalAvailableDeltaV,
    requiredMissionDeltaV,
    powerGenerationWatts,
    powerConsumptionWatts,
    powerBalanceWatts,
    batteryCapacityWh,
    totalCostCredits,
    remainingBudgetCredits,
    isOverBudget,
    isOverMassLimit,
    isPowerDeficit,
    hasStructureBus,
    hasPropulsionEngine,
    hasPropellantTank,
    hasBatteryStorage,
    hasCommunicationAntenna,
    hasMandatoryInstruments,
    missingInstruments,
  }
}
