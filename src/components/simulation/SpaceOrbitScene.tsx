import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Earth } from '@/three/components/planets/Earth'
import { Moon } from '@/three/components/planets/Moon'
import { Mars } from '@/three/components/planets/Mars'
import { SpaceLighting } from '@/three/lighting/SpaceLighting'
import { SpaceEnvironment } from '@/three/environments/SpaceEnvironment'
import { RealisticBusChassis } from '@/components/designer/RealisticBusChassis'
import { AEROSPACE_PALETTE } from '@/three/utils/aerospaceMaterials'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { UniversalCameraControls, CameraOverlayHUD } from '@/three/controls/UniversalCameraControls'

interface SpaceOrbitSceneProps {
  destination: string
  progress: number // 0 to 100
  cameraMode: 'follow' | 'destination' | 'orbit'
}

function SpacecraftMarker({ progress, destination }: { progress: number; destination: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const components = useSpacecraftStore((s) => s.selectedComponents)

  // Subsystem detection from player's assembled design
  const hasSmallBus = components.some((c) => c.id === 'bus-small')
  const hasMediumBus = components.some((c) => c.id === 'bus-medium')
  const hasHeavyBus = components.some((c) => c.id === 'bus-heavy')
  const hasCustomBus = hasSmallBus || hasMediumBus || hasHeavyBus

  const hasHighGainDish = components.some((c) => c.id === 'comm-high' || c.id === 'comm-deep')
  const hasSolarWings = components.some((c) => c.category === 'power')
  const hasThruster = components.some((c) => c.category === 'propulsion')

  const busRadius = hasHeavyBus ? 0.38 : hasMediumBus ? 0.28 : 0.22
  const busHeight = hasHeavyBus ? 0.7 : hasMediumBus ? 0.5 : 0.35

  // Calculate orbital / transfer trajectory arc
  const theta = (progress / 100) * Math.PI
  const targetX = destination === 'Mars' ? 14 : destination === 'Moon' ? 8 : 4.0
  const currentX = (progress / 100) * targetX
  const currentY = Math.sin(theta) * (destination === 'Mars' ? 3.0 : 1.8)
  const currentZ = Math.cos(theta * 1.5) * 1.0

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.2
      meshRef.current.rotation.z = Math.sin(theta) * 0.4
    }
  })

  return (
    <group position={[currentX, currentY, currentZ]} ref={meshRef}>
      {/* Dynamic Assembled Spacecraft Bus */}
      {hasCustomBus ? (
        <group scale={[0.35, 0.35, 0.35]}>
          <RealisticBusChassis
            busRadius={busRadius * 2.5}
            busHeight={busHeight * 2.5}
            hasSmallBus={hasSmallBus}
            hasMediumBus={hasMediumBus}
            hasHeavyBus={hasHeavyBus}
          />
        </group>
      ) : (
        /* Fallback Chassis when no bus configured */
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.22, 0.38]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.9} roughness={0.15} />
        </mesh>
      )}

      {/* Solar Wings (Starboard & Port - Photovoltaic Blue) */}
      {hasSolarWings && (
        <group>
          <mesh position={[0.48, 0, 0]}>
            <boxGeometry args={[0.62, 0.18, 0.02]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0.48, 0, 0]}>
            <boxGeometry args={[0.64, 0.19, 0.015]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[-0.48, 0, 0]}>
            <boxGeometry args={[0.62, 0.18, 0.02]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[-0.48, 0, 0]}>
            <boxGeometry args={[0.64, 0.19, 0.015]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Communications Antenna Dish - Metallic Aluminum */}
      {hasHighGainDish ? (
        <group position={[0, busHeight * 0.6 + 0.12, 0.05]} rotation={[0.4, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.02, 0.09, 16]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.antennaDish} metalness={0.92} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.antennaSubreflectorGold} metalness={0.95} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, busHeight * 0.6 + 0.08, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color={AEROSPACE_PALETTE.antennaWhip} metalness={0.9} />
        </mesh>
      )}

      {/* Active Thruster Exhaust & Glow */}
      {hasThruster && (
        <>
          <mesh position={[0, 0, -busHeight * 0.5 - 0.12]}>
            <coneGeometry args={[0.08, 0.25, 16]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.85} />
          </mesh>
          <pointLight position={[0, 0, -busHeight * 0.5 - 0.18]} intensity={1.5} distance={2.5} color="#22d3ee" />
        </>
      )}
    </group>
  )
}

