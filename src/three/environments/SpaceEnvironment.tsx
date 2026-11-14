import { Stars } from '@react-three/drei'

interface SpaceEnvironmentProps {
  starsCount?: number
  starsRadius?: number
}

export function SpaceEnvironment({
  starsCount = 4000,
  starsRadius = 150,
}: SpaceEnvironmentProps) {
  return (
    <>
      {/* Primary high-density deep starfield */}
      <Stars
        radius={starsRadius}
        depth={60}
        count={starsCount}
        factor={4.5}
        saturation={0.2}
        fade
        speed={0.4}
      />

      {/* Secondary large background anchor stars */}
      <Stars
        radius={starsRadius * 1.5}
        depth={100}
        count={Math.floor(starsCount * 0.35)}
        factor={7}
        saturation={0.5}
        fade
        speed={0.1}
      />
    </>
  )
}

