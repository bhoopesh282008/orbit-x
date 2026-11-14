import { useGameStore } from '@/stores/gameStore'

export type GraphicsQuality = 'low' | 'medium' | 'high'

export interface GraphicsProfile {
  quality: GraphicsQuality
  /** Device pixel ratio range for the WebGL canvas */
  dpr: [number, number]
  antialias: boolean
  /** Segments for real-scale planet spheres */
  sphereSegments: number
  clouds: boolean
  stars: number
  steamParticles: number
  trailParticles: number
  envResolution: number
}

const PROFILES: Record<GraphicsQuality, Omit<GraphicsProfile, 'quality'>> = {
  low: { dpr: [0.75, 1], antialias: false, sphereSegments: 160, clouds: false, stars: 1500, steamParticles: 140, trailParticles: 450, envResolution: 16 },
  medium: { dpr: [1, 1.5], antialias: true, sphereSegments: 320, clouds: true, stars: 3000, steamParticles: 260, trailParticles: 900, envResolution: 32 },
  high: { dpr: [1, 2], antialias: true, sphereSegments: 512, clouds: true, stars: 4500, steamParticles: 420, trailParticles: 1400, envResolution: 64 },
}

/** `?lite` in the URL forces low quality (handy on school laptops and projectors). */
function urlForcesLite() {
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.has('lite')) {
      sessionStorage.setItem('orbit-x-lite', '1')
      return true
    }
    return sessionStorage.getItem('orbit-x-lite') === '1'
  } catch {
    return false
  }
}

/** Rough capability check so weak machines start in low-power mode. */
export function detectDefaultQuality(): GraphicsQuality {
  if (typeof navigator === 'undefined') return 'high'
  const cores = navigator.hardwareConcurrency ?? 8
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  if (mobile || cores <= 4 || memory <= 4) return 'low'
  if (cores <= 6) return 'medium'
  return 'high'
}

export function getGraphicsProfile(quality: GraphicsQuality): GraphicsProfile {
  const q = urlForcesLite() ? 'low' : quality
  return { quality: q, ...PROFILES[q] }
}

export function useGraphicsProfile(): GraphicsProfile {
  const quality = useGameStore((s) => s.settings.graphicsQuality)
  return getGraphicsProfile(quality)
}
