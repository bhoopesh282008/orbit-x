import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEarthTextures } from '@/three/utils/useEarthTextures'
import { useGraphicsProfile } from '@/hooks/useGraphicsProfile'
import {
  EARTH_CENTER,
  EARTH_RADIUS_U,
  KM,
  LOGDEPTH_FRAGMENT,
  LOGDEPTH_FRAGMENT_PARS,
  LOGDEPTH_VERTEX,
  LOGDEPTH_VERTEX_PARS,
  SUN_DIRECTION,
  launchFrame,
} from './launchFrame'

// Launch site: Kennedy Space Center LC-39A
const SITE_LAT = 28.6
const SITE_LON = -80.6

/**
 * Rotation that puts the launch site at the top of the globe (+Y) with
 * east along +X, for a three.js SphereGeometry + equirectangular texture.
 */
function siteOrientation() {
  const u = (SITE_LON + 180) / 360
  const v = (90 - SITE_LAT) / 180
  const phi = u * Math.PI * 2
  const theta = v * Math.PI
  const up = new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta))
  const east = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).normalize()
  const south = new THREE.Vector3().crossVectors(east, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(east, up, south).transpose()
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}

// ---------------------------------------------------------------------------
// Local terrain around the Cape: drawn once into a canvas and draped on a
// curved cap of the globe, so the pad sits in real coastal scenery.
// ---------------------------------------------------------------------------
const CAP_RADIUS = 7000 // scene units (56 km)

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function coastX(z: number) {
  // Atlantic shoreline ~2 km east of the pad, with Cape Canaveral's point to the south-east
  return 270 + 55 * Math.sin(z / 900) + 1700 * Math.exp(-Math.pow((z - 1900) / 1400, 2))
}

function createCapeTexture() {
  const size = 2048
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const toPx = (w: number) => (w / (CAP_RADIUS * 2) + 0.5) * size

  // 1. Land: Florida scrub with value-noise variation
  const grid = 96
  const rnd = seededRandom(42)
  const lattice = Array.from({ length: (grid + 1) * (grid + 1) }, () => rnd())
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * grid
      const gy = (y / size) * grid
      const ix = Math.floor(gx)
      const iy = Math.floor(gy)
      const fx = gx - ix
      const fy = gy - iy
      const a = lattice[iy * (grid + 1) + ix]
      const b = lattice[iy * (grid + 1) + ix + 1]
      const c = lattice[(iy + 1) * (grid + 1) + ix]
      const d = lattice[(iy + 1) * (grid + 1) + ix + 1]
      const n = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
      const grain = ((x * 7919 + y * 104729) % 97) / 97
      const t = n * 0.8 + grain * 0.2
      const i = (y * size + x) * 4
      img.data[i] = 78 + t * 40
      img.data[i + 1] = 92 + t * 34
      img.data[i + 2] = 52 + t * 18
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const fillRiver = (west: (z: number) => number, east: (z: number) => number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let z = -CAP_RADIUS; z <= CAP_RADIUS; z += 80) ctx.lineTo(toPx(west(z)), toPx(z))
    for (let z = CAP_RADIUS; z >= -CAP_RADIUS; z -= 80) ctx.lineTo(toPx(east(z)), toPx(z))
    ctx.closePath()
    ctx.fill()
  }

  // 2. Banana River and Indian River lagoons to the west
  fillRiver((z) => -2300 + 160 * Math.sin(z / 1300), (z) => -1450 + 120 * Math.sin(z / 1100 + 1), '#3d6470')
  fillRiver((z) => -4700 + 200 * Math.sin(z / 1500 + 2), (z) => -3900 + 150 * Math.sin(z / 1200), '#3a606d')

  // 3. Atlantic Ocean to the east, with a sandy beach line
  ctx.fillStyle = '#1d4a66'
  ctx.beginPath()
  for (let z = -CAP_RADIUS; z <= CAP_RADIUS; z += 60) ctx.lineTo(toPx(coastX(z)), toPx(z))
  ctx.lineTo(size, size)
  ctx.lineTo(size, 0)
  ctx.closePath()
  ctx.fill()
  const ocean = ctx.createLinearGradient(toPx(400), 0, size, 0)
  ocean.addColorStop(0, 'rgba(48,110,130,0.55)')
  ocean.addColorStop(0.15, 'rgba(25,70,100,0.2)')
  ocean.addColorStop(1, 'rgba(10,35,70,0.6)')
  ctx.fillStyle = ocean
  ctx.fill()
  ctx.strokeStyle = '#d9caa0'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let z = -CAP_RADIUS; z <= CAP_RADIUS; z += 60) ctx.lineTo(toPx(coastX(z) - 4), toPx(z))
  ctx.stroke()

  // 4. Roads: crawlerway to the vehicle assembly area and the coastal highway
  ctx.strokeStyle = '#b9b3a2'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(toPx(0), toPx(0))
  ctx.lineTo(toPx(-1400), toPx(-380))
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#8e8a80'
  ctx.beginPath()
  for (let z = -CAP_RADIUS; z <= CAP_RADIUS; z += 100) ctx.lineTo(toPx(coastX(z) - 120), toPx(z))
  ctx.stroke()
  // Assembly building area
  ctx.fillStyle = '#a7a397'
  ctx.fillRect(toPx(-1500), toPx(-460), 10, 8)

  // 5. Fade the edges so the patch blends into the global Earth texture
  const fade = ctx.createRadialGradient(size / 2, size / 2, size * 0.38, size / 2, size / 2, size / 2)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Fine, tiling scrub/grass texture for the ground right around the pad. */
function createGroundDetailTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#5a6a3c'
  ctx.fillRect(0, 0, size, size)
  const rnd = seededRandom(7)
  for (let i = 0; i < 2600; i++) {
    const shade = rnd()
    ctx.fillStyle = shade > 0.6 ? 'rgba(122,128,74,0.5)' : shade > 0.3 ? 'rgba(60,76,40,0.5)' : 'rgba(150,140,100,0.35)'
    const r = 1 + rnd() * 4
    ctx.beginPath()
    ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(36, 36)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function createRadialAlpha() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#fff')
  g.addColorStop(1, '#000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export function RealScaleEarth() {
  const gp = useGraphicsProfile()
  const seg = gp.sphereSegments
  const orientation = useMemo(() => siteOrientation(), [])
  const textures = useEarthTextures()
  const maps = textures ? { day: textures.day, spec: textures.specular, clouds: textures.photographic ? textures.clouds : undefined } : null
  const cloudsMatRef = useRef<THREE.MeshPhongMaterial>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const capMatRef = useRef<THREE.MeshStandardMaterial>(null)

  const capGeometry = useMemo(() => {
    const capAngle = CAP_RADIUS / EARTH_RADIUS_U
    const g = new THREE.SphereGeometry(EARTH_RADIUS_U, 192, 96, 0, Math.PI * 2, 0, capAngle)
    // Planar UVs (east = +u, south = -v) so the canvas map is undistorted
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / (CAP_RADIUS * 2) + 0.5, 0.5 - pos.getZ(i) / (CAP_RADIUS * 2))
    }
    uv.needsUpdate = true
    return g
  }, [])
  const capTexture = useMemo(() => createCapeTexture(), [])
  const groundTexture = useMemo(() => createGroundDetailTexture(), [])
  const groundAlpha = useMemo(() => createRadialAlpha(), [])

  const limbMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uCam: { value: new THREE.Vector3() },
          uR: { value: EARTH_RADIUS_U },
          uH: { value: 90 * KM },
          uSun: { value: SUN_DIRECTION.clone() },
          uStrength: { value: 0 },
        },
        vertexShader: /* glsl */ `
          ${LOGDEPTH_VERTEX_PARS}
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
            ${LOGDEPTH_VERTEX}
          }
        `,
        fragmentShader: /* glsl */ `
          ${LOGDEPTH_FRAGMENT_PARS}
          uniform vec3 uCam;   // camera relative to Earth centre
          uniform vec3 uSun;
          uniform float uR;
          uniform float uH;
          uniform float uStrength;
          varying vec3 vWorld;
          void main() {
            ${LOGDEPTH_FRAGMENT}
            vec3 dir = normalize(vWorld - cameraPosition);
            vec3 closest = uCam - dot(uCam, dir) * dir;
            float d = length(closest);
            float h = clamp((d - uR) / uH, 0.0, 1.0);
            float glow = pow(1.0 - h, 6.0) * step(uR * 0.9995, d);
            float lit = 0.25 + 0.75 * smoothstep(-0.25, 0.4, dot(normalize(closest), uSun));
            vec3 col = mix(vec3(0.35, 0.62, 1.0), vec3(0.75, 0.88, 1.0), pow(1.0 - h, 18.0));
            gl_FragColor = vec4(col * glow * lit * uStrength, 1.0);
          }
        `,
      }),
    []
  )

  // Aerial perspective: Rayleigh-scattered blue over the lit surface, stronger toward the limb
  const hazeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uSun: { value: SUN_DIRECTION.clone() },
          uStrength: { value: 0 },
          uCenter: { value: EARTH_CENTER.clone() },
        },
        vertexShader: /* glsl */ `
          ${LOGDEPTH_VERTEX_PARS}
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
            ${LOGDEPTH_VERTEX}
          }
        `,
        fragmentShader: /* glsl */ `
          ${LOGDEPTH_FRAGMENT_PARS}
          uniform vec3 uSun;
          uniform vec3 uCenter;
          uniform float uStrength;
          varying vec3 vWorld;
          void main() {
            ${LOGDEPTH_FRAGMENT}
            vec3 n = normalize(vWorld - uCenter);
            vec3 v = normalize(cameraPosition - vWorld);
            float mu = clamp(dot(n, v), 0.0, 1.0);
            float light = smoothstep(-0.12, 0.35, dot(n, uSun));
            float haze = (0.16 + 0.9 * pow(1.0 - mu, 3.0)) * light;
            vec3 col = vec3(0.30, 0.52, 1.0) * haze * uStrength;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  )

  useFrame(({ camera }) => {
    const alt = launchFrame.cameraAltitudeKm
    limbMaterial.uniforms.uCam.value.copy(camera.position).sub(EARTH_CENTER)
    limbMaterial.uniforms.uStrength.value = THREE.MathUtils.smoothstep(alt, 25, 90) * 1.4
    hazeMaterial.uniforms.uStrength.value = THREE.MathUtils.smoothstep(alt, 3, 25) * 0.55
    if (cloudsMatRef.current) {
      cloudsMatRef.current.opacity = THREE.MathUtils.smoothstep(alt, 7, 18) * 0.9
    }
    if (cloudsRef.current) cloudsRef.current.visible = alt > 6.5
    // The detailed Cape patch hands over to the global map as we climb
    if (capMatRef.current) {
      capMatRef.current.opacity = 1 - THREE.MathUtils.smoothstep(alt, 15, 45)
      capMatRef.current.visible = capMatRef.current.opacity > 0.01
    }
  })

  return (
    <group position={EARTH_CENTER}>
      {/* Global Earth (true radius). Slightly lowered so the local terrain always sits on top. */}
      <mesh quaternion={orientation} renderOrder={-10}>
        <sphereGeometry args={[EARTH_RADIUS_U - 4, seg, seg / 2]} />
        {maps ? (
          <meshPhongMaterial
            map={maps.day}
            specularMap={maps.spec ?? null}
            specular={new THREE.Color('#3a5470')}
            shininess={18}
          />
        ) : (
          <meshPhongMaterial color="#21456b" />
        )}
      </mesh>

      {/* Weather layer ~6 km up, visible once we climb above it */}
      {maps?.clouds && gp.clouds && (
        <mesh ref={cloudsRef} quaternion={orientation} visible={false}>
          <sphereGeometry args={[EARTH_RADIUS_U + 6 * KM, seg, seg / 2]} />
          <meshPhongMaterial
            ref={cloudsMatRef}
            map={maps.clouds}
            transparent
            depthWrite={false}
            opacity={0}
          />
        </mesh>
      )}

      {/* Cape Canaveral coastal terrain draped on the curved surface */}
      <mesh geometry={capGeometry} renderOrder={-5}>
        <meshStandardMaterial ref={capMatRef} map={capTexture} transparent roughness={0.95} metalness={0} depthWrite />
      </mesh>

      {/* Fine ground detail around the launch complex (west of the beach) */}
      <mesh position={[-300, EARTH_RADIUS_U + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1100, 1400]} />
        <meshStandardMaterial
          map={groundTexture}
          alphaMap={groundAlpha}
          transparent
          depthWrite={false}
          roughness={1}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* Blue aerial-perspective haze over the surface (visible once above ~3 km) */}
      <mesh material={hazeMaterial} renderOrder={1}>
        <sphereGeometry args={[EARTH_RADIUS_U + 2 * KM, seg, seg / 2]} />
      </mesh>

      {/* Atmospheric limb seen from altitude */}
      <mesh material={limbMaterial}>
        <sphereGeometry args={[EARTH_RADIUS_U + 90 * KM, seg / 2, seg / 4]} />
      </mesh>
    </group>
  )
}
