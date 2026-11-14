import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  LOGDEPTH_FRAGMENT,
  LOGDEPTH_FRAGMENT_PARS,
  LOGDEPTH_VERTEX,
  LOGDEPTH_VERTEX_PARS,
  launchFrame,
} from './launchFrame'
import { ParticleCloud } from './ParticleCloud'
import { useLaunchSimulationStore } from '@/stores/launchSimulationStore'
import { useGraphicsProfile } from '@/hooks/useGraphicsProfile'

/**
 * Shader for one plume layer: a flared open cone drawn additively.
 * Brightness falls off along the length and towards the silhouette edges,
 * with animated turbulence and optional shock diamonds (sea level only).
 */
function createPlumeMaterial(core: THREE.Color, edge: THREE.Color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uCore: { value: core },
      uEdge: { value: edge },
      uDiamonds: { value: 1 },
      uFalloff: { value: 1.6 },
    },
    vertexShader: /* glsl */ `
      ${LOGDEPTH_VERTEX_PARS}
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
        ${LOGDEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${LOGDEPTH_FRAGMENT_PARS}
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uCore;
      uniform vec3 uEdge;
      uniform float uDiamonds;
      uniform float uFalloff;
      varying vec2 vUv;
      varying float vFacing;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }

      void main() {
        ${LOGDEPTH_FRAGMENT}
        float t = 1.0 - vUv.y; // 0 at the nozzle, 1 at the tail
        float along = pow(1.0 - t, uFalloff);
        float body = pow(vFacing, 1.4);
        float turb = 0.75 + 0.5 * noise(vec2(vUv.x * 12.0, t * 10.0 - uTime * 18.0));
        float diamonds = 1.0 + uDiamonds * 0.6 * pow(max(0.0, sin(t * 40.0)), 6.0) * (1.0 - t);
        vec3 col = mix(uCore, uEdge, smoothstep(0.0, 0.7, t));
        float a = along * body * turb * diamonds * uIntensity;
        gl_FragColor = vec4(col * a, a);
      }
    `,
  })
}

interface PlumeProps {
  /** Y of the nozzle exit in the rocket's local frame */
  nozzleY: number
  nozzleRadius: number
  kind: 'booster' | 'vacuum'
  active: boolean
}

/** Engine exhaust plume attached to the vehicle. Expands with altitude as ambient pressure drops. */
export function ExhaustPlume({ nozzleY, nozzleRadius, kind, active }: PlumeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const flameRef = useRef<THREE.Mesh>(null)
  const plumeRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const coreMat = useMemo(
    () =>
      kind === 'booster'
        ? createPlumeMaterial(new THREE.Color(3.2, 2.9, 2.4), new THREE.Color(2.4, 1.1, 0.35))
        : createPlumeMaterial(new THREE.Color(2.6, 2.3, 2.1), new THREE.Color(1.1, 0.6, 0.4)),
    [kind]
  )
  const flameMat = useMemo(
    () =>
      kind === 'booster'
        ? createPlumeMaterial(new THREE.Color(2.2, 1.2, 0.4), new THREE.Color(1.0, 0.35, 0.08))
        : createPlumeMaterial(new THREE.Color(1.4, 1.0, 0.7), new THREE.Color(0.5, 0.35, 0.4)),
    [kind]
  )
  // Wide, faint high-altitude plume ("jellyfish") lit by the Sun
  const plumeMat = useMemo(
    () => createPlumeMaterial(new THREE.Color(0.7, 0.62, 0.55), new THREE.Color(0.25, 0.3, 0.45)),
    []
  )
  useEffect(
    () => () => {
      coreMat.dispose()
      flameMat.dispose()
      plumeMat.dispose()
    },
    [coreMat, flameMat, plumeMat]
  )

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const firing = kind === 'booster' ? launchFrame.stage1Firing : launchFrame.stage2Firing
    const level = kind === 'vacuum' || launchFrame.liftedOff ? 1 : launchFrame.ignitionLevel
    const on = active && firing && level > 0.01
    groupRef.current.visible = on
    if (lightRef.current) lightRef.current.intensity = on && kind === 'booster' ? 2600 * level * (0.85 + Math.random() * 0.3) : 0
    if (!on) return

    const alt = launchFrame.rocketAltitudeKm
    const time = clock.elapsedTime
    // Ambient pressure ~ e^(-h/H): the plume flares out as it climbs
    const vacuum = 1 - Math.exp(-alt / 9)
    const flicker = 0.92 + Math.random() * 0.16

    for (const m of [coreMat, flameMat, plumeMat]) m.uniforms.uTime.value = time
    coreMat.uniforms.uDiamonds.value = kind === 'booster' ? 1 - vacuum : 0
    coreMat.uniforms.uIntensity.value = level * flicker
    flameMat.uniforms.uIntensity.value = level * flicker * (kind === 'booster' ? 0.9 : 0.7)

    if (kind === 'booster') {
      const len = (5 + vacuum * 9) * level
      coreRef.current!.scale.set(1 + vacuum * 0.6, len * 0.55, 1 + vacuum * 0.6)
      flameRef.current!.scale.set(1.2 + vacuum * 5, len, 1.2 + vacuum * 5)
      const wide = THREE.MathUtils.smoothstep(alt, 18, 70)
      plumeRef.current!.visible = wide > 0.01
      plumeRef.current!.scale.set(4 + wide * 70, 10 + wide * 60, 4 + wide * 70)
      plumeMat.uniforms.uIntensity.value = wide * 0.22
    } else {
      coreRef.current!.scale.set(1, 3.2, 1)
      flameRef.current!.scale.set(5, 12, 5)
      plumeRef.current!.visible = true
      plumeRef.current!.scale.set(26, 40, 26)
      plumeMat.uniforms.uIntensity.value = 0.18
    }
  })

  // Unit cone: radius 1 at the tail, nozzle-sized at the top, extending 1 unit down
  const coneGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.42, 1, 1, 40, 12, true)
    g.translate(0, -0.5, 0)
    return g
  }, [])

  return (
    <group ref={groupRef} position={[0, nozzleY, 0]} scale={[nozzleRadius, 1, nozzleRadius]} visible={false}>
      <mesh ref={coreRef} geometry={coneGeo} material={coreMat} renderOrder={5} />
      <mesh ref={flameRef} geometry={coneGeo} material={flameMat} renderOrder={6} />
      <mesh ref={plumeRef} geometry={coneGeo} material={plumeMat} renderOrder={7} />
      <pointLight ref={lightRef} position={[0, -2.5, 0]} color="#ffae5c" intensity={0} distance={260} decay={1.4} />
    </group>
  )
}

