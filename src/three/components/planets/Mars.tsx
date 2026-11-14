import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createMarsTexture } from '@/three/utils/textureGenerators'

interface MarsProps {
  radius?: number
  position?: [number, number, number]
  atmosphere?: boolean
  rotationSpeed?: number
}

export function Mars({
  radius = 1.2,
  position = [0, 0, 0],
  atmosphere = true,
  rotationSpeed = 0.04,
}: MarsProps) {
  const marsRef = useRef<THREE.Mesh>(null)
  const marsTexture = useMemo(() => createMarsTexture(1024, 512), [])

  useFrame((_, delta) => {
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <group position={position}>
      {/* 1. Mars Rocky / Regolith Surface */}
      <mesh ref={marsRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={marsTexture}
          roughness={0.88}
          metalness={0.12}
        />
      </mesh>

      {/* 2. Thin Martian Dusty Atmosphere Haze */}
      {atmosphere && (
        <mesh>
          <sphereGeometry args={[radius * 1.025, 48, 48]} />
          <meshBasicMaterial
            color="#fb923c"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}

