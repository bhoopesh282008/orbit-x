import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpaceLighting } from '@/three/lighting/SpaceLighting'
import { UniversalCameraControls, CameraOverlayHUD } from '@/three/controls/UniversalCameraControls'
import { CAMERA_CONFIGS } from '@/three/controls/cameraConfig'

interface RocketProps {
  vehicleId: string
  rotationSpeed?: number
}

export function RocketMesh({ vehicleId, rotationSpeed = 0.05 }: RocketProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    // Subtle idle drift, smoothly overridden by user manual orbit controls
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed
    }
  })

  const isLight = vehicleId === 'orbit-x-light'
  const isHeavy = vehicleId === 'orbit-x-heavy'
  const isDeepSpace = vehicleId === 'orbit-x-deep-space'

  // Dimensions
  const coreRadius = isLight ? 0.28 : isHeavy ? 0.36 : 0.48
  const coreHeight = isLight ? 3.2 : isHeavy ? 4.0 : 4.8
  const fairingRadius = coreRadius * 1.08
  const fairingHeight = isLight ? 0.9 : isHeavy ? 1.3 : 1.6

  // Materials
  const coreColor = isDeepSpace ? '#c25e1a' : '#f8fafc' // SLS orange thermal foam vs Falcon/Vulcan white
  const metalness = isDeepSpace ? 0.3 : 0.75
  const roughness = isDeepSpace ? 0.6 : 0.25

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      {/* 1. Main Core Stage Cylinder */}
      <mesh position={[0, coreHeight * 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[coreRadius, coreRadius, coreHeight, 32]} />
        <meshStandardMaterial
          color={coreColor}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>

      {/* Interstage Ring (Black Carbon Composite / Titanium) */}
      <mesh position={[0, coreHeight * 0.65, 0]}>
        <cylinderGeometry args={[coreRadius * 1.02, coreRadius * 1.02, 0.25, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* External Fuel / Avionics Raceways (linear conduits) */}
      <mesh position={[coreRadius + 0.02, coreHeight * 0.4, 0]}>
        <boxGeometry args={[0.04, coreHeight * 0.85, 0.04]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-coreRadius - 0.02, coreHeight * 0.4, 0]}>
        <boxGeometry args={[0.04, coreHeight * 0.85, 0.04]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 2. Payload Fairing Assembly (Upper Stage Cone) */}
      <group position={[0, coreHeight * 0.9 + fairingHeight * 0.5, 0]}>
        {/* Fairing Ogive Nosecone */}
        <mesh castShadow>
          <cylinderGeometry args={[0.02, fairingRadius, fairingHeight, 32]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Fairing base band */}
        <mesh position={[0, -fairingHeight * 0.48, 0]}>
          <cylinderGeometry args={[fairingRadius * 1.01, fairingRadius * 1.01, 0.1, 32]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* 3. First Stage Engine Cluster (Nozzles at base) */}
      <group position={[0, -coreHeight * 0.1, 0]}>
        {isLight && (
          // Single powerful center engine bell
          <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0]}>
            <coneGeometry args={[0.22, 0.45, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.15} />
          </mesh>
        )}

        {(isHeavy || isDeepSpace) && (
          // Multi-engine cluster
          <>
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0]}>
              <coneGeometry args={[coreRadius * 0.4, 0.45, 16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.1} />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
              const ang = (i * Math.PI) / 2
              const r = coreRadius * 0.55
              return (
                <mesh
                  key={i}
                  rotation={[Math.PI, 0, 0]}
                  position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}
                >
                  <coneGeometry args={[coreRadius * 0.32, 0.42, 16]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.1} />
                </mesh>
              )
            })}
          </>
        )}

        {/* Engine Glow Flame Effect */}
        <mesh position={[0, -0.32, 0]}>
          <coneGeometry args={[coreRadius * 0.5, 0.7, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* 4. Side Strapped Boosters (For Heavy and Deep Space) */}
      {(isHeavy || isDeepSpace) && (
        <>
          {/* Booster 1 (Right) */}
          <group position={[coreRadius * 1.85, coreHeight * 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[coreRadius * 0.75, coreRadius * 0.75, coreHeight * 0.75, 24]} />
              <meshStandardMaterial
                color={isDeepSpace ? '#f8fafc' : '#e2e8f0'}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            {/* Aerodynamic Nosecone */}
            <mesh position={[0, (coreHeight * 0.75) / 2 + 0.35, 0]}>
              <cylinderGeometry args={[0.02, coreRadius * 0.75, 0.7, 24]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Booster Nozzle */}
            <mesh position={[0, -(coreHeight * 0.75) / 2 - 0.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[coreRadius * 0.5, 0.4, 16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>

          {/* Booster 2 (Left) */}
          <group position={[-coreRadius * 1.85, coreHeight * 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[coreRadius * 0.75, coreRadius * 0.75, coreHeight * 0.75, 24]} />
              <meshStandardMaterial
                color={isDeepSpace ? '#f8fafc' : '#e2e8f0'}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            {/* Aerodynamic Nosecone */}
            <mesh position={[0, (coreHeight * 0.75) / 2 + 0.35, 0]}>
              <cylinderGeometry args={[0.02, coreRadius * 0.75, 0.7, 24]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Booster Nozzle */}
            <mesh position={[0, -(coreHeight * 0.75) / 2 - 0.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[coreRadius * 0.5, 0.4, 16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </>
      )}

      {/* 5. Aerodynamic Base Grid Fins */}
      <group position={[0, coreHeight * 0.05, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const ang = (i * Math.PI) / 2
          const r = coreRadius + 0.12
          return (
            <mesh
              key={i}
              position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}
              rotation={[0, -ang, 0]}
            >
              <boxGeometry args={[0.22, 0.28, 0.02]} />
              <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

interface Rocket3DViewerProps {
  vehicleId: string
  className?: string
}

export function Rocket3DViewer({ vehicleId, className = '' }: Rocket3DViewerProps) {
  const [resetKey, setResetKey] = useState(0)
  const config = CAMERA_CONFIGS.rocket

  return (
    <div className={`w-full h-full relative select-none ${className}`}>
      <Canvas
        key={resetKey}
        camera={{ position: config.defaultPosition, fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SpaceLighting
          sunPosition={[6, 8, 5]}
          intensity={2.2}
          ambientIntensity={0.25}
          rimColor="#38bdf8"
        />
        <RocketMesh vehicleId={vehicleId} />
        <UniversalCameraControls
          defaultPosition={config.defaultPosition}
          defaultTarget={config.defaultTarget}
          minDistance={config.minDistance}
          maxDistance={config.maxDistance}
          minPolarAngle={config.minPolarAngle}
          maxPolarAngle={config.maxPolarAngle}
          enablePan
          enableZoom
          enableRotate
        />
      </Canvas>
      <CameraOverlayHUD
        onReset={() => setResetKey((k) => k + 1)}
        showPresets
        hintText="360° ROCKET INSPECTION • DRAG: ORBIT • WHEEL: ZOOM • PRESETS: 1-5"
      />
    </div>
  )
}

