import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createMoonTexture } from '@/three/utils/textureGenerators'

interface MoonProps {
  radius?: number
  position?: [number, number, number]
  rotationSpeed?: number
}

// Photographic lunar map shipped with the three.js examples (derived from NASA imagery)
const MOON_TEXTURE_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg'
let cached: Promise<THREE.Texture> | null = null

function loadMoonTexture() {
  if (!cached) {
    cached = new Promise<THREE.Texture>((resolve) => {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        MOON_TEXTURE_URL,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = 8
          resolve(tex)
        },
        undefined,
        () => resolve(createMoonTexture(1024, 512)) // offline fallback
      )
    })
  }
  return cached
}

export function Moon({ radius = 0.8, position = [0, 0, 0], rotationSpeed = 0.02 }: MoonProps) {
  const moonRef = useRef<THREE.Mesh>(null)
  const [map, setMap] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let alive = true
    loadMoonTexture().then((t) => alive && setMap(t))
    return () => {
      alive = false
    }
  }, [])

  useFrame((_, delta) => {
    if (moonRef.current) moonRef.current.rotation.y += delta * rotationSpeed
  })

  return (
    <group position={position}>
      <mesh ref={moonRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        {/* Remount when the map arrives so the shader is rebuilt with texture support */}
        <meshStandardMaterial
          key={map ? 'textured' : 'plain'}
          map={map}
          bumpMap={map}
          bumpScale={2.2}
          color={map ? '#eef1f5' : '#8b8f96'}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  )
}
