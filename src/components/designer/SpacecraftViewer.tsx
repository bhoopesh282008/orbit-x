import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SpacecraftComponent } from '@/stores/spacecraftStore'
import { SpaceEnvironment } from '@/three/environments/SpaceEnvironment'
import { RealisticBusChassis } from './RealisticBusChassis'
import { AEROSPACE_PALETTE } from '@/three/utils/aerospaceMaterials'
import { UniversalCameraControls, CameraOverlayHUD } from '@/three/controls/UniversalCameraControls'
import { CAMERA_CONFIGS } from '@/three/controls/cameraConfig'

interface SpacecraftSceneProps {
  components: SpacecraftComponent[]
  onSelectComponent?: (component: SpacecraftComponent | null) => void
  selectedComponentId?: string | null
  pureWhiteBackground?: boolean
}

function SpacecraftMesh({ components }: { components: SpacecraftComponent[] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Gentle procedural rotation in idle view
  useFrame((_, delta) => {
    // Only very subtle micro-drift when idle, but static when user actively orbits
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03
    }
  })

  // Detect installed modules
  const hasSmallBus = components.some((c) => c.id === 'bus-small')
  const hasMediumBus = components.some((c) => c.id === 'bus-medium')
  const hasHeavyBus = components.some((c) => c.id === 'bus-heavy')
  const hasBus = hasSmallBus || hasMediumBus || hasHeavyBus

  const hasPropulsion = components.some((c) => c.category === 'propulsion')
  const hasChemical = components.some((c) => c.id === 'prop-chemical')
  const hasIon = components.some((c) => c.id === 'prop-ion' || c.id === 'prop-electric')

  const hasFuel = components.some((c) => c.category === 'fuel')
  const hasLargeFuel = components.some((c) => c.id === 'fuel-large')

  const hasSolar = components.some((c) => c.category === 'power')
  const hasWings = components.some((c) => c.id === 'power-medium' || c.id === 'power-high')
  const hasUltraflex = components.some((c) => c.id === 'power-high')

  const hasBattery = components.some((c) => c.category === 'energy')

  const hasComm = components.some((c) => c.category === 'communication')
  const hasHighGainDish = components.some((c) => c.id === 'comm-high' || c.id === 'comm-deep')

  const hasCamera = components.some((c) => c.id === 'inst-camera')
  const hasSpectrometer = components.some((c) => c.id === 'inst-spectrometer')
  const hasMagnetometer = components.some((c) => c.id === 'inst-magnetometer')
  const hasRadar = components.some((c) => c.id === 'inst-radar')

  // Bus sizing based on selection
  const busHeight = hasHeavyBus ? 2.6 : hasMediumBus ? 1.8 : 1.2
  const busRadius = hasHeavyBus ? 0.9 : hasMediumBus ? 0.7 : 0.55

  return (
    <group ref={groupRef}>
      {/* 1. Main Spacecraft Bus Chassis (High-Contrast Titanium / Gold MLI Aerospace Structure) */}
      {hasBus ? (
        <RealisticBusChassis
          busRadius={busRadius}
          busHeight={busHeight}
          hasSmallBus={hasSmallBus}
          hasMediumBus={hasMediumBus}
          hasHeavyBus={hasHeavyBus}
        />
      ) : (
        /* Holographic Wireframe Ghost when no bus selected */
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.4, 8]} />
          <meshBasicMaterial color="#6b7380" wireframe opacity={0.35} transparent />
        </mesh>
      )}

      {/* 2. Propellant Tanks (Titanium spherical pressure vessels - light aluminum with titanium ribs) */}
      {hasFuel && (
        <group position={[0, 0, 0]}>
          {/* Starboard and Port Tanks */}
          <mesh position={[busRadius * 0.65, 0, 0]} castShadow>
            <sphereGeometry args={[hasLargeFuel ? 0.42 : 0.28, 24, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.fuelTankAluminum} metalness={0.88} roughness={0.18} />
          </mesh>
          <mesh position={[-busRadius * 0.65, 0, 0]} castShadow>
            <sphereGeometry args={[hasLargeFuel ? 0.42 : 0.28, 24, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.fuelTankAluminum} metalness={0.88} roughness={0.18} />
          </mesh>

          {/* Manifold Fuel Feed Tubing */}
          <mesh position={[0, -busHeight * 0.25, 0]}>
            <cylinderGeometry args={[0.02, 0.02, busRadius * 1.3, 8]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.fuelFeedLine} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* 3. Propulsion Thruster Rocket Engine Bell (Bottom Assembly - Stainless Steel & Heat Copper) */}
      {hasPropulsion && (
        <group position={[0, -busHeight / 2 - 0.25, 0]}>
          {/* Gimbal Mount Structural Ring */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 16]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.engineGimbalRing} metalness={0.9} />
          </mesh>

          {/* Main Thruster Expansion Nozzle Bell */}
          <mesh rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[hasChemical ? 0.48 : 0.28, 0.55, 24]} />
            <meshStandardMaterial
              color={hasIon ? '#06b6d4' : AEROSPACE_PALETTE.engineSteel}
              metalness={0.92}
              roughness={0.22}
            />
          </mesh>

          {/* Nozzle heat discoloration ring - Copper / Bronze detail */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[hasChemical ? 0.44 : 0.26, hasChemical ? 0.46 : 0.27, 0.05, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.engineCopper} metalness={0.9} roughness={0.25} />
          </mesh>

          {/* Ion engine blue plasma emitter glow */}
          {hasIon && (
            <group position={[0, -0.3, 0]}>
              <mesh>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} />
              </mesh>
              <pointLight color="#22d3ee" intensity={1.5} distance={3} />
            </group>
          )}

          {/* Chemical engine hypergolic igniter tip */}
          {hasChemical && (
            <mesh position={[0, -0.28, 0]}>
              <coneGeometry args={[0.12, 0.2, 16]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.5} />
            </mesh>
          )}
        </group>
      )}

      {/* 4. Solar Wings & Power Generation Arrays - Deep Photovoltaic Blue with Silver Frames */}
      {hasSolar && (
        <group position={[0, 0.1, 0]}>
          {hasUltraflex ? (
            /* Circular UltraFlex Arrays (Orion / Mars Lander style) */
            <>
              {/* Starboard UltraFlex Disk */}
              <group position={[busRadius + 1.25, 0, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.95, 0.95, 0.03, 32]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Radial Structural Ribs */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
                    <boxGeometry args={[1.9, 0.02, 0.04]} />
                    <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} />
                  </mesh>
                ))}
                {/* Deployment Booms */}
                <mesh position={[-0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.02, 1.3, 8]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarGimbalJoint} metalness={0.9} />
                </mesh>
              </group>

              {/* Port UltraFlex Disk */}
              <group position={[-busRadius - 1.25, 0, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.95, 0.95, 0.03, 32]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.2} />
                </mesh>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
                    <boxGeometry args={[1.9, 0.02, 0.04]} />
                    <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} />
                  </mesh>
                ))}
                <mesh position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.02, 1.3, 8]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarGimbalJoint} metalness={0.9} />
                </mesh>
              </group>
            </>
          ) : hasWings ? (
            /* Articulated Rectangular Solar Wings */
            <>
              {/* Starboard Wing */}
              <group position={[busRadius + 0.15, 0, 0]}>
                <mesh position={[0.85, 0, 0]}>
                  <boxGeometry args={[1.7, 0.7, 0.03]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Solar Cell Grid Lines */}
                <mesh position={[0.85, 0, 0]}>
                  <boxGeometry args={[1.72, 0.72, 0.02]} />
                  <meshBasicMaterial color={AEROSPACE_PALETTE.solarCellGrid} wireframe />
                </mesh>
                {/* Perimeter Frame */}
                <mesh position={[0.85, 0, 0]}>
                  <boxGeometry args={[1.74, 0.74, 0.015]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Root Gimbal Joint */}
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.25, 12]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarGimbalJoint} metalness={0.95} />
                </mesh>
              </group>

              {/* Port Wing */}
              <group position={[-busRadius - 0.15, 0, 0]}>
                <mesh position={[-0.85, 0, 0]}>
                  <boxGeometry args={[1.7, 0.7, 0.03]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[-0.85, 0, 0]}>
                  <boxGeometry args={[1.72, 0.72, 0.02]} />
                  <meshBasicMaterial color={AEROSPACE_PALETTE.solarCellGrid} wireframe />
                </mesh>
                {/* Perimeter Frame */}
                <mesh position={[-0.85, 0, 0]}>
                  <boxGeometry args={[1.74, 0.74, 0.015]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarFrameSilver} metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.25, 12]} />
                  <meshStandardMaterial color={AEROSPACE_PALETTE.solarGimbalJoint} metalness={0.95} />
                </mesh>
              </group>
            </>
          ) : (
            /* Body Mounted Solar Panels */
            <mesh position={[0, 0, busRadius + 0.03]}>
              <boxGeometry args={[0.55, 0.85, 0.02]} />
              <meshStandardMaterial color={AEROSPACE_PALETTE.solarCellBlue} metalness={0.85} roughness={0.2} />
            </mesh>
          )}
        </group>
      )}

      {/* 5. Battery Unit (Li-ion battery power pack) */}
      {hasBattery && (
        <group position={[0, -0.2, -busRadius - 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.48, 0.14]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.batteryHousing} metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Thermal heat sink radiator fins */}
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[0.38, 0.42, 0.02]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.batteryHeatSink} metalness={0.95} roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* 6. Communication Dish / High Gain Antenna - Metallic Aluminum & Feed Horn */}
      {hasComm && (
        <group position={[0, busHeight / 2 + 0.12, 0]}>
          {hasHighGainDish ? (
            /* Parabolic Cassegrain Deep Space Dish */
            <group position={[0, 0.28, 0]} rotation={[0.4, 0.3, 0]}>
              {/* Main Parabolic Reflector */}
              <mesh castShadow>
                <cylinderGeometry args={[0.62, 0.06, 0.22, 32]} />
                <meshStandardMaterial color={AEROSPACE_PALETTE.antennaDish} metalness={0.92} roughness={0.18} />
              </mesh>
              {/* Central Feed Horn Mast */}
              <mesh position={[0, 0.24, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
                <meshStandardMaterial color={AEROSPACE_PALETTE.antennaFeedHorn} metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Subreflector Tip */}
              <mesh position={[0, 0.38, 0]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial color={AEROSPACE_PALETTE.antennaSubreflectorGold} metalness={0.95} roughness={0.1} />
              </mesh>
            </group>
          ) : (
            /* Omnidirectional Low Gain Whip Antenna */
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.015, 0.025, 0.7, 8]} />
              <meshStandardMaterial color={AEROSPACE_PALETTE.antennaWhip} metalness={0.92} />
            </mesh>
          )}
        </group>
      )}

      {/* 7. Scientific Payloads & Instruments */}
      {/* High-Resolution Optical Camera */}
      {hasCamera && (
        <group position={[0, -0.28, busRadius + 0.14]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.32, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.cameraHousing} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Optical Trim Ring */}
          <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.015, 12, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.cameraTrimSilver} metalness={0.95} />
          </mesh>
          {/* Sapphire Optical Aperture Lens */}
          <mesh position={[0, 0, 0.17]}>
            <circleGeometry args={[0.14, 24]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.cameraLensAperture} metalness={1} roughness={0.02} />
          </mesh>
        </group>
      )}

      {/* Multispectral Spectrometer */}
      {hasSpectrometer && (
        <group position={[busRadius * 0.55, 0.32, busRadius + 0.09]}>
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.24, 0.22]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.spectrometerHousing} metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Detector Slit */}
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.16, 0.04, 0.02]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      )}

      {/* Magnetometer Deployable Lattice Boom */}
      {hasMagnetometer && (
        <group position={[0, busHeight * 0.35, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 2.6, 8]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.magnetometerBoom} metalness={0.9} />
          </mesh>
          {/* Sensor Pod at Tip */}
          <mesh position={[0, 2.65, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.sensorPodRed} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* Subsurface Radar Dipole Antenna */}
      {hasRadar && (
        <group position={[0, -busHeight / 2 - 0.12, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 2.2, 8]} />
            <meshStandardMaterial color={AEROSPACE_PALETTE.radarDipoleGold} metalness={0.95} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export function SpacecraftViewer({ components, pureWhiteBackground = false }: SpacecraftSceneProps) {
  const [resetKey, setResetKey] = useState(0)
  const config = CAMERA_CONFIGS.spacecraft

  const handleReset = () => {
    setResetKey((prev) => prev + 1)
  }

  return (
    <div
      className={`w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden border border-white/[0.07] ${
        pureWhiteBackground
          ? 'bg-[radial-gradient(ellipse_at_50%_40%,var(--bg-elevated)_0%,var(--bg-panel)_55%,var(--bg-secondary)_100%)]'
          : 'bg-gradient-to-b from-[#030712] via-[#081028] to-[#040816]'
      }`}
    >
      {pureWhiteBackground && (
        <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-80 [mask-image:radial-gradient(ellipse_at_50%_55%,#000_10%,transparent_70%)]" aria-hidden />
      )}
      <Canvas
        key={resetKey}
        camera={{ position: config.defaultPosition, fov: 42 }}
        shadows
        gl={{ antialias: true, alpha: pureWhiteBackground }}
      >
        {!pureWhiteBackground && <color attach="background" args={['#040817']} />}

        {/* Photorealistic Spacecraft Lighting Rig */}
        {pureWhiteBackground ? (
          <>
            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight
              position={[6, 8, 5]}
              intensity={2.8}
              color="#ffffff"
              castShadow
            />
            <directionalLight
              position={[-6, 4, -5]}
              intensity={1.4}
              color="#94a3b8"
            />
            <directionalLight
              position={[0, -6, 2]}
              intensity={1.2}
              color="#cbd5e1"
            />
            <directionalLight
              position={[0, 6, -4]}
              intensity={1.0}
              color="#e2e8f0"
            />
            <pointLight position={[3, 3, 3]} intensity={0.8} color="#ffffff" distance={10} />
          </>
        ) : (
          <>
            <ambientLight intensity={0.55} color="#e0f2fe" />
            <directionalLight
              position={[6, 8, 5]}
              intensity={3.2}
              color="#ffffff"
              castShadow
            />
            <directionalLight
              position={[-6, 4, -5]}
              intensity={1.6}
              color="#94a3b8"
            />
            <directionalLight
              position={[0, -6, 2]}
              intensity={1.4}
              color="#cbd5e1"
            />
            <directionalLight
              position={[0, 6, -4]}
              intensity={1.2}
              color="#e2e8f0"
            />
            <pointLight position={[3, 3, 3]} intensity={1.0} color="#f8fafc" distance={10} />
            <pointLight position={[-3, -2, -3]} intensity={0.8} color="#cbd5e1" distance={8} />
          </>
        )}

        {/* Deep space environment (only rendered when not in pure white workstation mode) */}
        {!pureWhiteBackground && <SpaceEnvironment starsCount={3000} starsRadius={100} />}

        {/* Dynamic 3D Spacecraft Component Mesh */}
        <SpacecraftMesh components={components} />

        {/* Universal 360° Camera Controls with smooth damping, zoom & pan */}
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

      {/* Interactive HUD Overlay for 3D Viewport with Presets and Reset */}
      <CameraOverlayHUD
        onReset={handleReset}
        showPresets
        hintText="Drag to orbit · Scroll to zoom · Right-drag to pan · Keys 1–5 for presets"
      />

      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none rounded-lg border border-white/[0.08] bg-bg-primary/60 px-2.5 py-1 backdrop-blur-md">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-status-success" />
        <span className="font-mono text-[10.5px] text-text-secondary">
          Inspection bay · {components.length} module{components.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
