/**
 * ORBIT-X Ground Station Tracking Network
 * Models distributed ground telemetry tracking complexes across Earth:
 * - Goldstone (California, USA)
 * - Madrid (Robledo, Spain)
 * - Canberra (Tidbinbilla, Australia)
 * - Bengaluru (ISTRAC, India)
 * - Hartebeesthoek (South Africa)
 *
 * Tracks rotational horizon pass visibility, contact windows, signal elevation,
 * and queued scientific telemetry reception.
 */

export interface GroundStation {
  id: string
  name: string
  code: string
  latitude: number
  longitude: number
  antennaDiameterMeters: number
  frequencyBands: string[]
  status: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE'
  currentElevationAngle: number // degrees above horizon for target
  contactActive: boolean
}

export const GROUND_NETWORK: GroundStation[] = [
  {
    id: 'dsn-goldstone',
    name: 'Goldstone Deep Space Complex',
    code: 'GDS-14',
    latitude: 35.4266,
    longitude: -116.89,
    antennaDiameterMeters: 70,
    frequencyBands: ['S-Band', 'X-Band', 'Ka-Band'],
    status: 'ONLINE',
    currentElevationAngle: 42,
    contactActive: true,
  },
  {
    id: 'dsn-madrid',
    name: 'Madrid Deep Space Communications',
    code: 'MDS-63',
    latitude: 40.4314,
    longitude: -4.248,
    antennaDiameterMeters: 70,
    frequencyBands: ['S-Band', 'X-Band', 'Ka-Band'],
    status: 'ONLINE',
    currentElevationAngle: 18,
    contactActive: false,
  },
  {
    id: 'dsn-canberra',
    name: 'Canberra Deep Space Complex',
    code: 'CDS-43',
    latitude: -35.4014,
    longitude: 148.9817,
    antennaDiameterMeters: 70,
    frequencyBands: ['S-Band', 'X-Band', 'Ka-Band'],
    status: 'ONLINE',
    currentElevationAngle: 65,
    contactActive: true,
  },
  {
    id: 'istrac-bengaluru',
    name: 'ISTRAC Telemetry Station',
    code: 'BLR-32',
    latitude: 13.033,
    longitude: 77.564,
    antennaDiameterMeters: 32,
    frequencyBands: ['S-Band', 'X-Band'],
    status: 'ONLINE',
    currentElevationAngle: 31,
    contactActive: false,
  },
  {
    id: 'sansa-hartebeesthoek',
    name: 'Hartebeesthoek Earth Station',
    code: 'HBK-26',
    latitude: -25.887,
    longitude: 27.707,
    antennaDiameterMeters: 26,
    frequencyBands: ['S-Band', 'X-Band'],
    status: 'ONLINE',
    currentElevationAngle: 12,
    contactActive: false,
  },
]

/**
 * Calculates current ground contact visibility window for simulation time
 */
export function getGroundStationPass(simulationSeconds: number) {
  // Earth rotates 360 degrees in 86400 seconds (approx 15 deg/hr)
  const earthRotationAngle = ((simulationSeconds % 86400) / 86400) * 360

  return GROUND_NETWORK.map((station) => {
    // Relative geometric position with Earth spin
    const apparentLon = (station.longitude + earthRotationAngle) % 360
    const normalizedLon = apparentLon > 180 ? apparentLon - 360 : apparentLon

    // Visible above horizon if facing direction (simplified educational window)
    const elevation = Math.max(-15, Math.round(Math.cos((normalizedLon * Math.PI) / 180) * 75))
    const isVisible = elevation >= 10 && station.status === 'ONLINE'

    return {
      ...station,
      currentElevationAngle: elevation,
      contactActive: isVisible,
    }
  })
}

