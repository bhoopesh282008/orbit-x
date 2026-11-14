/**
 * Geometry of the splash Earth (ported from the TAN splash).
 *
 * The live globe is drawn by a shader from NASA's Blue Marble map (earth-map.webp) as an
 * orthographic sphere centred on LATITUDE0 / LONGITUDE0, lit from the upper left. For ORBIT-X
 * it faces the Americas so the Cape Canaveral launch site is in view. Any place on the visible
 * side can then be marked with plain trigonometry.
 */

export const splashAsset = (path: string) => `${import.meta.env.BASE_URL}splash/${path.replace(/^\//, '')}`

export interface EarthView {
  latitude0: number
  longitude0: number
  /** Fraction of the canvas width the planet's disc fills */
  disc: number
}

export const EARTH: EarthView & { map: string; still: string } = {
  map: splashAsset('earth-map.webp'),
  // Fallback picture for browsers without WebGL (centred elsewhere; shown alone, it needs no marks)
  still: splashAsset('earth.webp'),
  // Over the Atlantic: the Cape sits up and left of centre, facing the launch azimuth (east)
  latitude0: 0,
  longitude0: -58,
  disc: 0.94,
}

/** Kennedy Space Center, Launch Complex 39A */
export const LAUNCH_SITE = { latitude: 28.608, longitude: -80.604, name: 'LC-39A · Cape Canaveral' }

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Where a place falls on the disc (0–1 of the canvas, top-left origin), and whether it faces us. */
export function locate(latitude: number, longitude: number, view: EarthView = EARTH) {
  const phi = radians(latitude)
  const phi0 = radians(view.latitude0)
  const dLambda = radians(longitude - view.longitude0)
  const facing = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda)
  const x = Math.cos(phi) * Math.sin(dLambda)
  const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda)
  return { x: 0.5 + 0.5 * view.disc * x, y: 0.5 - 0.5 * view.disc * y, visible: facing > 0.12 }
}

let webgl: boolean | undefined
export function hasWebGL() {
  if (webgl === undefined) {
    try {
      const c = document.createElement('canvas')
      webgl = typeof WebGLRenderingContext !== 'undefined' && !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      webgl = false
    }
  }
  return webgl
}
