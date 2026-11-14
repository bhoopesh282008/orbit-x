/**
 * Science-first framing for each campaign mission: the question the mission
 * exists to answer, why it matters, real missions that tackled it, how
 * success is measured, and how much each instrument contributes.
 */

export type Relevance = 'key' | 'useful' | 'low'

export interface MissionScience {
  question: string
  whyItMatters: string
  precedents: { name: string; what: string }[]
  successCriteria: string[]
  instruments: Record<string, { relevance: Relevance; why: string }>
}

export const MISSION_SCIENCE: Record<string, MissionScience> = {
  'lunar-explorer': {
    question: 'Where is water ice hiding at the Moon’s poles — and how much is there?',
    whyItMatters:
      'Ice in permanently shadowed craters could supply drinking water, oxygen and rocket propellant for Artemis astronauts, and it preserves a record of how water reached the inner solar system.',
    precedents: [
      { name: 'LRO (2009–)', what: 'Mapped the poles in detail and measured temperatures cold enough to trap ice.' },
      { name: 'LCROSS (2009)', what: 'Crashed into Cabeus crater and detected water in the plume.' },
      { name: 'Chandrayaan-1 M3 (2008)', what: 'NASA’s spectrometer found hydroxyl and water signatures on the surface.' },
    ],
    successCriteria: [
      'Image the south-polar region at high resolution',
      'Detect the spectral signature of water ice in at least one shadowed crater',
      'Return the data to Earth within the mission budget',
    ],
    instruments: {
      'inst-camera': { relevance: 'key', why: 'Maps craters and terrain so ice detections can be located.' },
      'inst-spectrometer': { relevance: 'key', why: 'Identifies water ice by its infrared absorption fingerprint.' },
      'inst-radar': { relevance: 'useful', why: 'Penetrates the surface to look for buried ice deposits.' },
      'inst-radiation': { relevance: 'useful', why: 'Measures the radiation environment future crews would face.' },
      'inst-magnetometer': { relevance: 'low', why: 'The Moon has only weak, patchy crustal magnetism.' },
    },
  },
  'earth-observer': {
    question: 'How quickly are coastlines, forests and ice changing — and what is driving it?',
    whyItMatters:
      'Satellite records reveal sea-level rise, deforestation, crop health and algal blooms on a global scale that no ground survey can match. They inform disaster response and climate policy.',
    precedents: [
      { name: 'Landsat (1972–)', what: 'The longest continuous record of Earth’s land surface from space.' },
      { name: 'PACE (2024–)', what: 'Measures ocean colour and aerosols to track plankton and air quality.' },
      { name: 'ICESat-2 (2018–)', what: 'Laser altimetry measuring ice-sheet and sea-ice thickness.' },
    ],
    successCriteria: [
      'Image the full target region repeatedly from a sun-synchronous orbit',
      'Measure surface composition (vegetation, water, ice) with a spectrometer',
      'Downlink at least one complete global coverage cycle',
    ],
    instruments: {
      'inst-camera': { relevance: 'key', why: 'High-resolution imagery shows change over time.' },
      'inst-spectrometer': { relevance: 'key', why: 'Distinguishes vegetation, water, soil and ice by their spectra.' },
      'inst-radar': { relevance: 'useful', why: 'Sees through clouds and at night (synthetic aperture radar).' },
      'inst-radiation': { relevance: 'low', why: 'Low Earth orbit is well characterised; little new science.' },
      'inst-magnetometer': { relevance: 'useful', why: 'Tracks changes in Earth’s magnetic field.' },
    },
  },
  'mars-pathfinder': {
    question: 'Did liquid water once flow on Mars long enough for life to begin?',
    whyItMatters:
      'Mars was warmer and wetter billions of years ago. Finding where water persisted — clays, salts, ancient lake beds — tells us where to look for signs of past life and where future explorers could find resources.',
    precedents: [
      { name: 'Mars Reconnaissance Orbiter (2006–)', what: 'HiRISE imaging and CRISM spectroscopy mapped clay and salt deposits.' },
      { name: 'Perseverance (2021–)', what: 'Exploring Jezero, an ancient river delta, and caching samples.' },
      { name: 'SHARAD radar (2006–)', what: 'Found buried ice sheets beneath the Martian surface.' },
    ],
    successCriteria: [
      'Map hydrated minerals (clays, sulphates) from orbit',
      'Image candidate ancient lake beds at high resolution',
      'Return data across the 3–22 minute light-time link',
    ],
    instruments: {
      'inst-spectrometer': { relevance: 'key', why: 'Detects clays and salts that only form in water.' },
      'inst-camera': { relevance: 'key', why: 'Reveals river channels, deltas and layered sediments.' },
      'inst-radar': { relevance: 'key', why: 'Finds subsurface ice and buried water-laid layers.' },
      'inst-radiation': { relevance: 'useful', why: 'Characterises the hazard to future human crews.' },
      'inst-magnetometer': { relevance: 'useful', why: 'Maps ancient crustal magnetism from Mars’s lost global field.' },
    },
  },
}

export const RELEVANCE_LABEL: Record<Relevance, string> = {
  key: 'Key instrument',
  useful: 'Useful',
  low: 'Low science value',
}
