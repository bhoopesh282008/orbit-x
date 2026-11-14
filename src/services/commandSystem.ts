/**
 * ORBIT-X Command & Control System
 * Manages deterministic command allowlist, preconditions verification,
 * priority command queue, execution acknowledgement, and telemetry effects.
 */

export type CommandId = 
  | 'CMD_POWER_SOLAR_ON'
  | 'CMD_POWER_SOLAR_OFF'
  | 'CMD_SAFE_MODE_ENTER'
  | 'CMD_SAFE_MODE_EXIT'
  | 'CMD_INSTRUMENT_CAMERA_ACTIVATE'
  | 'CMD_INSTRUMENT_CAMERA_DEACTIVATE'
  | 'CMD_DATA_DOWNLINK_START'
  | 'CMD_DATA_DOWNLINK_STOP'
  | 'CMD_ATTITUDE_POINT_EARTH'
  | 'CMD_ATTITUDE_POINT_SUN'
  | 'CMD_ATTITUDE_POINT_TARGET'
  | 'CMD_THERMAL_HEATER_OVERRIDE'
  | 'CMD_EXECUTE_ORBITAL_TRIM_BURN'

export interface FlightCommandDefinition {
  id: CommandId
  name: string
  subsystem: 'POWER' | 'GNC' | 'COMM' | 'THERMAL' | 'SCIENCE' | 'PROPULSION' | 'SAFETY'
  description: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  preconditions: string[]
}

export const COMMAND_ALLOWLIST: Record<CommandId, FlightCommandDefinition> = {
  CMD_POWER_SOLAR_ON: {
    id: 'CMD_POWER_SOLAR_ON',
    name: 'PWR: SOLAR ARRAYS DEPLOY & TRACK',
    subsystem: 'POWER',
    description: 'Commands solar array drive mechanisms to track current solar incidence vector.',
    priority: 'HIGH',
    preconditions: ['Spacecraft outside atmospheric envelope', 'Power bus nominal'],
  },
  CMD_POWER_SOLAR_OFF: {
    id: 'CMD_POWER_SOLAR_OFF',
    name: 'PWR: ARRAYS RETRACT / STOW',
    subsystem: 'POWER',
    description: 'Stows arrays or locks gimbals edge-on to solar vector.',
    priority: 'NORMAL',
    preconditions: ['Sufficient battery reserves (>50%)'],
  },
  CMD_SAFE_MODE_ENTER: {
    id: 'CMD_SAFE_MODE_ENTER',
    name: 'SYS: ENTER SPACECRAFT SAFE MODE',
    subsystem: 'SAFETY',
    description: 'Sheds non-essential instrument loads, locks attitude sun-pointing, opens low-gain comms.',
    priority: 'CRITICAL',
    preconditions: ['None (Operator Emergency Override)'],
  },
  CMD_SAFE_MODE_EXIT: {
    id: 'CMD_SAFE_MODE_EXIT',
    name: 'SYS: RECOVER FROM SAFE MODE',
    subsystem: 'SAFETY',
    description: 'Resumes normal avionics operational state after confirming sub-system telemetry integrity.',
    priority: 'HIGH',
    preconditions: ['Spacecraft health > 60%', 'Battery charge > 45%', 'Thermal state nominal'],
  },
  CMD_INSTRUMENT_CAMERA_ACTIVATE: {
    id: 'CMD_INSTRUMENT_CAMERA_ACTIVATE',
    name: 'SCI: OPTICAL SENSOR EXPOSURE ON',
    subsystem: 'SCIENCE',
    description: 'Powers focal plane array cameras for scientific target mapping.',
    priority: 'NORMAL',
    preconditions: ['Power balance positive', 'Storage capacity available (>50 MB)', 'Pointing error < 0.5°'],
  },
  CMD_INSTRUMENT_CAMERA_DEACTIVATE: {
    id: 'CMD_INSTRUMENT_CAMERA_DEACTIVATE',
    name: 'SCI: OPTICAL SENSOR STANDBY',
    subsystem: 'SCIENCE',
    description: 'Closes optical aperture shutter and puts sensor in standby.',
    priority: 'LOW',
    preconditions: ['None'],
  },
  CMD_DATA_DOWNLINK_START: {
    id: 'CMD_DATA_DOWNLINK_START',
    name: 'COM: DSN TELEMETRY DOWNLINK INITIATE',
    subsystem: 'COMM',
    description: 'Transmits queued scientific observation packets to ground station network.',
    priority: 'NORMAL',
    preconditions: ['Ground station lock confirmed', 'Link margin > 1.5 dB', 'Battery > 30%'],
  },
  CMD_DATA_DOWNLINK_STOP: {
    id: 'CMD_DATA_DOWNLINK_STOP',
    name: 'COM: HALT DATA TRANSMISSION',
    subsystem: 'COMM',
    description: 'Halts high-power transmitter RF amplifier.',
    priority: 'LOW',
    preconditions: ['None'],
  },
  CMD_ATTITUDE_POINT_EARTH: {
    id: 'CMD_ATTITUDE_POINT_EARTH',
    name: 'GNC: SLEW ATTITUDE TO EARTH-POINTING',
    subsystem: 'GNC',
    description: 'Orients high-gain antenna bore-sight toward Earth coordinates for downlink.',
    priority: 'HIGH',
    preconditions: ['Reaction wheels spin rate within limits', 'Star tracker tracking locked'],
  },
  CMD_ATTITUDE_POINT_SUN: {
    id: 'CMD_ATTITUDE_POINT_SUN',
    name: 'GNC: SLEW ATTITUDE TO SUN-POINTING',
    subsystem: 'GNC',
    description: 'Orients solar array normal vector to maximize photovoltaic charging.',
    priority: 'HIGH',
    preconditions: ['Star tracker or sun sensor valid'],
  },
  CMD_ATTITUDE_POINT_TARGET: {
    id: 'CMD_ATTITUDE_POINT_TARGET',
    name: 'GNC: TRACK CELESTIAL TARGET BODY',
    subsystem: 'GNC',
    description: 'Points scientific instruments toward surface observation nadir.',
    priority: 'NORMAL',
    preconditions: ['Orbit ephemeris solution locked'],
  },
  CMD_THERMAL_HEATER_OVERRIDE: {
    id: 'CMD_THERMAL_HEATER_OVERRIDE',
    name: 'THM: TOGGLE SURVIVAL HEATERS',
    subsystem: 'THERMAL',
    description: 'Manually toggles propellant and avionics electrical heater coils.',
    priority: 'HIGH',
    preconditions: ['Battery charge > 20%'],
  },
  CMD_EXECUTE_ORBITAL_TRIM_BURN: {
    id: 'CMD_EXECUTE_ORBITAL_TRIM_BURN',
    name: 'PRP: EXECUTE ORBITAL DELTA-V BURN',
    subsystem: 'PROPULSION',
    description: 'Fires reaction control / main thruster for planned velocity correction vector.',
    priority: 'CRITICAL',
    preconditions: ['GNC burn attitude locked', 'Fuel remaining > 5%', 'Propulsion health nominal'],
  },
}

export interface QueuedCommand {
  queueId: string
  commandId: CommandId
  timestamp: number
  status: 'QUEUED' | 'TRANSMITTING' | 'EXECUTING' | 'ACKNOWLEDGED' | 'REJECTED'
  responseMessage?: string
}

