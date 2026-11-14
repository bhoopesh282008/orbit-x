import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface LaunchPadEnvironmentProps {
  smokeActive?: boolean
  smokeIntensity?: number
  engineStarted?: boolean
  isLiftoff?: boolean
  visible?: boolean
}

export function LaunchPadEnvironment({
  smokeActive = false,
  smokeIntensity = 1.0,
  engineStarted = false,
  isLiftoff = false,
  visible = true,
}: LaunchPadEnvironmentProps) {
  const smokeGroupRef = useRef<THREE.Group>(null)
  const umbilicalArmRef = useRef<THREE.Group>(null)
  const clampsGroupRef = useRef<THREE.Group>(null)

  // Radial smoke puffs billowing from flame trench
  const smokePuffs = useMemo(() => {
    return Array.from({ length: 48 }).map((_, i) => {
      const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const dist = 0.8 + Math.random() * 2.5
      return {
        id: i,
        baseX: Math.cos(angle) * dist,
        baseZ: Math.sin(angle) * dist * 1.4,
        dirX: Math.cos(angle) * (1.2 + Math.random() * 1.5),
        dirZ: Math.sin(angle) * (1.2 + Math.random() * 1.5),
        speedY: 0.6 + Math.random() * 1.8,
        scale: 0.8 + Math.random() * 1.6,
        life: Math.random(),
      }
    })
  }, [])

  useFrame((_, delta) => {
    if (!visible) return

    // 1. Umbilical arm swing-away retraction animation at T-6s
    if (umbilicalArmRef.current) {
      const targetRotationY = engineStarted || isLiftoff ? -0.85 : 0
      umbilicalArmRef.current.rotation.y = THREE.MathUtils.lerp(
        umbilicalArmRef.current.rotation.y,
        targetRotationY,
        delta * 1.8
      )
    }

    // 2. Hold-down clamp release tilt animation at T-0s
    if (clampsGroupRef.current) {
      clampsGroupRef.current.children.forEach((clamp) => {
        const targetRotX = isLiftoff ? 0.4 : 0
        clamp.rotation.x = THREE.MathUtils.lerp(clamp.rotation.x, targetRotX, delta * 3.0)
      })
    }

    // 3. Dynamic expanding ground smoke & deluge cloud
    if (smokeGroupRef.current && smokeActive) {
      smokeGroupRef.current.children.forEach((child, idx) => {
        const puff = smokePuffs[idx]
        if (!puff) return
        child.position.y += delta * puff.speedY * smokeIntensity
        child.position.x += delta * puff.dirX * smokeIntensity
        child.position.z += delta * puff.dirZ * smokeIntensity
        const currentScale = child.scale.x * (1 + delta * 0.35)
        child.scale.set(currentScale, currentScale, currentScale)

        if (child.position.y > 7.5 || child.position.length() > 14) {
          child.position.y = 0.15
          child.position.x = puff.baseX
          child.position.z = puff.baseZ
          child.scale.set(puff.scale, puff.scale, puff.scale)
        }
      })
    }
  })

  if (!visible) return null

  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* 1. TERRAIN INTEGRATION & EMBEDDED FOUNDATION (ZERO GAP)        */}
      {/* Deep foundation penetrating into Earth crust to prevent gaps   */}
      {/* ============================================================== */}
      {/* Sloping Earthen Perimeter Berm / Terrain Mound */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <cylinderGeometry args={[16, 26, 3.2, 48]} />
        <meshStandardMaterial color="#2d3748" roughness={0.95} metalness={0.08} />
      </mesh>

      {/* Deep Reinforced Concrete Foundation Caisson */}
      <mesh position={[0, -0.9, 0]} receiveShadow>
        <cylinderGeometry args={[13.5, 15.5, 2.0, 48]} />
        <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.15} />
      </mesh>

      {/* Main Launch Pad Concrete Apron Deck (at Ground Surface Y = 0) */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[9.5, 10.2, 0.25, 48]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.82} metalness={0.12} />
      </mesh>

      {/* Perimeter Safety Ring with Yellow/Black Hazard Warning Markings */}
      <mesh position={[0, 0.08, 0]}>
        <ringGeometry args={[9.0, 9.5, 48]} />
        <meshStandardMaterial color="#eab308" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Octagonal Heavy Steel Engine Thrust Mount Plate */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.7, 0.2, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.92} />
      </mesh>

      {/* Center Flame Opening Collar */}
      <mesh position={[0, 0.23, 0]}>
        <ringGeometry args={[1.1, 2.4, 32]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* ============================================================== */}
      {/* 2. FLAME TRENCH & BLAST DEFLECTOR WEDGE                         */}
      {/* Carved below the surface level into the Earth crust            */}
      {/* ============================================================== */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[2.4, 1.2, 6.2]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Heavy Steel V-shaped Blast Deflector Wedge */}
      <group position={[0, -0.4, 0]}>
        <mesh rotation={[0.45, 0, 0]}>
          <boxGeometry args={[2.2, 0.14, 2.6]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[2.2, 0.14, 2.6]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.85} />
        </mesh>
      </group>

      {/* Flame trench internal illumination when engine ignited */}
      {engineStarted && (
        <pointLight position={[0, -0.2, 0]} color="#f97316" intensity={5.0} distance={14} />
      )}

      {/* ============================================================== */}
      {/* 3. STEEL LAUNCH SERVICE TOWER (EXTENDING OUTWARD INTO SKY)     */}
      {/* ============================================================== */}
      <group position={[-2.6, 4.4, -0.3]}>
        {/* 4 Vertical High-Strength Box Steel Columns */}
        {[-0.55, 0.55].map((x) =>
          [-0.55, 0.55].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0, z]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 9.2, 12]} />
              <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.85} />
            </mesh>
          ))
        )}

        {/* 9 Horizontal Tower Deck Platforms with Cross-Strut Bracing */}
        {Array.from({ length: 9 }).map((_, i) => (
          <group key={i} position={[0, -4.2 + i * 1.05, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 0.08, 1.2]} />
              <meshStandardMaterial color="#991b1b" roughness={0.35} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[1.05, 0.02, 1.05]} />
              <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.7} />
            </mesh>
            <mesh rotation={[0.45, 0, 0.45]}>
              <boxGeometry args={[1.4, 0.04, 0.04]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.25} metalness={0.9} />
            </mesh>
            <mesh rotation={[-0.45, 0, -0.45]}>
              <boxGeometry args={[1.4, 0.04, 0.04]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.25} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Articulated Umbilical Swing Arm (Swings back at T-6s) */}
        <group ref={umbilicalArmRef} position={[0.55, 2.2, 0.1]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.35, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.75, 0, 0]}>
            <boxGeometry args={[1.5, 0.18, 0.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.88} />
          </mesh>
          <mesh position={[1.52, 0, 0]}>
            <boxGeometry args={[0.08, 0.32, 0.32]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.95} />
          </mesh>
          {[-0.07, 0.07].map((offsetZ, idx) => (
            <mesh key={idx} position={[0.75, -0.14, offsetZ]}>
              <cylinderGeometry args={[0.035, 0.035, 1.45, 12]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.9} />
            </mesh>
          ))}
        </group>

        {/* High-bay crane at top */}
        <group position={[0.4, 4.6, 0]}>
          <mesh position={[0.5, 0, 0]}>
            <boxGeometry args={[1.0, 0.14, 0.18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.85} />
          </mesh>
        </group>

        {/* Lightning Mast with Red Aircraft Warning Beacon at Apex */}
        <mesh position={[0, 5.4, 0]}>
          <cylinderGeometry args={[0.02, 0.06, 1.8, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0, 6.3, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <pointLight position={[0, 6.3, 0]} color="#ef4444" intensity={1.0} distance={8} />
      </group>

      {/* ============================================================== */}
      {/* 4. PNEUMATIC HOLD-DOWN SUPPORT CLAMPS (4 around base)          */}
      {/* ============================================================== */}
      <group ref={clampsGroupRef}>
        {[0, 1, 2, 3].map((i) => {
          const ang = (i * Math.PI) / 2 + Math.PI / 4
          const r = 1.15
          return (
            <group
              key={i}
              position={[Math.cos(ang) * r, 0.25, Math.sin(ang) * r]}
              rotation={[0, -ang + Math.PI / 2, 0]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.34, 0.45, 0.36]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.85} />
              </mesh>
              <mesh position={[0, 0.15, -0.12]}>
                <cylinderGeometry args={[0.05, 0.05, 0.35, 12]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.95} />
              </mesh>
              <mesh position={[0, 0.28, -0.06]}>
                <boxGeometry args={[0.22, 0.14, 0.24]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.9} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* ============================================================== */}
      {/* 5. WATER DELUGE SOUND SUPPRESSION PIPES & CRYOGENIC FEEDLINES   */}
      {/* ============================================================== */}
      <group position={[1.9, 0.15, 1.4]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 3.2, 20]} />
          <meshStandardMaterial color="#0284c7" roughness={0.25} metalness={0.9} />
        </mesh>
        {[-1.0, 0, 1.0].map((x, idx) => (
          <mesh key={idx} position={[x, -0.1, -0.6]} rotation={[0.6, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.3, 12]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* ============================================================== */}
      {/* 6. EXPANDING VOLUMETRIC SMOKE CLOUD & WATER DELUGE STEAM        */}
      {/* ============================================================== */}
      {smokeActive && (
        <group ref={smokeGroupRef} position={[0, 0.2, 0]}>
          {smokePuffs.map((puff) => (
            <mesh key={puff.id} position={[puff.baseX, 0.2, puff.baseZ]}>
              <sphereGeometry args={[0.5, 14, 14]} />
              <meshStandardMaterial
                color={engineStarted ? '#fef08a' : '#f1f5f9'}
                transparent
                opacity={0.65}
                roughness={0.95}
                metalness={0.05}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
