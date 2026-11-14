import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEarthTextures } from '@/three/utils/useEarthTextures'

interface EarthProps {
  radius?: number
  position?: [number, number, number]
  clouds?: boolean
  atmosphere?: boolean
  rotationSpeed?: number
}

export function Earth({
  radius = 2.0,
  position = [0, 0, 0],
  clouds = true,
  atmosphere = true,
  rotationSpeed = 0.05,
}: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)

  const textures = useEarthTextures()

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * rotationSpeed
    }
    if (cloudsRef.current) {
      // Clouds drift slightly faster than planet surface
      cloudsRef.current.rotation.y += delta * (rotationSpeed * 1.35)
      cloudsRef.current.rotation.x += delta * (rotationSpeed * 0.1)
    }
  })

  return (
    <group position={position}>
      {/* 1. Earth Surface (PBR with Continent / Ocean map) */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        {textures?.photographic ? (
          <meshPhongMaterial
            map={textures.day}
            specularMap={textures.specular ?? null}
            specular={new THREE.Color('#4a6a8a')}
            shininess={20}
          />
        ) : (
          <meshStandardMaterial key={textures ? 'textured' : 'plain'} map={textures?.day ?? null} color={textures ? '#ffffff' : '#1d3f63'} roughness={0.55} metalness={0.15} />
        )}
      </mesh>

      {/* 2. Atmospheric Cloud Layer (Drifting weather systems) */}
      {clouds && textures && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[radius * 1.018, 64, 64]} />
          <meshStandardMaterial
            map={textures.clouds}
            transparent
            opacity={textures.photographic ? 0.95 : 0.88}
            depthWrite={false}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* 3. Rayleigh Scattering Atmospheric Haze Shell */}
      {atmosphere && (
        <>
          {/* Inner atmospheric limb glow */}
          <mesh>
            <sphereGeometry args={[radius * 1.03, 48, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.16}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Outer high-altitude atmospheric gradient */}
          <mesh>
            <sphereGeometry args={[radius * 1.08, 48, 48]} />
            <meshBasicMaterial
              color="#0ea5e9"
              transparent
              opacity={0.08}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

