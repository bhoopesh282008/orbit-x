import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SunProps {
  radius?: number
  position?: [number, number, number]
}

export function Sun({
  radius = 3.0,
  position = [0, 0, 0],
}: SunProps) {
  const coronaRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (coronaRef.current) {
      coronaRef.current.rotation.z += delta * 0.05
    }
  })

  return (
    <group position={position}>
      {/* Intense solar core */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#fffbeb" />
      </mesh>

      {/* Radiant inner corona */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[radius * 1.15, 32, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Radiant outer halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Omnidirectional point light radiating from the sun */}
      <pointLight intensity={3.5} distance={200} decay={1.5} color="#fffbeb" />
    </group>
  )
}

