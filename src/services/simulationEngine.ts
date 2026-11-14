import type { SpacecraftComponent, LaunchVehicle } from '@/stores/spacecraftStore'
import type { Mission } from '@/stores/missionStore'
import { calculateSpacecraftMetrics, type SpacecraftEngineeringMetrics } from './engineeringCalculations'

export interface ValidationItem {
  category: 'Structure' | 'Propulsion' | 'Power' | 'Communication' | 'Launch Vehicle' | 'Science Payload' | 'Budget'
  title: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  metric?: string
}

export interface ValidationReport {
  overallPass: boolean
  items: ValidationItem[]
  metrics: SpacecraftEngineeringMetrics
  totalMass: number
  totalCost: number
  remainingBudget: number
  deltaV: number
  powerBalance: number
}

export function validateSpacecraftMission(
  components: SpacecraftComponent[],
  vehicle: LaunchVehicle | null,
  mission: Mission | undefined,
  userReserveDeltaV = 150
): ValidationReport {
  const metrics = calculateSpacecraftMetrics(components, vehicle, mission, userReserveDeltaV)
  const items: ValidationItem[] = []

  // 1. STRUCTURAL READINESS
  if (!metrics.hasStructureBus) {
    items.push({
      category: 'Structure',
      title: 'Spacecraft Bus Chassis',
      status: 'fail',
      message: 'No structural chassis bus installed. Avionics and instruments cannot be mounted without a bus frame.',
    })
  } else {
    items.push({
      category: 'Structure',
      title: 'Spacecraft Bus Chassis',
      status: 'pass',
      message: `Modular aerospace chassis integrated. Dry structural baseline: ${metrics.dryMassKg} kg.`,
      metric: `${metrics.dryMassKg} kg dry`,
    })
  }

  // 2. PROPULSION & DELTA-V READINESS
  if (!metrics.hasPropulsionEngine) {
    items.push({
      category: 'Propulsion',
      title: 'Spacecraft Engine System',
      status: 'fail',
      message: 'No propulsion thruster engine installed. Spacecraft cannot execute orbital burns or trajectory adjustments.',
    })
  } else if (!metrics.hasPropellantTank) {
    items.push({
      category: 'Propulsion',
      title: 'Propellant Tank Storage',
      status: 'fail',
      message: 'Engine installed without propellant tank. Spacecraft lacks propellant to generate thrust impulse.',
    })
  } else {
    items.push({
      category: 'Propulsion',
      title: 'Spacecraft Thruster & Propellant',
      status: 'pass',
      message: `Thruster paired with ${metrics.propellantMassKg} kg propellant tank delivers ${metrics.spacecraftDeltaV} m/s onboard delta-v.`,
      metric: `${metrics.spacecraftDeltaV} m/s`,
    })
  }

  // Trajectory Delta-V Capability check against required mission delta-v (including safety margin)
  if (metrics.totalAvailableDeltaV < metrics.requiredMissionDeltaV) {
    items.push({
      category: 'Propulsion',
      title: 'Trajectory Delta-v Capability',
      status: 'fail',
      message: `Total available impulse (${metrics.totalAvailableDeltaV} m/s) is insufficient for ${mission?.destination || 'mission'} requirements (requires ≥ ${metrics.requiredMissionDeltaV} m/s with ${userReserveDeltaV} m/s reserve).`,
      metric: `${metrics.totalAvailableDeltaV} / ${metrics.requiredMissionDeltaV} m/s`,
    })
  } else {
    items.push({
      category: 'Propulsion',
      title: 'Trajectory Delta-v Capability',
      status: 'pass',
      message: `Combined booster and spacecraft impulse (${metrics.totalAvailableDeltaV} m/s) fulfills nominal trajectory (${mission?.minDeltaV ?? 3200} m/s) plus ${userReserveDeltaV} m/s engineer reserve margin.`,
      metric: `${metrics.totalAvailableDeltaV} / ${metrics.requiredMissionDeltaV} m/s`,
    })
  }

  // 3. LAUNCH VEHICLE READINESS
  if (!vehicle) {
    items.push({
      category: 'Launch Vehicle',
      title: 'Booster Stage Selection',
      status: 'fail',
      message: 'No launch rocket selected. Choose a flight booster stage in the Launch Bay.',
    })
  } else if (metrics.isOverMassLimit) {
    const diff = metrics.totalMassKg - vehicle.payloadCapacity
    items.push({
      category: 'Launch Vehicle',
      title: 'Payload Mass Compatibility',
      status: 'fail',
      message: `Spacecraft wet mass (${metrics.totalMassKg} kg) exceeds ${vehicle.name} payload capacity (${vehicle.payloadCapacity} kg) by ${diff} kg.`,
      metric: `${metrics.totalMassKg} / ${vehicle.payloadCapacity} kg`,
    })
  } else {
    items.push({
      category: 'Launch Vehicle',
      title: 'Payload Mass Compatibility',
      status: 'pass',
      message: `Spacecraft wet mass (${metrics.totalMassKg} kg) is verified within rocket lift limit (${vehicle.payloadCapacity} kg).`,
      metric: `${metrics.totalMassKg} / ${vehicle.payloadCapacity} kg`,
    })
  }

  // 4. POWER & ENERGY READINESS
  if (metrics.powerBalanceWatts < 0) {
    items.push({
      category: 'Power',
      title: 'Electrical Power Balance',
      status: 'fail',
      message: `Electrical deficit of ${Math.abs(metrics.powerBalanceWatts)} W. Generation fails to sustain onboard electronics.`,
      metric: `${metrics.powerBalanceWatts} W`,
    })
  } else if (metrics.powerBalanceWatts < 35) {
    items.push({
      category: 'Power',
      title: 'Electrical Power Margin',
      status: 'warning',
      message: 'Available electrical generation is close to operational consumption limits.',
      metric: `+${metrics.powerBalanceWatts} W margin`,
    })
  } else {
    items.push({
      category: 'Power',
      title: 'Electrical Power Balance',
      status: 'pass',
      message: 'Solar array power generation delivers continuous positive power surplus.',
      metric: `+${metrics.powerBalanceWatts} W`,
    })
  }

  if (!metrics.hasBatteryStorage) {
    items.push({
      category: 'Power',
      title: 'Eclipse Storage Battery',
      status: 'warning',
      message: 'No storage battery installed. Spacecraft risks losing telemetry during planetary occultation.',
    })
  } else {
    items.push({
      category: 'Power',
      title: 'Eclipse Storage Battery',
      status: 'pass',
      message: `Storage battery installed (${metrics.batteryCapacityWh} Wh) to buffer solar eclipse cycles.`,
      metric: `${metrics.batteryCapacityWh} Wh`,
    })
  }

  // 5. COMMUNICATION READINESS
  const commComp = components.find((c) => c.category === 'communication')
  if (!metrics.hasCommunicationAntenna || !commComp) {
    items.push({
      category: 'Communication',
      title: 'Ground Link & Telemetry',
      status: 'fail',
      message: 'No communication antenna installed. Ground station cannot establish telemetry or command uplinks.',
    })
  } else if (mission?.id === 'mars-pathfinder' && commComp.id === 'comm-low') {
    items.push({
      category: 'Communication',
      title: 'RF Signal Link Budget',
      status: 'fail',
      message: 'Low-gain antenna cannot traverse Mars interplanetary distances (225M km). High-gain or deep space array required.',
    })
  } else {
    items.push({
      category: 'Communication',
      title: 'Ground Link & Telemetry',
      status: 'pass',
      message: `${commComp.name} satisfies RF link margin for ${mission?.destination || 'target'}.`,
    })
  }

  // 6. SCIENTIFIC PAYLOAD READINESS
  if (!metrics.hasMandatoryInstruments) {
    items.push({
      category: 'Science Payload',
      title: 'Mandatory Scientific Instruments',
      status: 'fail',
      message: `Mission requires specialized instruments missing from payload manifest: ${metrics.missingInstruments.join(', ')}.`,
    })
  } else {
    items.push({
      category: 'Science Payload',
      title: 'Mandatory Scientific Instruments',
      status: 'pass',
      message: 'All primary scientific instruments verified and integrated.',
    })
  }

  // 7. FINANCIAL BUDGET ENVELOPE
  if (metrics.isOverBudget) {
    items.push({
      category: 'Budget',
      title: 'Mission Cost Accounting',
      status: 'fail',
      message: `Projected mission cost exceeds approved agency allocation by ${Math.abs(metrics.remainingBudgetCredits).toLocaleString()} credits.`,
      metric: `${metrics.totalCostCredits.toLocaleString()} / ${(mission?.budget ?? 0).toLocaleString()} cr`,
    })
  } else {
    items.push({
      category: 'Budget',
      title: 'Mission Cost Accounting',
      status: 'pass',
      message: 'Total mission expenditures approved within funding appropriation.',
      metric: `${metrics.remainingBudgetCredits.toLocaleString()} cr reserve`,
    })
  }

  const overallPass = items.every((i) => i.status !== 'fail')

  return {
    overallPass,
    items,
    metrics,
    totalMass: metrics.totalMassKg,
    totalCost: metrics.totalCostCredits,
    remainingBudget: metrics.remainingBudgetCredits,
    deltaV: metrics.totalAvailableDeltaV,
    powerBalance: metrics.powerBalanceWatts,
  }
}
