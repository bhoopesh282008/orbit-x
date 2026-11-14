import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Earth } from '@/three/components/planets/Earth'
import { SpaceLighting } from '@/three/lighting/SpaceLighting'
import { SpaceEnvironment } from '@/three/environments/SpaceEnvironment'
import { useThemeStore } from '@/stores/themeStore'

interface OrbitingSatelliteProps {
  isLight: boolean
}

function OrbitingSatellite({ isLight }: OrbitingSatelliteProps) {
  const satGroupRef = useRef<THREE.Group>(null)
  const beaconRef = useRef<THREE.PointLight>(null)

  // Satellite orbit trajectory computation
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.32
    if (satGroupRef.current) {
      // Circular orbit inclined across orbital plane
      const radius = 3.8
      const x = Math.cos(t) * radius
      const z = Math.sin(t) * radius
      const y = Math.sin(t * 1.4) * 0.95
      satGroupRef.current.position.set(x, y, z)
      satGroupRef.current.rotation.y = -t + Math.PI / 2
      satGroupRef.current.rotation.z = Math.sin(t) * 0.25
    }

    if (beaconRef.current) {
      // Subtle avionics beacon flash
      beaconRef.current.intensity = 1.0 + Math.sin(state.clock.getElapsedTime() * 4) * 0.5
    }
  })

  // Theme-aware high-contrast aerospace materials
  // Dark mode: Bright titanium silver + radiant gold MLI + deep photovoltaic blue with electric cyan rim
  // Light mode: High-definition brushed steel + high-contrast titanium + rich gold foil + deep navy solar arrays
  const materials = useMemo(() => {
    return {
      titaniumBus: new THREE.MeshStandardMaterial({
        color: isLight ? '#718292' : '#d1dce5',
        metalness: 0.92,
        roughness: isLight ? 0.22 : 0.18,
      }),
      goldFoil: new THREE.MeshStandardMaterial({
        color: isLight ? '#b8860b' : '#f59e0b',
        metalness: 0.95,
        roughness: 0.25,
      }),
      graphiteFrame: new THREE.MeshStandardMaterial({
        color: isLight ? '#1e293b' : '#334155',
        metalness: 0.9,
        roughness: 0.3,
      }),
      solarCells: new THREE.MeshStandardMaterial({
        color: isLight ? '#0c2340' : '#1d4ed8',
        metalness: 0.88,
        roughness: 0.12,
      }),
      solarFrame: new THREE.MeshStandardMaterial({
        color: isLight ? '#94a3b8' : '#cbd5e1',
        metalness: 0.92,
        roughness: 0.2,
      }),
      antennaDish: new THREE.MeshStandardMaterial({
        color: isLight ? '#cbd5e1' : '#f8fafc',
        metalness: 0.95,
        roughness: 0.15,
      }),
      thrusterCopper: new THREE.MeshStandardMaterial({
        color: '#b87345',
        metalness: 0.92,
        roughness: 0.2,
      }),
    }
  }, [isLight])

  return (
    <group ref={satGroupRef}>
      {/* 1. Main Octagonal/Hexagonal Spacecraft Bus Body */}
      <mesh castShadow receiveShadow material={materials.titaniumBus}>
        <boxGeometry args={[0.32, 0.32, 0.48]} />
      </mesh>

      {/* Gold Multi-Layer Insulation (MLI) Thermal Blanket Facet Plates */}
      <mesh position={[0, 0, 0.245]} material={materials.goldFoil}>
        <boxGeometry args={[0.26, 0.26, 0.02]} />
      </mesh>
      <mesh position={[0, 0, -0.245]} material={materials.goldFoil}>
        <boxGeometry args={[0.26, 0.26, 0.02]} />
      </mesh>
      <mesh position={[0.165, 0, 0]} material={materials.goldFoil}>
        <boxGeometry args={[0.02, 0.24, 0.38]} />
      </mesh>
      <mesh position={[-0.165, 0, 0]} material={materials.goldFoil}>
        <boxGeometry args={[0.02, 0.24, 0.38]} />
      </mesh>

      {/* Titanium Structural Perimeter Corner Trim Rails */}
      {[-0.16, 0.16].map((x) =>
        [-0.16, 0.16].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0]} material={materials.graphiteFrame}>
            <boxGeometry args={[0.025, 0.025, 0.49]} />
          </mesh>
        ))
      )}

      {/* 2. Starboard Solar Array (Triple-panel Wing with Silver Frame) */}
      <group position={[0.62, 0, 0]}>
        {/* Main Photovoltaic Deep Blue Collector Panel */}
        <mesh material={materials.solarCells}>
          <boxGeometry args={[0.82, 0.26, 0.025]} />
        </mesh>
        {/* Perimeter Structural Frame & Grid Stiffeners */}
        <mesh material={materials.solarFrame}>
          <boxGeometry args={[0.85, 0.28, 0.015]} />
        </mesh>
        {/* Articulated Solar Array Drive Gimbal Mount */}
        <mesh position={[-0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.graphiteFrame}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 16]} />
        </mesh>
      </group>

      {/* 3. Port Solar Array (Triple-panel Wing with Silver Frame) */}
      <group position={[-0.62, 0, 0]}>
        <mesh material={materials.solarCells}>
          <boxGeometry args={[0.82, 0.26, 0.025]} />
        </mesh>
        <mesh material={materials.solarFrame}>
          <boxGeometry args={[0.85, 0.28, 0.015]} />
        </mesh>
        <mesh position={[0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.graphiteFrame}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 16]} />
        </mesh>
      </group>

      {/* 4. High-Gain Parabolic Communications Dish (Cassegrain Antenna) */}
      <group position={[0, 0.24, 0.08]} rotation={[0.45, 0.25, 0]}>
        {/* Main Dish Reflector (Titanium Silver / White Aluminum) */}
        <mesh material={materials.antennaDish} castShadow>
          <cylinderGeometry args={[0.22, 0.03, 0.1, 24]} />
        </mesh>
        {/* Subreflector Feed Horn */}
        <mesh position={[0, 0.09, 0]} material={materials.goldFoil}>
          <cylinderGeometry args={[0.025, 0.01, 0.08, 12]} />
        </mesh>
        {/* Gimbal Pedestal Strut */}
        <mesh position={[0, -0.06, 0]} material={materials.graphiteFrame}>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
        </mesh>
      </group>

      {/* 5. Hydrazine Attitude Control Thruster Pod (Base Rocket Engine) */}
      <group position={[0, -0.19, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh material={materials.thrusterCopper}>
          <cylinderGeometry args={[0.07, 0.025, 0.12, 16]} />
        </mesh>
      </group>

      {/* 6. Active Avionics Communications Navigation Beacon (Pulsing Cyan Light) */}
      <pointLight ref={beaconRef} position={[0, 0.22, 0.28]} distance={3.5} color="#f0703f" />
      <mesh position={[0, 0.22, 0.28]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color="#f0703f" />
      </mesh>

      {/* 7. Dedicated Satellite Spot Fill Light (Guarantees silhouette separation against Earth and Space) */}
      <pointLight position={[0.5, 0.5, 0.5]} intensity={1.8} distance={2.5} color="#e0f2fe" />
    </group>
  )
}

function OrbitPath({ isLight }: { isLight: boolean }) {
  const points = useMemo(() => {
    const pts = []
    const radius = 3.8
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2
      const x = Math.cos(t) * radius
      const z = Math.sin(t) * radius
      const y = Math.sin(t * 1.4) * 0.95
      pts.push(new THREE.Vector3(x, y, z))
    }
    return pts
  }, [])

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])

  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: isLight ? '#c2410c' : '#f0703f',
            transparent: true,
            opacity: isLight ? 0.45 : 0.35,
          })
        )
      }
    />
  )
}

