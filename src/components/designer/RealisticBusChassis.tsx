import { useMemo } from 'react'
import {
  AEROSPACE_PALETTE,
  createTitaniumPanelTexture,
  createGoldMLIFoilTexture,
} from '@/three/utils/aerospaceMaterials'

interface RealisticBusChassisProps {
  busRadius: number
  busHeight: number
  hasSmallBus: boolean
  hasMediumBus: boolean
  hasHeavyBus: boolean
}

export function RealisticBusChassis({
  busRadius,
  busHeight,
}: RealisticBusChassisProps) {
  const panelTexture = useMemo(() => createTitaniumPanelTexture(), [])
  const mliTexture = useMemo(() => createGoldMLIFoilTexture(), [])

  // 8 faceted side panels for hexagonal/octagonal aerospace satellite bus
  const facetCount = 8
  const facetAngle = (Math.PI * 2) / facetCount
  const panelWidth = 2 * busRadius * Math.sin(Math.PI / facetCount) * 0.94

  return (
    <group>
      {/* 1. Core Structural Inner Barrel (Brushed Aerospace Titanium / Aluminum) */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[busRadius * 0.95, busRadius * 0.98, busHeight, 32]} />
        <meshStandardMaterial
          color={AEROSPACE_PALETTE.busTitanium}
          roughness={0.28}
          metalness={0.85}
          bumpMap={panelTexture}
          bumpScale={0.03}
        />
      </mesh>

      {/* 2. Individual Faceted Exterior Equipment Panels with Beveled Frames */}
      {Array.from({ length: facetCount }).map((_, i) => {
        const angle = i * facetAngle
        const panelR = busRadius * 0.99
        const isMLIPanel = i === 1 || i === 2 || i === 5 || i === 6 // alternating MLI thermal blankets vs titanium equipment bays
        return (
          <group
            key={i}
            position={[Math.sin(angle) * panelR, 0, Math.cos(angle) * panelR]}
            rotation={[0, angle, 0]}
          >
            {/* Main Outer Panel Plate */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[panelWidth, busHeight * 0.88, 0.04]} />
              {isMLIPanel ? (
                // Radiant Gold Multi-Layer Insulation Blanket (#C69A45)
                <meshStandardMaterial
                  map={mliTexture}
                  color={AEROSPACE_PALETTE.goldMLIFoil}
                  roughness={0.3}
                  metalness={0.88}
                  bumpMap={mliTexture}
                  bumpScale={0.06}
                />
              ) : (
                // Light Aerospace Titanium Plate with machined seams (#BFCBD6)
                <meshStandardMaterial
                  map={panelTexture}
                  color={AEROSPACE_PALETTE.busTitanium}
                  roughness={0.24}
                  metalness={0.85}
                  bumpMap={panelTexture}
                  bumpScale={0.04}
                />
              )}
            </mesh>

            {/* Perimeter Beveled Structural Retention Frame */}
            <mesh position={[0, 0, 0.025]}>
              <boxGeometry args={[panelWidth * 1.02, busHeight * 0.9, 0.015]} />
              <meshStandardMaterial
                color={AEROSPACE_PALETTE.busSeam}
                roughness={0.35}
                metalness={0.85}
              />
            </mesh>

            {/* Corner Fastener Studs */}
            {[-1, 1].map((cx) =>
              [-1, 1].map((cy) => (
                <mesh
                  key={`${cx}-${cy}`}
                  position={[cx * (panelWidth * 0.44), cy * (busHeight * 0.4), 0.035]}
                >
                  <cylinderGeometry args={[0.015, 0.015, 0.02, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                </mesh>
              ))
            )}
          </group>
        )
      })}

      {/* 3. Upper Avionics Equipment Deck (Titanium Deck Plate with Machined Radial Ribs) */}
      <group position={[0, busHeight / 2 + 0.02, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[busRadius * 1.02, busRadius * 1.04, 0.06, 32]} />
          <meshStandardMaterial
            color={AEROSPACE_PALETTE.busHatch}
            roughness={0.22}
            metalness={0.9}
          />
        </mesh>
        {/* Recessed Center Equipment Bay */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[busRadius * 0.7, busRadius * 0.72, 0.04, 32]} />
          <meshStandardMaterial color={AEROSPACE_PALETTE.busTitanium} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Deck Mounting Hardpoints / Fasteners */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4
          const r = busRadius * 0.88
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.045, Math.sin(a) * r]}>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.95} />
            </mesh>
          )
        })}
      </group>

      {/* 4. Lower Propulsion / Adapter Ring (Launch Vehicle Separation Ring) */}
      <group position={[0, -busHeight / 2 - 0.02, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[busRadius * 1.04, busRadius * 1.06, 0.08, 32]} />
          <meshStandardMaterial
            color={AEROSPACE_PALETTE.engineMountTitanium}
            roughness={0.25}
            metalness={0.88}
          />
        </mesh>
        {/* Separation Mechanism Clampband Ring (Copper-Bronze Details) */}
        <mesh position={[0, -0.045, 0]}>
          <cylinderGeometry args={[busRadius * 1.08, busRadius * 1.08, 0.03, 32]} />
          <meshStandardMaterial color={AEROSPACE_PALETTE.engineCopper} metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* 5. Four Corner Structural Longerons (Truss Ribs extending vertically) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 8
        const r = busRadius * 1.02
        return (
          <group
            key={i}
            position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
            rotation={[0, -angle, 0]}
          >
            {/* Vertical Aerospace Extrusion Rail */}
            <mesh castShadow>
              <boxGeometry args={[0.05, busHeight * 1.02, 0.05]} />
              <meshStandardMaterial
                color={AEROSPACE_PALETTE.busHatch}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
            {/* Structural Gusset Brackets */}
            <mesh position={[0, busHeight * 0.42, -0.03]}>
              <boxGeometry args={[0.04, 0.08, 0.06]} />
              <meshStandardMaterial color={AEROSPACE_PALETTE.busSeam} metalness={0.9} />
            </mesh>
            <mesh position={[0, -busHeight * 0.42, -0.03]}>
              <boxGeometry args={[0.04, 0.08, 0.06]} />
              <meshStandardMaterial color={AEROSPACE_PALETTE.busSeam} metalness={0.9} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
