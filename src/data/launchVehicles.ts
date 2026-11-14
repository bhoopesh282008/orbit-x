import type { LaunchVehicle } from '@/stores/spacecraftStore'

export const LAUNCH_VEHICLES: LaunchVehicle[] = [
  {
    id: 'orbit-x-light',
    name: 'ORBIT-X LIGHT (Falcon Mini / Vega Class)',
    payloadCapacity: 1500, // kg to LEO / Target
    cost: 32000,
    reliability: 0.98,
    maxDeltaV: 2800,
    destinations: ['Earth Orbit', 'LEO', 'SSO'],
    description: 'Cost-effective, highly reliable two-stage light launch vehicle optimized for low Earth orbit satellites and compact cubesat constellations.',
  },
  {
    id: 'orbit-x-heavy',
    name: 'ORBIT-X HEAVY (Vulcan / Falcon Heavy Class)',
    payloadCapacity: 3500, // kg
    cost: 58000,
    reliability: 0.95,
    maxDeltaV: 4200,
    destinations: ['Earth Orbit', 'Moon', 'Lunar Orbit', 'Lagrange L1/L2'],
    description: 'Workhorse medium-to-heavy booster equipped with cryogenic upper stage for trans-lunar injection and high-energy orbital deployment.',
  },
  {
    id: 'orbit-x-deep-space',
    name: 'ORBIT-X DEEP SPACE (SLS / Super Heavy Class)',
    payloadCapacity: 8000, // kg
    cost: 110000,
    reliability: 0.93,
    maxDeltaV: 7500,
    destinations: ['Moon', 'Mars', 'Interplanetary', 'Deep Space'],
    description: 'Super-heavy exploration class rocket engineered for high-energy interplanetary trajectories and massive multi-instrument deep space probes.',
  },
]
