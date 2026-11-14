/**
 * ORBIT-X Aerospace Engineering References & Simulation Standards
 * Documented in compliance with Part 2 of the ORBIT-X Master Development Specification.
 */

export interface AerospaceReference {
  id: string
  name: string
  sourceUrl: string
  institution: string
  keyLearnings: string[]
  applicationInOrbitX: string
  licenseOrAttribution: string
}

export const AEROSPACE_REFERENCES: AerospaceReference[] = [
  {
    id: 'artemis-sls',
    name: 'NASA Space Launch System (SLS) & Artemis II Press Kit',
    sourceUrl: 'https://www.nasa.gov/artemis-ii-press-kit/',
    institution: 'NASA',
    keyLearnings: [
      'Core stage cryogenic propellant insulation (orange spray-on polyisocyanurate foam).',
      'Solid Rocket Booster (SRB) 5-segment geometry, thrust curves, and lateral separation motors.',
      'Core stage 4x RS-25 liquid hydrogen/oxygen engine cluster with gimbal actuators.',
      'Mobile Launcher tower structure, umbilical swing arms, and cryogenic supply disconnects.',
      'Max-Q timeline (approx. T+60s to T+75s, 11-13 km altitude), SRB separation at T+130s.',
    ],
    applicationInOrbitX:
      'Guides ORBIT-X DEEP SPACE vehicle configuration, cryogenic orange core stage, launch tower umbilical swing kinematics, and SRB physical separation trajectory.',
    licenseOrAttribution: 'Public domain (U.S. Government Work)',
  },
  {
    id: 'falcon-users-guide',
    name: "SpaceX Falcon User's Guide",
    sourceUrl: 'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf',
    institution: 'SpaceX',
    keyLearnings: [
      'Octaweb engine cluster layout (1 center engine surrounded by 8 radial engines).',
      'Autonomous flight termination system and terminal countdown sequencing.',
      'Dual clamshell payload fairing pneumatic pusher separation mechanics and acoustic tile lining.',
      'Stage 1 MECO (T+150s), cold-gas nitrogen separation pushers, Stage 2 Merlin Vacuum nozzle expansion.',
    ],
    applicationInOrbitX:
      'Guides ORBIT-X LIGHT and HEAVY vehicle layouts, Octaweb engine geometry, fairing halves jettison animation, and vacuum plume bloom physics.',
    licenseOrAttribution: 'Reference specifications and open technical dimensions',
  },
  {
    id: 'nasa-mars-2020',
    name: 'NASA/JPL Mars 2020 Mission Overview & Flight Dynamics',
    sourceUrl: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/',
    institution: 'NASA / JPL',
    keyLearnings: [
      'Two-stage launch into parking orbit (185 x 185 km), followed by Trans-Mars Injection (TMI) burn.',
      'Centaur upper stage restart for hyperbolic Earth escape trajectory ($C_3 > 15\\text{ km}^2/\\text{s}^2$).',
      'Hohmann-style heliocentric elliptical transfer arc targeting Mars future orbital position.',
      'Cruise phase attitude control, telemetry handoff, and Deep Space Network communications.',
    ],
    applicationInOrbitX:
      'Guides Mars Pathfinder mission-specific continuation, TMI burn parameters, interplanetary cruise phase, and Mars arrival sequencing.',
    licenseOrAttribution: 'Public domain (U.S. Government Work)',
  },
  {
    id: 'nasa-aerodynamics-sim',
    name: 'NASA Launch, Ascent, and Vehicle Aerodynamics Simulation',
    sourceUrl: 'https://www.nasa.gov/aeronautics/artemis-sls-launch-sim/',
    institution: 'NASA Aeronautics Research Mission Directorate',
    keyLearnings: [
      'Exponential atmospheric density model with scale height H = 8.5 km.',
      'Dynamic pressure equation q = 0.5 * rho * v^2 and aerodynamic transonic drag coefficient rise near Mach 1.',
      'Gravity turn profile where pitch angle tilts progressively with velocity vector to minimize aerodynamic shear.',
      'Sound suppression water deluge flow rates reducing acoustic energy by up to 10 dB.',
    ],
    applicationInOrbitX:
      'Provides equations for physics engine: atmospheric drag, dynamic pressure calculations, Max-Q detection, and sound suppression deluge simulation.',
    licenseOrAttribution: 'Public domain (U.S. Government Work)',
  },
  {
    id: 'threejs-orbitcontrols',
    name: 'Three.js OrbitControls API Specification',
    sourceUrl: 'https://threejs.org/docs/pages/OrbitControls.html',
    institution: 'Three.js Authors',
    keyLearnings: [
      'Separation of camera transform from world physics coordinates.',
      'Smooth spherical coordinates damping for user orbit, zoom, and pan.',
      'Target tracking without overriding manual user drag inputs.',
    ],
    applicationInOrbitX:
      'Used for 360-degree interactive launch site inspection and multi-camera flight tracking system.',
    licenseOrAttribution: 'MIT License (mrdoob and Three.js authors)',
  },
]