function OrbitalTrajectoryLine({ destination }: { destination: string }) {
  const points = []
  const targetX = destination === 'Mars' ? 14 : destination === 'Moon' ? 8 : 4.0
  const steps = 80
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const theta = t * Math.PI
    const x = t * targetX
    const y = Math.sin(theta) * (destination === 'Mars' ? 3.0 : 1.8)
    const z = Math.cos(theta * 1.5) * 1.0
    points.push(new THREE.Vector3(x, y, z))
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <primitive
      object={
        new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({
            color: '#f0703f',
            opacity: 0.45,
            transparent: true,
          })
        )
      }
    />
  )
}

function DestinationBody({ destination }: { destination: string }) {
  const targetX = destination === 'Mars' ? 14 : destination === 'Moon' ? 8 : 4.0
  const isMars = destination.toLowerCase().includes('mars')
  const isMoon = destination.toLowerCase().includes('moon') || destination.toLowerCase().includes('lunar')

  return (
    <group position={[targetX, 0, 0]}>
      {isMars ? (
        <Mars radius={1.4} atmosphere rotationSpeed={0.03} />
      ) : isMoon ? (
        <Moon radius={0.9} rotationSpeed={0.015} />
      ) : (
        /* Orbit destination (e.g. LEO deployment node / scientific beacon) */
        <group>
          <mesh>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#f0703f" wireframe />
          </mesh>
          <pointLight color="#f0703f" intensity={1.5} distance={5} />
        </group>
      )}
    </group>
  )
}

export function SpaceOrbitScene({ destination, progress, cameraMode }: SpaceOrbitSceneProps) {
  const [resetKey, setResetKey] = useState(0)
  const targetX = destination === 'Mars' ? 14 : destination === 'Moon' ? 8 : 4.0
  const currentX = (progress / 100) * targetX

  // Dynamic camera focal coordinate
  const camX = cameraMode === 'follow' ? currentX : cameraMode === 'destination' ? targetX : targetX / 2
  const defaultPos: [number, number, number] = [camX + 3.2, 3.8, 6.5]

  return (
    <div className="w-full h-full relative bg-[#02040c] select-none">
      <Canvas
        key={resetKey}
        camera={{ position: defaultPos, fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#020511']} />

        {/* Photorealistic Lighting Rig */}
        <SpaceLighting
          sunPosition={[-18, 12, 14]}
          intensity={2.8}
          ambientIntensity={0.2}
          rimColor="#38bdf8"
        />

        {/* High-density Deep Space Environment */}
        <SpaceEnvironment starsCount={4500} starsRadius={150} />

        {/* Departure Body: Photorealistic Earth */}
        <group position={[0, 0, 0]}>
          <Earth radius={1.8} clouds atmosphere rotationSpeed={0.03} />
        </group>

        {/* Destination Target Body: Moon, Mars, or Orbit */}
        <DestinationBody destination={destination} />

        {/* Flight Trajectory Transfer Arc */}
        <OrbitalTrajectoryLine destination={destination} />

        {/* Active Spacecraft Marker */}
        <SpacecraftMarker progress={progress} destination={destination} />

        {/* Universal 360° Camera Navigation */}
        <UniversalCameraControls
          defaultPosition={defaultPos}
          defaultTarget={[camX, 0, 0]}
          minDistance={1.8}
          maxDistance={45}
          enablePan
          enableZoom
          enableRotate
        />
      </Canvas>

      <CameraOverlayHUD
        onReset={() => setResetKey((k) => k + 1)}
        showPresets
        hintText="360° SIMULATION INSPECTION: DRAG TO ORBIT • SCROLL TO ZOOM • RIGHT-DRAG TO PAN"
      />

      {/* Viewport Overlay Info */}
      <div className="absolute top-3 left-3 bg-bg-panel/85 backdrop-blur-md border border-white/10 rounded px-2.5 py-1 pointer-events-none">
        <span className="text-[10px] font-mono text-accent-cyan uppercase">
          Trajectory Simulation Vector • Earth &rarr; {destination} ({progress.toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}
