import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLaunchSimulationStore } from '@/stores/launchSimulationStore'
import {
  LOGDEPTH_FRAGMENT,
  LOGDEPTH_FRAGMENT_PARS,
  LOGDEPTH_VERTEX,
  LOGDEPTH_VERTEX_PARS,
  launchFrame,
} from './launchFrame'
import { ParticleCloud } from './ParticleCloud'

const DEBRIS_COUNT = 28

/**
 * Loss-of-vehicle effects: fireball, smoke and tumbling debris at the point of
 * breakup. Runs on real time (not time warp) so the moment is always visible.
 */
export function VehicleBreakup() {
  const vehicleLost = useLaunchSimulationStore((s) => s.telemetry.vehicleLost)
  const fire = useMemo(() => {
    const c = new ParticleCloud(260)
    c.drag = 1.2
    c.buoyancy = 2
    return c
  }, [])
  useEffect(() => () => fire.dispose(), [fire])

  const debrisRef = useRef<THREE.InstancedMesh>(null)
  const debris = useMemo(
    () =>
      Array.from({ length: DEBRIS_COUNT }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        spin: new THREE.Vector3(),
        scale: 0.15 + Math.random() * 0.6,
      })),
    []
  )
  const lightRef = useRef<THREE.PointLight>(null)
  const age = useRef(1e9)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!vehicleLost) {
      age.current = 1e9
      fire.reset()
      return
    }
    // Detonate at the vehicle's last position
    age.current = 0
    const origin = launchFrame.rocketPosition.clone().addScaledVector(launchFrame.rocketUp, 3)
    const thin = Math.exp(-launchFrame.rocketAltitudeKm / 10) // thinner air → less smoke
    const v = new THREE.Vector3()
    for (let i = 0; i < 90; i++) {
      v.randomDirection().multiplyScalar(6 + Math.random() * 22)
      fire.spawn({ position: origin, velocity: v, life: 1.6 + Math.random() * 2.2, size0: 3, size1: 18 + Math.random() * 18, alpha: 0.75, shade: 1, warm: 0.95 })
    }
    for (let i = 0; i < 110 * Math.max(0.2, thin); i++) {
      v.randomDirection().multiplyScalar(3 + Math.random() * 12)
      fire.spawn({ position: origin, velocity: v, life: 18 + Math.random() * 24, size0: 6, size1: 40 + Math.random() * 40, alpha: 0.55 * Math.max(0.3, thin), shade: 0.35, warm: 0.15 })
    }
    for (const d of debris) {
      d.pos.copy(origin)
      d.vel.randomDirection().multiplyScalar(4 + Math.random() * 16)
      d.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      d.spin.set(Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2)
    }
  }, [vehicleLost, fire, debris])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1)
    age.current += dt
    fire.update(dt)
    const active = age.current < 60
    if (lightRef.current) {
      lightRef.current.intensity = age.current < 2.5 ? 9000 * Math.pow(1 - age.current / 2.5, 2) : 0
      lightRef.current.position.copy(launchFrame.rocketPosition).addScaledVector(launchFrame.rocketUp, 3)
    }
    const mesh = debrisRef.current
    if (!mesh) return
    mesh.visible = active
    if (!active) return
    const down = launchFrame.localUp
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i]
      d.vel.addScaledVector(down, -9.81 / 8 * dt) // gravity in scene units (8 m/unit)
      d.pos.addScaledVector(d.vel, dt)
      d.rot.x += d.spin.x * dt
      d.rot.y += d.spin.y * dt
      d.rot.z += d.spin.z * dt
      dummy.position.copy(d.pos)
      dummy.rotation.copy(d.rot)
      dummy.scale.setScalar(d.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive object={fire.mesh} />
      <instancedMesh ref={debrisRef} args={[undefined, undefined, DEBRIS_COUNT]} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 0.3, 0.6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.4} />
      </instancedMesh>
      <pointLight ref={lightRef} color="#ffb060" intensity={0} distance={800} decay={1.2} />
    </>
  )
}

/** Plasma sheath around a vehicle falling back into the atmosphere. */
export function ReentryGlow({ top }: { top: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          ${LOGDEPTH_VERTEX_PARS}
          varying vec2 vUv;
          varying float vFacing;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
            ${LOGDEPTH_VERTEX}
          }
        `,
        fragmentShader: /* glsl */ `
          ${LOGDEPTH_FRAGMENT_PARS}
          uniform float uIntensity;
          uniform float uTime;
          varying vec2 vUv;
          varying float vFacing;
          void main() {
            ${LOGDEPTH_FRAGMENT}
            float t = 1.0 - vUv.y; // 0 at the leading edge, 1 at the tail
            float flicker = 0.85 + 0.15 * sin(uTime * 40.0 + t * 30.0);
            vec3 col = mix(vec3(3.0, 2.2, 1.6), vec3(1.6, 0.35, 0.55), smoothstep(0.0, 0.6, t));
            float a = pow(1.0 - t, 1.5) * pow(vFacing, 1.2) * uIntensity * flicker;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      }),
    []
  )
  useEffect(() => () => material.dispose(), [material])
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.9, 2.6, 1, 32, 8, true)
    g.translate(0, -0.5, 0)
    return g
  }, [])

  useFrame(({ clock }) => {
    const { phase, telemetry } = useLaunchSimulationStore.getState()
    const alt = telemetry.altitude
    const strength = phase === 'REENTRY' ? THREE.MathUtils.smoothstep(120 - alt, 0, 50) : 0
    material.uniforms.uIntensity.value = strength
    material.uniforms.uTime.value = clock.elapsedTime
    if (meshRef.current) meshRef.current.visible = strength > 0.01
  })

  // Starts just ahead of the nose and trails well past the tail
  return <mesh ref={meshRef} geometry={geometry} material={material} position={[0, top + 0.6, 0]} scale={[1, top * 3.2, 1]} visible={false} />
}
