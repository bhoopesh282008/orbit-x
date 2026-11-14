import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RocketExhaustParticlesProps {
  thrustActive?: boolean
  stage2ThrustActive?: boolean
  altitude?: number // km
  coreRadius?: number
  isDeepSpace?: boolean
  isHeavy?: boolean
}

export function RocketExhaustParticles({
  thrustActive = false,
  stage2ThrustActive = false,
  altitude = 0,
  coreRadius = 0.45,
  isDeepSpace = false,
  isHeavy = false,
}: RocketExhaustParticlesProps) {
  const plumeGroupRef = useRef<THREE.Group>(null)
  const vacuumPlumeRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const trailingSmokeRef = useRef<THREE.Group>(null)

  // Atmospheric expansion ratio: increases as altitude rises (underexpanded nozzle)
  const expansion = useMemo(() => {
    const vacuumFactor = Math.min(2.4, 1.0 + (altitude / 60) * 1.4)
    return vacuumFactor
  }, [altitude])

  // Procedural trailing smoke particles
  const smokePuffs = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      offsetY: -i * 0.4,
      driftX: (Math.random() - 0.5) * 0.25,
      driftZ: (Math.random() - 0.5) * 0.25,
      scale: 0.4 + i * 0.12,
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((_, delta) => {
    // 1. High-frequency turbulence jitter on flame length and thickness
    if (plumeGroupRef.current && thrustActive) {
      const jitter = 1 + Math.sin(Date.now() * 0.06) * 0.08
      const expand = expansion * (1 + Math.sin(Date.now() * 0.04) * 0.05)
      plumeGroupRef.current.scale.set(expand, jitter, expand)
    }

    // 2. Stage 2 vacuum engine exhaust pulse
    if (vacuumPlumeRef.current && stage2ThrustActive) {
      const pulse = 1 + Math.sin(Date.now() * 0.05) * 0.1
      vacuumPlumeRef.current.scale.set(pulse * 1.6, pulse * 1.2, pulse * 1.6)
    }

    // 3. Flickering flame light
    if (lightRef.current && (thrustActive || stage2ThrustActive)) {
      lightRef.current.intensity = 3.5 + Math.random() * 1.2
    }

    // 4. Trailing smoke plume expansion and movement
    if (trailingSmokeRef.current && thrustActive && altitude < 35) {
      trailingSmokeRef.current.children.forEach((child, idx) => {
        const p = smokePuffs[idx]
        if (!p) return
        child.position.y -= delta * (5.5 + idx * 0.4)
        child.position.x += Math.sin(Date.now() * 0.003 + p.phase) * delta * 0.8
        child.position.z += Math.cos(Date.now() * 0.003 + p.phase) * delta * 0.8
        const s = child.scale.x * (1 + delta * 0.4)
        child.scale.set(s, s, s)

        // Reset if drifted too far behind rocket
        if (child.position.y < -12.0) {
          child.position.set(p.driftX, -0.6, p.driftZ)
          child.scale.set(p.scale, p.scale, p.scale)
        }
      })
    }
  })

  const flameHeight = (isDeepSpace ? 4.2 : isHeavy ? 3.4 : 2.5) * (altitude > 40 ? 1.4 : 1.0)
  const nozzleBaseRadius = coreRadius * 0.85

  return (
    <group position={[0, -0.1, 0]}>
      {/* Dynamic fire illumination */}
      {(thrustActive || stage2ThrustActive) && (
        <pointLight
          ref={lightRef}
          position={[0, -1.2, 0]}
          color={thrustActive ? '#fb923c' : '#38bdf8'}
          intensity={4.0}
          distance={24}
        />
      )}

      {/* ============================================================== */}
      {/* 1. STAGE 1 BOOSTER MAIN EXHAUST PLUME (LIFTOFF / ASCENT)       */}
      {/* ============================================================== */}
      {thrustActive && (
        <group ref={plumeGroupRef} position={[0, -0.2, 0]}>
          {/* A. Inner Super-Hot Mach Supersonic Core Flame (Bright Cyan/White) */}
          <mesh position={[0, -flameHeight * 0.35, 0]}>
            <coneGeometry args={[nozzleBaseRadius * 0.55, flameHeight * 0.7, 32]} />
            <meshBasicMaterial color="#f0f9ff" transparent opacity={0.95} />
          </mesh>

          {/* B. Mach Shock Diamond Rings along Core Centerline */}
          {[0.2, 0.4, 0.6, 0.8].map((frac, idx) => (
            <mesh key={idx} position={[0, -flameHeight * frac * 0.6, 0]}>
              <octahedronGeometry args={[nozzleBaseRadius * 0.3 * (1 - frac * 0.25), 0]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.88} />
            </mesh>
          ))}

          {/* C. Primary Fiery High-Energy Combustion Plume (Golden Orange) */}
          <mesh position={[0, -flameHeight * 0.5, 0]}>
            <coneGeometry args={[nozzleBaseRadius * 0.95, flameHeight, 32]} />
            <meshBasicMaterial
              color="#ea580c"
              transparent
              opacity={0.82}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* D. Outer Atmospheric Sheath / Expansive Glow Mantle */}
          <mesh position={[0, -flameHeight * 0.55, 0]}>
            <coneGeometry args={[nozzleBaseRadius * 1.5, flameHeight * 1.15, 32]} />
            <meshBasicMaterial
              color="#f97316"
              transparent
              opacity={0.42}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* ============================================================== */}
      {/* 2. TRAILING SMOKE TURBULENCE COLUMN (ATMOSPHERIC ASCENT)        */}
      {/* ============================================================== */}
      {thrustActive && altitude < 35 && (
        <group ref={trailingSmokeRef} position={[0, -0.4, 0]}>
          {smokePuffs.map((p) => (
            <mesh key={p.id} position={[p.driftX, p.offsetY, p.driftZ]}>
              <sphereGeometry args={[p.scale, 10, 10]} />
              <meshStandardMaterial
                color="#f1f5f9"
                transparent
                opacity={0.45}
                roughness={0.9}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ============================================================== */}
      {/* 3. STAGE 2 HIGH-EFFICIENCY VACUUM PLUME (UPPER ATMOSPHERE/ORBIT)*/}
      {/* ============================================================== */}
      {stage2ThrustActive && (
        <group ref={vacuumPlumeRef} position={[0, -0.3, 0]}>
          {/* Intense Ionized Vacuum Core (Purple / Royal Blue) */}
          <mesh position={[0, -1.2, 0]}>
            <coneGeometry args={[coreRadius * 0.7, 2.4, 24]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.92} />
          </mesh>

          {/* Expanded Vacuum Plume Bell */}
          <mesh position={[0, -1.8, 0]}>
            <coneGeometry args={[coreRadius * 1.8, 3.6, 24]} />
            <meshBasicMaterial
              color="#0284c7"
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, -2.1, 0]}>
            <coneGeometry args={[coreRadius * 2.5, 4.2, 24]} />
            <meshBasicMaterial
              color="#6366f1"
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