export function LandingHeroScene() {
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  return (
    <div className="absolute inset-0 select-none pointer-events-auto">
      <Canvas
        camera={{ position: [0, 1.2, 5.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Background Canvas: deep space navy in dark mode, light aerospace blue-gray in light mode */}
        <color attach="background" args={[isLight ? '#ebf2fa' : '#030712']} />

        {/* Dynamic Studio & Celestial Space Lighting Rig */}
        {isLight ? (
          <>
            <ambientLight intensity={1.2} color="#ffffff" />
            <directionalLight position={[12, 10, 8]} intensity={3.0} color="#ffffff" castShadow />
            <directionalLight position={[-10, -5, -6]} intensity={1.4} color="#94a3b8" />
            <directionalLight position={[0, 8, -4]} intensity={1.2} color="#cbd5e1" />
          </>
        ) : (
          <>
            <SpaceLighting
              sunPosition={[12, 6, 8]}
              intensity={3.2}
              ambientIntensity={0.35}
              rimColor="#38bdf8"
            />
            {/* Dedicated rim light pointing from below and opposite to pop metallic edge silhouettes */}
            <directionalLight position={[-8, -4, -6]} intensity={1.6} color="#0284c7" />
          </>
        )}

        {/* Ambient starfield (fainter in light mode, brilliant in dark mode) */}
        {!isLight && <SpaceEnvironment starsCount={4500} starsRadius={120} />}

        {/* Central Photorealistic Earth & Orbiting Detailed Satellite */}
        <group position={[0.8, -0.6, 0]} rotation={[0.2, 0, -0.15]}>
          <Earth radius={2.1} clouds atmosphere rotationSpeed={0.03} />
          <OrbitingSatellite isLight={isLight} />
          <OrbitPath isLight={isLight} />
        </group>

        {/* Interactive 360° camera orbit with smooth damping */}
        <OrbitControls
          enableZoom
          enablePan
          minDistance={2.5}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.3}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  )
}
