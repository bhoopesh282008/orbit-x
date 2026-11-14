import type { MissionEvent } from '@/stores/simulationStore'

export const DYNAMIC_MISSION_EVENTS: Record<string, MissionEvent[]> = {
  'lunar-explorer': [
    {
      id: 'event-comm-blackout-moon',
      name: 'Trans-Lunar RF Occultation (Communication Blackout)',
      description: 'The spacecraft has slipped behind the lunar limb, causing loss of direct line-of-sight telemetry to NASA Deep Space Network stations.',
      severity: 'warning',
      timestamp: 35,
      resolved: false,
      chosenOption: null,
      choices: [
        {
          id: 'opt-high-power-relay',
          label: 'Boost LGA Amplifier Gain',
          description: 'Max out transponder power (+35 W) to punch through lunar diffraction edge.',
          impact: { batteryEnergy: -15, commSuccess: 1 },
        },
        {
          id: 'opt-store-and-forward',
          label: 'Enable Store-and-Forward Autonomous Buffer',
          description: 'Store telemetry onto internal solid-state recorder until orbital acquisition of signal (AOS).',
          impact: { timeDelay: 10, commSuccess: 1 },
        },
        {
          id: 'opt-low-power-safe',
          label: 'Enter Low-Power Standby Safe Mode',
          description: 'Power down non-critical bus electronics to protect battery reserves.',
          impact: { scienceData: -5, batteryEnergy: 10 },
        },
      ],
    },
    {
      id: 'event-lunar-mascon',
      name: 'Lunar Gravitational Mascon Perturbation',
      description: 'Subsurface lunar mass concentrations are causing orbital eccentricity deviations during insertion.',
      severity: 'info',
      timestamp: 70,
      resolved: false,
      chosenOption: null,
      choices: [
        {
          id: 'opt-rcs-trim',
          label: 'Execute RCS Trim Vector Burn',
          description: 'Expend 15 kg of propellant for orbital inclination stabilization.',
          impact: { fuelRemaining: -8, health: 5 },
        },
        {
          id: 'opt-accept-drift',
          label: 'Accept Elliptical Drift Orbit',
          description: 'Conserve fuel; accept slightly higher apolune variation.',
          impact: { scienceData: 5, fuelRemaining: 0 },
        },
      ],
    },
  ],

  'earth-observer': [
    {
      id: 'event-solar-storm-earth',
      name: 'Class-M Solar Particle Energetic Event',
      description: 'Coronal mass ejection (CME) shockwave detected approaching low Earth orbit.',
      severity: 'critical',
      timestamp: 40,
      resolved: false,
      chosenOption: null,
      choices: [
        {
          id: 'opt-orient-shield',
          label: 'Orient Spacecraft Bus to Shield Avionics',
          description: 'Point heavy bus bulkheads toward the sun to protect delicate optics.',
          impact: { powerBalance: -20, health: 10 },
        },
        {
          id: 'opt-payload-shutdown',
          label: 'Cold-Shutdown Observation Sensors',
          description: 'Isolate sensitive detectors and spectrometer channels from high energy proton latchups.',
          impact: { scienceData: -10, health: 15 },
        },
        {
          id: 'opt-ride-out',
          label: 'Maintain Nominal Observation Run',
          description: 'Continue high-rate Earth scanning despite radiation noise risk.',
          impact: { scienceData: 25, health: -15 },
        },
      ],
    },
  ],

  'mars-pathfinder': [
    {
      id: 'event-mars-cruise-anomaly',
      name: 'Interplanetary Navigation Gyro Drift',
      description: 'Deep-space star tracker registers angular drift after passing through interplanetary debris trail.',
      severity: 'warning',
      timestamp: 45,
      resolved: false,
      chosenOption: null,
      choices: [
        {
          id: 'opt-recalibrate-sun',
          label: 'Recalibrate via Sun Sensor & Earth RF Beacon',
          description: 'Run celestial navigation realignment algorithm.',
          impact: { batteryEnergy: -10, health: 5 },
        },
        {
          id: 'opt-course-correction',
          label: 'Perform Mid-Course Correction Burn (TCM-2)',
          description: 'Fire thrusters to lock trajectory into Mars atmospheric capture corridor.',
          impact: { fuelRemaining: -12, health: 10 },
        },
      ],
    },
    {
      id: 'event-mars-dust-storm',
      name: 'Regional Martian Dust Storm Outbreak',
      description: 'Large atmospheric dust storm obscured targeted observation valley on Mars surface.',
      severity: 'info',
      timestamp: 85,
      resolved: false,
      chosenOption: null,
      choices: [
        {
          id: 'opt-switch-radar',
          label: 'Switch to Subsurface Sounding Radar Mode',
          description: 'Radar penetrates dust opacity, revealing sub-surface basalt layers.',
          impact: { scienceData: 30, powerBalance: -25 },
        },
        {
          id: 'opt-wait-clearing',
          label: 'Wait for Atmospheric Settlement',
          description: 'Preserve instruments and focus on orbital atmospheric limb spectra.',
          impact: { scienceData: 10, batteryEnergy: 5 },
        },
      ],
    },
  ],
}