/**
 * Persistent smoke trail left in the sky by the first stage while it is still
 * in the dense lower atmosphere. Particles are emitted in world space at the
 * nozzle and stay where they were left, drifting with the wind.
 */
export function SmokeTrail({ nozzleOffset }: { nozzleOffset: number }) {
  const trailCount = useGraphicsProfile().trailParticles
  const cloud = useMemo(() => {
    const c = new ParticleCloud(trailCount)
    c.drag = 0.9
    c.buoyancy = 0.05
    return c
  }, [trailCount])
  useEffect(() => () => cloud.dispose(), [cloud])
  const lastEmit = useRef(new THREE.Vector3())
  const hasLast = useRef(false)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const vel = useMemo(() => new THREE.Vector3(), [])
  const wind = useMemo(() => new THREE.Vector3(-2.5, 0, 1.2), [])
  const isStandby = useLaunchSimulationStore((s) => s.phase === 'STANDBY')

  useEffect(() => {
    if (isStandby) {
      cloud.reset()
      hasLast.current = false
    }
  }, [isStandby, cloud])

  useFrame((_, delta) => {
    const { simSpeed, isPaused } = useLaunchSimulationStore.getState()
    const dt = isPaused ? 0 : Math.min(delta, 0.1) * simSpeed
    const alt = launchFrame.rocketAltitudeKm
    const emitting = launchFrame.stage1Firing && launchFrame.liftedOff && alt < 45

    if (emitting && dt > 0) {
      // Nozzle position in world space
      tmp.copy(launchFrame.rocketUp).multiplyScalar(nozzleOffset).add(launchFrame.rocketPosition)
      if (!hasLast.current) {
        lastEmit.current.copy(tmp)
        hasLast.current = true
      }
      // Trail gets wider and sparser as the air thins
      const thin = Math.exp(-alt / 12)
      const spacing = 1.2 + alt * 0.9
      const dist = tmp.distanceTo(lastEmit.current)
      const steps = Math.min(40, Math.floor(dist / spacing))
      for (let i = 1; i <= steps; i++) {
        const p = lastEmit.current.clone().lerp(tmp, i / steps)
        vel.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3).add(wind)
        cloud.spawn({
          position: p,
          velocity: vel,
          life: 50 + Math.random() * 40,
          size0: 2 + alt * 0.4,
          size1: (8 + alt * 3.2) * (1 + Math.random() * 0.6),
          alpha: 0.12 + 0.5 * thin,
          shade: 0.92,
        })
      }
      if (steps > 0) lastEmit.current.copy(tmp)
    } else {
      hasLast.current = false
    }
    cloud.update(dt)
  })

  return <primitive object={cloud.mesh} />
}
