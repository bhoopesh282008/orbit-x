import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Earth } from '@/three/components/planets/Earth'
import { Moon } from '@/three/components/planets/Moon'
import { Mars } from '@/three/components/planets/Mars'
import { Sun } from '@/three/components/planets/Sun'
import { SpaceLighting } from '@/three/lighting/SpaceLighting'
import { SpaceEnvironment } from '@/three/environments/SpaceEnvironment'
import { UniversalCameraControls, CameraOverlayHUD } from '@/three/controls/UniversalCameraControls'

interface TrajectoryViewerProps {
  destination: string // 'Moon' | 'Earth Orbit' | 'Mars'
  transferProgress?: number // 0-100
}

function PlanetaryOrbitRing({ radius, color = '#6b7380', opacity = 0.25 }: { radius: number; color?: string; opacity?: number }) {
  const points = []
  for (let i = 0; i <= 100; i++) {
    const angle = (i / 100) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <primitive
      object={
        new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
          })
        )
      }
    />
  )
}

function TransferHohmannArc({ r1, r2, color = '#f0703f' }: { r1: number; r2: number; color?: string }) {
  const points = []
  // Elliptical transfer arc from r1 to r2
  const a = (r1 + r2) / 2
  const c = a - r1 // center offset of ellipse
  const b = Math.sqrt(Math.max(0.1, a * a - c * c)) // semi-minor axis

  for (let i = 0; i <= 60; i++) {
    const angle = (i / 60) * Math.PI // half ellipse from periapsis to apoapsis
    const x = -c + a * Math.cos(angle)
    const z = b * Math.sin(angle)
    const y = Math.sin(angle) * 0.4
    points.push(new THREE.Vector3(x, y, z))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <primitive
      object={
        new THREE.Line(
          geo,
          new THREE.LineDashedMaterial({
            color,
            dashSize: 0.3,
            gapSize: 0.15,
            linewidth: 2,
          })
        )
      }
    />
  )
}

function AnimatedTrajectorySpacecraft({ r1, r2 }: { r1: number; r2: number }) {
  const craftRef = useRef<THREE.Group>(null)

  const a = (r1 + r2) / 2
  const c = a - r1
  const b = Math.sqrt(Math.max(0.1, a * a - c * c))

  useFrame((state) => {
    const t = (state.clock.getElapsedTime() * 0.2) % Math.PI
    if (craftRef.current) {
      const x = -c + a * Math.cos(t)
      const z = b * Math.sin(t)
      const y = Math.sin(t) * 0.4
      craftRef.current.position.set(x, y, z)
      craftRef.current.rotation.y = -t
    }
  })

  return (
    <group ref={craftRef}>
      <mesh>
        <boxGeometry args={[0.22, 0.22, 0.32]} />
        <meshStandardMaterial color="#f0703f" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.02]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <mesh position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.02]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <pointLight color="#f0703f" intensity={1.2} distance={3} />
    </group>
  )
}

export function InterplanetaryTrajectoryViewer({ destination }: TrajectoryViewerProps) {
  const isMars = destination.toLowerCase().includes('mars')
  const isMoon = destination.toLowerCase().includes('moon') || destination.toLowerCase().includes('lunar')

  const [resetKey, setResetKey] = useState(0)
  const defaultPos: [number, number, number] = [0, 16, 18]

  // Scaled radii for visualization
  const earthRadiusFromSun = 6.0
  const targetRadiusFromSun = isMars ? 9.5 : earthRadiusFromSun + 1.8

  return (
    <div className="w-full h-full relative select-none rounded-xl overflow-hidden border border-white/10 bg-[#020511]">
      <Canvas
        key={resetKey}
        camera={{ position: defaultPos, fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#020511']} />
        <SpaceLighting
          sunPosition={[0, 4, 0]}
          intensity={3.0}
          ambientIntensity={0.2}
        />
        <SpaceEnvironment starsCount={4000} starsRadius={120} />

        {/* Central Sun */}
        <Sun radius={1.4} position={[0, 0, 0]} />

        {/* Earth Orbit & Body */}
        <PlanetaryOrbitRing radius={earthRadiusFromSun} color="#38bdf8" opacity={0.3} />
        <group position={[earthRadiusFromSun, 0, 0]}>
          <Earth radius={0.7} clouds={false} atmosphere rotationSpeed={0.05} />
          {/* Moon orbiting Earth if Lunar mission */}
          {isMoon && (
            <group position={[1.4, 0, 0]}>
              <Moon radius={0.28} />
              <PlanetaryOrbitRing radius={1.4} color="#cbd5e1" opacity={0.4} />
            </group>
          )}
        </group>

        {/* Mars Orbit & Body */}
        {isMars && (
          <>
            <PlanetaryOrbitRing radius={targetRadiusFromSun} color="#ef4444" opacity={0.3} />
            <group position={[-targetRadiusFromSun * 0.7, 0, targetRadiusFromSun * 0.7]}>
              <Mars radius={0.55} atmosphere rotationSpeed={0.04} />
            </group>
          </>
        )}

        {/* Hohmann Transfer Trajectory Arc */}
        <TransferHohmannArc
          r1={earthRadiusFromSun}
          r2={isMars ? targetRadiusFromSun : earthRadiusFromSun + 1.4}
          color="#f0703f"
        />

        {/* Animated Spacecraft along trajectory */}
        <AnimatedTrajectorySpacecraft
          r1={earthRadiusFromSun}
          r2={isMars ? targetRadiusFromSun : earthRadiusFromSun + 1.4}
        />

        <UniversalCameraControls
          defaultPosition={defaultPos}
          defaultTarget={[earthRadiusFromSun / 2, 0, 0]}
          minDistance={4}
          maxDistance={50}
          enablePan
          enableZoom
          enableRotate
        />
      </Canvas>

      <CameraOverlayHUD
        onReset={() => setResetKey((k) => k + 1)}
        showPresets
        hintText="360° ORBITAL VIEW: DRAG • ZOOM: SCROLL • PAN: RIGHT-DRAG • PRESETS: 1-4"
      />

      <div className="absolute top-3 left-3 bg-bg-panel/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
        <span className="text-text-muted">Trajectory Plan Vector: </span>
        <span className="text-accent-cyan font-bold">Earth &rarr; {destination}</span>
      </div>

      <div className="absolute top-3 right-3 text-right text-[10px] font-mono text-text-muted bg-bg-panel/80 px-2 py-1 rounded border border-white/5 pointer-events-none">
        Coplanar Two-Body Astrodynamics
      </div>
    </div>
  )
}

