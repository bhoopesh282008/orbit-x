import * as THREE from 'three'

/**
 * World scale for the launch scene: 1 scene unit = 8 metres.
 * The Earth is rendered at true size (logarithmic depth buffer), so the
 * horizon, curvature and the shrinking ground all happen naturally as the
 * vehicle climbs.
 */
export const METERS_PER_UNIT = 8
export const KM = 1000 / METERS_PER_UNIT // scene units per kilometre
export const EARTH_RADIUS_U = 6371 * KM
/** Earth's centre sits directly beneath the pad (pad at the world origin). */
export const EARTH_CENTER = new THREE.Vector3(0, -EARTH_RADIUS_U, 0)
/** Launch azimuth: downrange (east, out over the Atlantic) is +X. */
export const DOWNRANGE_AXIS = new THREE.Vector3(1, 0, 0)
/** Height of the launch mount deck the vehicle stands on. */
export const PAD_DECK_HEIGHT = 2.0

/** Morning launch: Sun low in the east-southeast. */
export const SUN_DIRECTION = new THREE.Vector3(0.78, 0.42, 0.46).normalize()

/**
 * Per-frame shared flight state, written once per frame by the scene and read
 * by the sky, plume, camera and smoke systems without React re-renders.
 */
export const launchFrame = {
  rocketPosition: new THREE.Vector3(0, PAD_DECK_HEIGHT, 0),
  rocketQuaternion: new THREE.Quaternion(),
  rocketUp: new THREE.Vector3(0, 1, 0), // body axis (nose direction)
  localUp: new THREE.Vector3(0, 1, 0), // radial "up" beneath the rocket
  rocketAltitudeKm: 0,
  cameraAltitudeKm: 0,
  cameraUp: new THREE.Vector3(0, 1, 0),
  stage1Firing: false,
  stage2Firing: false,
  ignitionLevel: 0, // 0..1 engine spool-up on the pad
  liftedOff: false,
  flightTime: 0,
}

/** World position of a point at given downrange (km) and altitude (km). */
export function surfacePoint(downrangeKm: number, altitudeKm: number, out = new THREE.Vector3()) {
  const theta = downrangeKm / 6371
  const r = EARTH_RADIUS_U + PAD_DECK_HEIGHT + altitudeKm * KM
  out.set(Math.sin(theta) * r, Math.cos(theta) * r, 0).add(EARTH_CENTER)
  return out
}

/** Approximate total height (scene units) of each vehicle model. */
export function vehicleHeight(vehicleId: string) {
  const coreHeight = vehicleId === 'orbit-x-light' ? 4.2 : vehicleId === 'orbit-x-heavy' ? 5.4 : 6.8
  const fairingHeight = vehicleId === 'orbit-x-light' ? 1.6 : vehicleId === 'orbit-x-heavy' ? 2.2 : 2.8
  return { coreHeight, top: coreHeight * 0.7 + 2.75 + fairingHeight / 2, bottom: -0.65 }
}

/** Shared GLSL snippets so custom shaders cooperate with the log depth buffer. */
export const LOGDEPTH_VERTEX_PARS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
`
export const LOGDEPTH_VERTEX = /* glsl */ `
#include <logdepthbuf_vertex>
`
export const LOGDEPTH_FRAGMENT_PARS = /* glsl */ `
#include <logdepthbuf_pars_fragment>
`
export const LOGDEPTH_FRAGMENT = /* glsl */ `
#include <logdepthbuf_fragment>
`

/** Soft round puff texture used for smoke, steam and plume glow sprites. */
let puffTexture: THREE.CanvasTexture | null = null
export function getPuffTexture() {
  if (puffTexture) return puffTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  // A few overlapping soft blobs give a lumpy, cloud-like silhouette
  const blobs = [
    [0.5, 0.5, 0.42, 1],
    [0.38, 0.42, 0.26, 0.55],
    [0.62, 0.44, 0.24, 0.5],
    [0.5, 0.62, 0.26, 0.5],
  ]
  for (const [x, y, r, a] of blobs) {
    const g = ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  puffTexture = new THREE.CanvasTexture(canvas)
  puffTexture.colorSpace = THREE.SRGBColorSpace
  return puffTexture
}
