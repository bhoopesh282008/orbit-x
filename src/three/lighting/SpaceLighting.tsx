interface SpaceLightingProps {
  sunPosition?: [number, number, number]
  intensity?: number
  ambientIntensity?: number
  rimColor?: string
}

export function SpaceLighting({
  sunPosition = [15, 8, 12],
  intensity = 2.4,
  ambientIntensity = 0.15,
  rimColor = '#38bdf8',
}: SpaceLightingProps) {
  return (
    <>
      {/* Deep space ambient darkness with very slight blue hue */}
      <ambientLight intensity={ambientIntensity} color="#0d1b2a" />

      {/* Main direct solar ray */}
      <directionalLight
        position={sunPosition}
        intensity={intensity}
        color="#fffbf0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />

      {/* Opposite soft secondary rim / earthshine / albedo bounce */}
      <directionalLight
        position={[-sunPosition[0] * 0.7, -sunPosition[1] * 0.5, -sunPosition[2] * 0.7]}
        intensity={0.35}
        color={rimColor}
      />
    </>
  )
}

