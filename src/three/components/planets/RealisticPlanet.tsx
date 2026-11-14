import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls as DreiOrbitControls } from '@react-three/drei'
import { Earth } from './Earth'
import { Moon } from './Moon'
import { Mars } from './Mars'
import { Sun } from './Sun'
import { SpaceLighting } from '@/three/lighting/SpaceLighting'

export type PlanetType = 'earth' | 'moon' | 'mars' | 'sun'

interface RealisticPlanetProps {
  type: PlanetType
  radius?: number
  position?: [number, number, number]
  rotationSpeed?: number
  atmosphere?: boolean
  clouds?: boolean
}

export function RealisticPlanet({
  type,
  radius,
  position = [0, 0, 0],
  rotationSpeed,
  atmosphere = true,
  clouds = true,
}: RealisticPlanetProps) {
  switch (type) {
    case 'moon':
      return <Moon radius={radius ?? 1.0} position={position} rotationSpeed={rotationSpeed} />
    case 'mars':
      return <Mars radius={radius ?? 1.2} position={position} atmosphere={atmosphere} rotationSpeed={rotationSpeed} />
    case 'sun':
      return <Sun radius={radius ?? 2.0} position={position} />
    case 'earth':
    default:
      return <Earth radius={radius ?? 1.4} position={position} atmosphere={atmosphere} clouds={clouds} rotationSpeed={rotationSpeed} />
  }
}

interface PlanetViewerProps {
  type: PlanetType
  size?: number | string
  className?: string
  interactive?: boolean
  autoRotate?: boolean
}

function PlanetOrbitControls({ autoRotate }: { autoRotate: boolean }) {
  const { gl } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const dom = gl.domElement
    const preventContextMenu = (e: MouseEvent) => e.preventDefault()
    dom.addEventListener('contextmenu', preventContextMenu)
    return () => dom.removeEventListener('contextmenu', preventContextMenu)
  }, [gl])

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enableZoom
      enablePan
      minDistance={1.6}
      maxDistance={6.5}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      dampingFactor={0.08}
      enableDamping
      makeDefault
    />
  )
}

export function Planet3DViewer({
  type,
  size = 140,
  className = '',
  interactive = true,
  autoRotate = true,
  sunPosition = [5, 3, 5],
  sunIntensity = 2.2,
}: PlanetViewerProps & { sunPosition?: [number, number, number]; sunIntensity?: number }) {
  const widthStyle = typeof size === 'number' ? `${size}px` : size
  const heightStyle = typeof size === 'number' ? `${size}px` : size

  return (
    <div
      className={`relative select-none rounded-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SpaceLighting
          sunPosition={sunPosition}
          intensity={sunIntensity}
          ambientIntensity={0.2}
        />
        <Suspense fallback={null}>
          <RealisticPlanet type={type} radius={1.15} />
        </Suspense>
        {interactive && <PlanetOrbitControls autoRotate={autoRotate} />}
      </Canvas>
    </div>
  )
}

