import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PAD_DECK_HEIGHT, launchFrame } from './launchFrame'
import { ParticleCloud } from './ParticleCloud'
import { useLaunchSimulationStore } from '@/stores/launchSimulationStore'
import { useGraphicsProfile } from '@/hooks/useGraphicsProfile'

const STEEL = '#6b7480'
const STEEL_DARK = '#3f4650'
const CONCRETE = '#b9b5ab'
const CONCRETE_DARK = '#8f8b82'

/** Lattice tower section built from simple beams. */
function LatticeTower({ height, width, color }: { height: number; width: number; color: string }) {
  const levels = Math.max(4, Math.round(height / 1.2))
  const step = height / levels
  const h = width / 2
  const braceLen = Math.sqrt(width * width + step * step)
  const braceAngle = Math.atan2(step, width)
  return (
    <group>
      {[-h, h].flatMap((x) =>
        [-h, h].map((z) => (
          <mesh key={`c${x}${z}`} position={[x, height / 2, z]}>
            <boxGeometry args={[0.16, height, 0.16]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />
          </mesh>
        ))
      )}
      {Array.from({ length: levels + 1 }).map((_, i) => (
        <group key={i} position={[0, i * step, 0]}>
          {[-h, h].map((z) => (
            <mesh key={`x${z}`} position={[0, 0, z]}>
              <boxGeometry args={[width, 0.09, 0.09]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          {[-h, h].map((x) => (
            <mesh key={`z${x}`} position={[x, 0, 0]}>
              <boxGeometry args={[0.09, 0.09, width]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          {/* Grated deck every few levels */}
          {i % 3 === 0 && (
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[width * 0.96, 0.04, width * 0.96]} />
              <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.7} />
            </mesh>
          )}
          {/* X bracing on all four faces */}
          {i < levels &&
            [0, 1, 2, 3].map((face) => (
              <group key={face} rotation={[0, (face * Math.PI) / 2, 0]}>
                <mesh position={[0, step / 2, h]} rotation={[0, 0, braceAngle * (i % 2 ? 1 : -1)]}>
                  <boxGeometry args={[braceLen, 0.05, 0.05]} />
                  <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />
                </mesh>
              </group>
            ))}
        </group>
      ))}
    </group>
  )
}

interface LaunchComplexProps {
  vehicleTop: number
}

/**
 * A coastal launch complex modelled on a Florida pad: concrete hardstand,
 * elevated launch mount over a flame trench, fixed service tower with a
 * swing-away access arm, lightning-protection masts with catenary wires,
 * a deluge water tower and propellant storage.
 */
export function LaunchComplex({ vehicleTop }: LaunchComplexProps) {
  const armRef = useRef<THREE.Group>(null)
  const trenchGlowRef = useRef<THREE.PointLight>(null)
  const steamCount = useGraphicsProfile().steamParticles
  const steam = useMemo(() => {
    const c = new ParticleCloud(steamCount)
    c.drag = 0.28
    c.buoyancy = 1.6
    return c
  }, [steamCount])
  useEffect(() => () => steam.dispose(), [steam])

  const towerHeight = vehicleTop + 3.2
  const mastHeight = towerHeight * 1.45
  const emitAccum = useRef(0)
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpVel = useMemo(() => new THREE.Vector3(), [])

  // Lightning-protection catenary wires between mast tops and the tower mast
  const wireGeometry = useMemo(() => {
    const masts = [
      new THREE.Vector3(30, mastHeight, 30),
      new THREE.Vector3(-30, mastHeight, 30),
      new THREE.Vector3(-30, mastHeight, -30),
      new THREE.Vector3(30, mastHeight, -30),
    ]
    const hub = new THREE.Vector3(-3.4, towerHeight + 4.5, 0)
    const pts: THREE.Vector3[] = []
    for (const m of masts) {
      const mid = m.clone().add(hub).multiplyScalar(0.5)
      mid.y -= 4 // sag
      const curve = new THREE.QuadraticBezierCurve3(m, mid, hub)
      const seg = curve.getPoints(24)
      for (let i = 0; i < seg.length - 1; i++) pts.push(seg[i], seg[i + 1])
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [mastHeight, towerHeight])

  const restartToken = useLaunchSimulationStore((s) => s.phase === 'STANDBY')
  useEffect(() => {
    if (restartToken) steam.reset()
  }, [restartToken, steam])

  useFrame((_, delta) => {
    const { simSpeed, isPaused } = useLaunchSimulationStore.getState()
    const dt = isPaused ? 0 : Math.min(delta, 0.1) * simSpeed

    // Access arm swings clear at engine start
    if (armRef.current) {
      const target = launchFrame.ignitionLevel > 0 || launchFrame.liftedOff ? -1.45 : 0
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, target, Math.min(1, delta * 1.2))
    }

    // Steam/exhaust cloud billowing from the trench exit and around the mount
    const firing = launchFrame.stage1Firing && launchFrame.rocketAltitudeKm < 1.2
    if (firing && dt > 0) {
      const strength = launchFrame.liftedOff ? Math.max(0.15, 1 - launchFrame.rocketAltitudeKm / 1.2) : launchFrame.ignitionLevel
      emitAccum.current += dt * 38 * strength
      while (emitAccum.current > 1) {
        emitAccum.current -= 1
        const r = Math.random()
        if (r < 0.8) {
          // Main plume ejected north out of the flame trench
          tmpPos.set((Math.random() - 0.5) * 6, 1.5, -34 - Math.random() * 4)
          tmpVel.set((Math.random() - 0.5) * 22, 3 + Math.random() * 6, -18 - Math.random() * 26)
        } else {
          // Deluge steam boiling up around the launch mount
          const a = Math.random() * Math.PI * 2
          tmpPos.set(Math.cos(a) * 5, 1, Math.sin(a) * 5)
          tmpVel.set(Math.cos(a) * (4 + Math.random() * 6), 3 + Math.random() * 5, Math.sin(a) * (4 + Math.random() * 6))
        }
        steam.spawn({
          position: tmpPos,
          velocity: tmpVel,
          life: 22 + Math.random() * 18,
          size0: 5 + Math.random() * 4,
          size1: 26 + Math.random() * 30,
          alpha: 0.4 + Math.random() * 0.2,
          shade: 0.85 + Math.random() * 0.15,
          warm: launchFrame.liftedOff ? 0 : 0.12,
        })
      }
    }
    steam.update(dt)

    if (trenchGlowRef.current) {
      trenchGlowRef.current.intensity = firing ? (900 + Math.random() * 300) * Math.max(0.2, launchFrame.ignitionLevel) : 0
    }
  })

  return (
    <group>
      {/* Raised pad mound and concrete hardstand */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[52, 64, 1.4, 8]} />
        <meshStandardMaterial color="#6f7a55" roughness={1} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 8, 0]}>
        <cylinderGeometry args={[44, 46, 0.25, 8]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>

      {/* Flame trench running north, with the exhaust exit apron */}
      <mesh position={[0, 0.26, -19]}>
        <boxGeometry args={[6, 0.04, 34]} />
        <meshStandardMaterial color="#2b2a28" roughness={1} />
      </mesh>
      {[-3.4, 3.4].map((x) => (
        <mesh key={x} position={[x, 0.7, -19]}>
          <boxGeometry args={[0.8, 1.0, 34]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
        </mesh>
      ))}
      <pointLight ref={trenchGlowRef} position={[0, 1.2, -6]} color="#ff8a3a" intensity={0} distance={140} decay={1.6} />

      {/* Launch mount: concrete pedestal with a steel deck over the trench */}
      <group>
        {[
          [-2.8, -2.8],
          [2.8, -2.8],
          [-2.8, 2.8],
          [2.8, 2.8],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, PAD_DECK_HEIGHT / 2, z]}>
            <boxGeometry args={[1.6, PAD_DECK_HEIGHT, 1.6]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, PAD_DECK_HEIGHT - 0.15, 0]}>
          <boxGeometry args={[7.2, 0.3, 7.2]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.7} roughness={0.45} />
        </mesh>
        {/* Exhaust hole */}
        <mesh position={[0, PAD_DECK_HEIGHT + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 32]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        {/* Hold-down clamps */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4
          return (
            <mesh key={i} position={[Math.cos(a) * 1.55, PAD_DECK_HEIGHT + 0.3, Math.sin(a) * 1.55]}>
              <boxGeometry args={[0.35, 0.6, 0.35]} />
              <meshStandardMaterial color="#c9cdd2" metalness={0.8} roughness={0.3} />
            </mesh>
          )
        })}
        {/* Deluge sound-suppression pipes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3.9, PAD_DECK_HEIGHT - 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 7, 12]} />
            <meshStandardMaterial color="#9aa3ad" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Fixed service structure west of the vehicle */}
      <group position={[-3.4, PAD_DECK_HEIGHT, 0]}>
        <LatticeTower height={towerHeight} width={2.4} color={STEEL} />
        {/* Crane / hammerhead at the top */}
        <mesh position={[1.1, towerHeight + 0.4, 0]}>
          <boxGeometry args={[3.4, 0.35, 0.5]} />
          <meshStandardMaterial color="#b3322b" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Lightning mast on the tower */}
        <mesh position={[0, towerHeight + 2.4, 0]}>
          <cylinderGeometry args={[0.06, 0.14, 4.4, 8]} />
          <meshStandardMaterial color="#d7dbe0" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Swing-away crew/umbilical access arm */}
        <group ref={armRef} position={[1.2, vehicleTop - 1.15, 0]}>
          <mesh position={[0.72, 0, 0]}>
            <boxGeometry args={[1.45, 0.55, 0.6]} />
            <meshStandardMaterial color="#e5e7ea" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[1.42, 0, 0]}>
            <boxGeometry args={[0.16, 0.75, 0.8]} />
            <meshStandardMaterial color="#5f6873" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
        {/* Lower umbilical (tail service) */}
        <mesh position={[1.2, 0.8, 0]}>
          <boxGeometry args={[1.2, 0.3, 0.4]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>

      {/* Lightning-protection masts + catenary wires */}
      {[
        [30, 30],
        [-30, 30],
        [-30, -30],
        [30, -30],
      ].map(([x, z]) => (
        <group key={`m${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, mastHeight / 2, 0]}>
            <cylinderGeometry args={[0.14, 0.32, mastHeight, 8]} />
            <meshStandardMaterial color="#cfd3d8" metalness={0.6} roughness={0.45} />
          </mesh>
          <mesh position={[0, mastHeight, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshBasicMaterial color="#ff3b30" />
          </mesh>
        </group>
      ))}
      <lineSegments geometry={wireGeometry}>
        <lineBasicMaterial color="#444b55" transparent opacity={0.7} />
      </lineSegments>

      {/* Deluge water tower */}
      <group position={[-60, 0, 38]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4
          return (
            <mesh key={i} position={[Math.cos(a) * 1.6, 5, Math.sin(a) * 1.6]}>
              <cylinderGeometry args={[0.12, 0.16, 10, 6]} />
              <meshStandardMaterial color="#c8ccd1" metalness={0.5} roughness={0.5} />
            </mesh>
          )
        })}
        <mesh position={[0, 11.2, 0]}>
          <sphereGeometry args={[2.4, 24, 16]} />
          <meshStandardMaterial color="#e9ebee" metalness={0.3} roughness={0.45} />
        </mesh>
      </group>

      {/* Propellant farm: LOX sphere and RP-1 tanks */}
      <mesh position={[34, 3.2, -38]}>
        <sphereGeometry args={[3.2, 28, 18]} />
        <meshStandardMaterial color="#f1f2f4" metalness={0.3} roughness={0.4} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[-36, 1.4, -32 + i * 4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.3, 1.3, 9, 20]} />
          <meshStandardMaterial color="#e4e6e9" metalness={0.35} roughness={0.45} />
        </mesh>
      ))}
      {/* Pad support buildings */}
      {[
        [22, 1.0, 34, 8, 2, 5],
        [-24, 1.4, 22, 6, 2.8, 9],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#d6d3cb" roughness={0.9} />
        </mesh>
      ))}

      <primitive object={steam.mesh} />
    </group>
  )
}
