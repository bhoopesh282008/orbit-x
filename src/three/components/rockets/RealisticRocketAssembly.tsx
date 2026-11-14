import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AEROSPACE_PALETTE } from '@/three/utils/aerospaceMaterials'
import { RealisticBusChassis } from '@/components/designer/RealisticBusChassis'
import { RocketExhaustParticles } from './RocketExhaustParticles'
import type { SpacecraftComponent } from '@/stores/spacecraftStore'
import { useLaunchSimulationStore } from '@/stores/launchSimulationStore'

export interface RealisticRocketAssemblyProps {
  vehicleId: string
  stage1Separated?: boolean
  boostersSeparated?: boolean
  fairingSeparated?: boolean
  spacecraftDeployed?: boolean
  solarPanelsDeployed?: boolean
  antennasDeployed?: boolean
  thrustActive?: boolean
  stage2ThrustActive?: boolean
  altitude?: number
  components?: SpacecraftComponent[]
}

export function RealisticRocketAssembly({
  vehicleId,
  stage1Separated = false,
  boostersSeparated = false,
  fairingSeparated = false,
  spacecraftDeployed = false,
  solarPanelsDeployed = false,
  antennasDeployed = false,
  thrustActive = false,
  stage2ThrustActive = false,
  altitude = 0,
  components = [],
}: RealisticRocketAssemblyProps) {
  const isLight = vehicleId === 'orbit-x-light'
  const isHeavy = vehicleId === 'orbit-x-heavy'
  const isDeepSpace = vehicleId === 'orbit-x-deep-space'

  // Dimensions
  const coreRadius = isLight ? 0.38 : isHeavy ? 0.52 : 0.68
  const coreHeight = isLight ? 4.2 : isHeavy ? 5.4 : 6.8
  const fairingRadius = coreRadius * 1.08
  const fairingHeight = isLight ? 1.6 : isHeavy ? 2.2 : 2.8

  // Animation Refs
  const stage1GroupRef = useRef<THREE.Group>(null)
  const portBoosterRef = useRef<THREE.Group>(null)
  const starboardBoosterRef = useRef<THREE.Group>(null)
  const fairingLeftRef = useRef<THREE.Group>(null)
  const fairingRightRef = useRef<THREE.Group>(null)
  const spacecraftGroupRef = useRef<THREE.Group>(null)

  // Color & PBR themes:
  // Deep Space: Orange cryogenic core (SLS-style) + white SRBs
  // Light: Clean graphite-carbon black & aerospace white
  // Heavy: Clean aerospace white thermal coat + titanium ring seams
  const coreColor = isDeepSpace ? '#b85d1b' : isLight ? '#f1f5f9' : '#f8fafc'
  const metalness = isDeepSpace ? 0.35 : 0.82
  const roughness = isDeepSpace ? 0.55 : 0.22

  // Spacecraft component checks
  const hasSmallBus = components.some((c) => c.id === 'bus-small')
  const hasMediumBus = components.some((c) => c.id === 'bus-medium')
  const hasHeavyBus = components.some((c) => c.id === 'bus-heavy')
  const hasBus = hasSmallBus || hasMediumBus || hasHeavyBus

  const hasSolar = components.some((c) => c.category === 'power')
  const hasDish = components.some((c) => c.id === 'comm-high' || c.id === 'comm-deep')
  const hasProp = components.some((c) => c.category === 'propulsion')

  const busHeight = hasHeavyBus ? 0.9 : hasMediumBus ? 0.65 : 0.45
  const busRadius = hasHeavyBus ? 0.38 : hasMediumBus ? 0.3 : 0.22

  useFrame((_, rawDelta) => {
    // Separation animations run on simulation time so they keep up with time warp
    const sim = useLaunchSimulationStore.getState()
    const delta = sim.isPaused ? 0 : Math.min(rawDelta, 0.1) * sim.simSpeed
    // 1. Stage 1 booster separation: accelerates backward and tumbles gently
    if (stage1GroupRef.current) {
      if (stage1Separated) {
        // Separation pushers then the stage falls behind as the upper stage accelerates
        const g = stage1GroupRef.current
        const dropSpeed = 0.6 + Math.min(12, Math.abs(g.position.y) * 0.25)
        g.position.y -= delta * dropSpeed
        g.position.z -= delta * 0.12
        g.rotation.x += delta * 0.05
        g.rotation.z += delta * 0.03
        g.visible = g.position.y > -400
      } else {
        stage1GroupRef.current.position.set(0, 0, 0)
        stage1GroupRef.current.rotation.set(0, 0, 0)
        stage1GroupRef.current.visible = true
      }
    }

    // 2. Solid Rocket Boosters separation (Heavy & Deep Space)
    if (portBoosterRef.current && starboardBoosterRef.current) {
      if (boostersSeparated) {
        portBoosterRef.current.position.x -= delta * 2.2
        portBoosterRef.current.position.y -= delta * 2.6
        portBoosterRef.current.rotation.z -= delta * 0.25

        starboardBoosterRef.current.position.x += delta * 2.2
        starboardBoosterRef.current.position.y -= delta * 2.6
        starboardBoosterRef.current.rotation.z += delta * 0.25
      } else {
        portBoosterRef.current.position.set(-coreRadius * 1.95, coreHeight * 0.26, 0)
        portBoosterRef.current.rotation.set(0, 0, 0)
        starboardBoosterRef.current.position.set(coreRadius * 1.95, coreHeight * 0.26, 0)
        starboardBoosterRef.current.rotation.set(0, 0, 0)
      }
    }

    // 3. Fairing separation: halves hinge open, then drift away and tumble
    if (fairingLeftRef.current && fairingRightRef.current) {
      if (fairingSeparated) {
        const l = fairingLeftRef.current
        const r = fairingRightRef.current
        const opening = Math.min(1, Math.abs(l.rotation.z) / 0.5)
        l.rotation.z += delta * (opening < 1 ? 0.5 : 0.25)
        r.rotation.z -= delta * (opening < 1 ? 0.5 : 0.25)
        l.position.x -= delta * (0.4 + opening * 1.6)
        r.position.x += delta * (0.4 + opening * 1.6)
        l.position.y -= delta * opening * 1.8
        r.position.y -= delta * opening * 1.8
        l.visible = l.position.x > -60
        r.visible = r.position.x < 60
      } else {
        fairingLeftRef.current.position.set(0, 2.75, 0)
        fairingLeftRef.current.rotation.set(0, 0, 0)
        fairingRightRef.current.position.set(0, 2.75, 0)
        fairingRightRef.current.rotation.set(0, 0, 0)
        fairingLeftRef.current.visible = true
        fairingRightRef.current.visible = true
      }
    }

    // 4. Spacecraft deployment: moves forward gently from stage 2 adapter
    if (spacecraftGroupRef.current) {
      if (spacecraftDeployed) {
        // Spring separation: ~0.5 m/s away from the upper stage
        spacecraftGroupRef.current.position.y = Math.min(14, spacecraftGroupRef.current.position.y + delta * 0.6)
        spacecraftGroupRef.current.rotation.y += delta * 0.15
      } else {
        spacecraftGroupRef.current.position.set(0, 2.75, 0)
        spacecraftGroupRef.current.rotation.set(0, 0, 0)
      }
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* STAGE 1 BOOSTER & LOWER ENGINES (SEPARABLE)                    */}
      {/* ============================================================== */}
      <group ref={stage1GroupRef}>
        {/* Main Stage 1 Fuel Tank Body */}
        <mesh position={[0, coreHeight * 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[coreRadius, coreRadius, coreHeight * 0.7, 48]} />
          <meshStandardMaterial
            color={coreColor}
            metalness={metalness}
            roughness={roughness}
          />
        </mesh>

        {/* Structural Stiffener Rings & Welded Seams */}
        {[-0.2, 0.05, 0.3, 0.55].map((yFrac, idx) => (
          <mesh key={idx} position={[0, coreHeight * yFrac, 0]}>
            <cylinderGeometry args={[coreRadius * 1.015, coreRadius * 1.015, 0.06, 48]} />
            <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Aerodynamic Feedlines & Avionics Raceways along Stage 1 */}
        <mesh position={[coreRadius + 0.035, coreHeight * 0.35, 0]}>
          <boxGeometry args={[0.06, coreHeight * 0.65, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.25} />
        </mesh>
        <mesh position={[-coreRadius - 0.035, coreHeight * 0.35, 0]}>
          <boxGeometry args={[0.06, coreHeight * 0.65, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.25} />
        </mesh>

        {/* Base Thrust Structure Skirt */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[coreRadius, coreRadius * 1.06, 0.45, 48]} />
          <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.15} />
        </mesh>

        {/* Aerodynamic Grid Fins for Recovery Guidance — ONLY on Heavy reusable class */}
        {isHeavy &&
          [0, 1, 2, 3].map((i) => {
            const ang = (i * Math.PI) / 2
            const r = coreRadius + 0.16
            return (
              <group
                key={i}
                position={[Math.cos(ang) * r, coreHeight * 0.64, Math.sin(ang) * r]}
                rotation={[0, -ang, 0]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.34, 0.24, 0.02]} />
                  <meshStandardMaterial color="#0284c7" metalness={0.92} roughness={0.2} />
                </mesh>
                <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.1} />
                </mesh>
              </group>
            )
          })}

        {/* Side-Strapped Solid Rocket Boosters (Heavy & Deep Space configurations) */}
        {(isHeavy || isDeepSpace) && (
          <>
            {/* Port Booster */}
            <group ref={portBoosterRef} position={[-coreRadius * 1.95, coreHeight * 0.26, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[coreRadius * 0.72, coreRadius * 0.72, coreHeight * 0.78, 36]} />
                <meshStandardMaterial
                  color={isDeepSpace ? '#f8fafc' : '#e2e8f0'}
                  metalness={0.75}
                  roughness={0.28}
                />
              </mesh>
              <mesh position={[0, (coreHeight * 0.78) / 2 + 0.42, 0]} castShadow>
                <cylinderGeometry args={[0.02, coreRadius * 0.72, 0.85, 36]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, -(coreHeight * 0.78) / 2 - 0.28, 0]} rotation={[Math.PI, 0, 0]}>
                <cylinderGeometry args={[coreRadius * 0.52, coreRadius * 0.24, 0.55, 24]} />
                <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.15} />
              </mesh>
              <mesh position={[coreRadius * 0.5, 0, 0]}>
                <boxGeometry args={[coreRadius * 0.55, 0.15, 0.15]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>

            {/* Starboard Booster */}
            <group ref={starboardBoosterRef} position={[coreRadius * 1.95, coreHeight * 0.26, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[coreRadius * 0.72, coreRadius * 0.72, coreHeight * 0.78, 36]} />
                <meshStandardMaterial
                  color={isDeepSpace ? '#f8fafc' : '#e2e8f0'}
                  metalness={0.75}
                  roughness={0.28}
                />
              </mesh>
              <mesh position={[0, (coreHeight * 0.78) / 2 + 0.42, 0]} castShadow>
                <cylinderGeometry args={[0.02, coreRadius * 0.72, 0.85, 36]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, -(coreHeight * 0.78) / 2 - 0.28, 0]} rotation={[Math.PI, 0, 0]}>
                <cylinderGeometry args={[coreRadius * 0.52, coreRadius * 0.24, 0.55, 24]} />
                <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.15} />
              </mesh>
              <mesh position={[-coreRadius * 0.5, 0, 0]}>
                <boxGeometry args={[coreRadius * 0.55, 0.15, 0.15]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          </>
        )}

        {/* Stage 1 Engine Cluster: Model specific to vehicle class */}
        <group position={[0, -0.25, 0]}>
          {isLight && (
            // Light: Single high-expansion vacuum/sea-level bell
            <group>
              <mesh rotation={[Math.PI, 0, 0]}>
                <cylinderGeometry args={[coreRadius * 0.48, coreRadius * 0.18, 0.75, 28]} />
                <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.12} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[coreRadius * 0.2, coreRadius * 0.2, 0.18, 20]} />
                <meshStandardMaterial color="#b87345" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          )}

          {isHeavy && (
            // Heavy: Octaweb 9-Engine layout (1 center + 8 outer)
            <>
              <mesh rotation={[Math.PI, 0, 0]}>
                <cylinderGeometry args={[coreRadius * 0.32, coreRadius * 0.14, 0.65, 24]} />
                <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.12} />
              </mesh>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const ang = (i * Math.PI) / 4
                const r = coreRadius * 0.68
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}
                    rotation={[Math.PI, 0, 0]}
                  >
                    <cylinderGeometry args={[coreRadius * 0.26, coreRadius * 0.11, 0.55, 16]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.12} />
                  </mesh>
                )
              })}
            </>
          )}

          {isDeepSpace &&
            [-0.32, 0.32].flatMap((x) =>
              [-0.32, 0.32].map((z) => (
                <group key={`${x}-${z}`} position={[x * coreRadius, 0, z * coreRadius]}>
                  <mesh rotation={[Math.PI, 0, 0]}>
                    <cylinderGeometry args={[coreRadius * 0.35, coreRadius * 0.15, 0.72, 24]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.12} />
                  </mesh>
                  <mesh position={[0, 0.16, 0]}>
                    <cylinderGeometry args={[coreRadius * 0.16, coreRadius * 0.16, 0.14, 16]} />
                    <meshStandardMaterial color="#b87345" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>
              ))
            )}

          {/* ACTIVE EXHAUST PLUME & MACH DIAMONDS */}
          {thrustActive && !stage1Separated && (
            <group position={[0, -0.4, 0]}>
              <RocketExhaustParticles
                thrustActive={thrustActive && !stage1Separated}
                altitude={altitude}
                coreRadius={coreRadius}
                isDeepSpace={isDeepSpace}
                isHeavy={isHeavy}
              />
            </group>
          )}
        </group>
      </group>

      {/* ============================================================== */}
      {/* INTERSTAGE TRUSS & STAGE 2 UPPER VEHICLE                       */}
      {/* ============================================================== */}
      <group position={[0, coreHeight * 0.7, 0]}>
        {/* Carbon Composite / Titanium Interstage Ring */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[coreRadius * 1.01, coreRadius * 1.01, 0.4, 48]} />
          <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.15} />
        </mesh>

        {/* Stage 2 Vacuum Engine Nozzle (Niobium / Titanium Bell) */}
        <group position={[0, 0.65, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[coreRadius * 0.52, coreRadius * 0.16, 0.75, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[coreRadius * 0.18, coreRadius * 0.18, 0.14, 20]} />
            <meshStandardMaterial color="#b87345" metalness={0.92} roughness={0.18} />
          </mesh>

          {/* Stage 2 active high-efficiency vacuum plume */}
          {stage2ThrustActive && (
            <group position={[0, -0.3, 0]}>
              <RocketExhaustParticles
                stage2ThrustActive={stage2ThrustActive}
                altitude={altitude}
                coreRadius={coreRadius}
                isDeepSpace={isDeepSpace}
                isHeavy={isHeavy}
              />
            </group>
          )}
        </group>

        {/* Stage 2 Fuel Tank Body */}
        <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[coreRadius, coreRadius, 1.3, 48]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.82} roughness={0.24} />
        </mesh>

        {/* Stage 2 Avionics & Payload Adapter Ring */}
        <mesh position={[0, 2.15, 0]}>
          <cylinderGeometry args={[coreRadius * 0.96, coreRadius * 0.96, 0.22, 36]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* ============================================================== */}
        {/* PAYLOAD: THE PLAYER'S ACTUAL CONFIGURED SPACECRAFT             */}
        {/* ============================================================== */}
        <group ref={spacecraftGroupRef} position={[0, 2.75, 0]}>
          {hasBus ? (
            <group scale={[0.85, 0.85, 0.85]}>
              <RealisticBusChassis
                busRadius={busRadius}
                busHeight={busHeight}
                hasSmallBus={hasSmallBus}
                hasMediumBus={hasMediumBus}
                hasHeavyBus={hasHeavyBus}
              />
            </group>
          ) : (
            <mesh castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.55, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
          )}

          {/* Deployed or Stowed Solar Wings */}
          {hasSolar && (
            <group>
              {/* Starboard Wing */}
              <group
                position={[busRadius * 0.95, 0, 0]}
                rotation={[0, 0, solarPanelsDeployed ? 0 : Math.PI / 2 - 0.1]}
              >
                <mesh position={[solarPanelsDeployed ? 0.65 : 0.08, 0, 0]} castShadow>
                  <boxGeometry args={[solarPanelsDeployed ? 1.2 : 0.2, 0.32, 0.02]} />
                  <meshStandardMaterial
                    color={AEROSPACE_PALETTE.solarCellBlue}
                    metalness={0.88}
                    roughness={0.15}
                  />
                </mesh>
              </group>
              {/* Port Wing */}
              <group
                position={[-busRadius * 0.95, 0, 0]}
                rotation={[0, 0, solarPanelsDeployed ? 0 : -Math.PI / 2 + 0.1]}
              >
                <mesh position={[solarPanelsDeployed ? -0.65 : -0.08, 0, 0]} castShadow>
                  <boxGeometry args={[solarPanelsDeployed ? 1.2 : 0.2, 0.32, 0.02]} />
                  <meshStandardMaterial
                    color={AEROSPACE_PALETTE.solarCellBlue}
                    metalness={0.88}
                    roughness={0.15}
                  />
                </mesh>
              </group>
            </group>
          )}

          {/* Deployed or Stowed Communications High-Gain Dish */}
          {hasDish && (
            <group
              position={[0, busHeight * 0.5 + 0.12, 0]}
              rotation={[antennasDeployed ? 0.45 : 0.05, 0, 0]}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.22, 0.04, 0.12, 20]} />
                <meshStandardMaterial color={AEROSPACE_PALETTE.antennaDish} metalness={0.92} roughness={0.15} />
              </mesh>
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
                <meshStandardMaterial color="#b87345" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* Propulsion Thruster Bell */}
          {hasProp && (
            <mesh position={[0, -busHeight * 0.5 - 0.08, 0]} rotation={[Math.PI, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.04, 0.18, 16]} />
              <meshStandardMaterial color="#b87345" metalness={0.92} roughness={0.2} />
            </mesh>
          )}
        </group>

        {/* ============================================================== */}
        {/* PAYLOAD FAIRING HALVES (SEPARABLE AEROSHELL)                   */}
        {/* ============================================================== */}
        {/* Left Fairing Half */}
        <group ref={fairingLeftRef} position={[0, 2.75, 0]}>
          <mesh castShadow>
            <cylinderGeometry
              args={[0.02, fairingRadius, fairingHeight, 32, 1, false, Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color="#f1f5f9" metalness={0.82} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry
              args={[0.018, fairingRadius * 0.98, fairingHeight * 0.98, 32, 1, false, Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Right Fairing Half */}
        <group ref={fairingRightRef} position={[0, 2.75, 0]}>
          <mesh castShadow>
            <cylinderGeometry
              args={[0.02, fairingRadius, fairingHeight, 32, 1, false, -Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color="#f1f5f9" metalness={0.82} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry
              args={[0.018, fairingRadius * 0.98, fairingHeight * 0.98, 32, 1, false, -Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
