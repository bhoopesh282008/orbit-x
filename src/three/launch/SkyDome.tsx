import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphicsProfile } from '@/hooks/useGraphicsProfile'
import { EARTH_CENTER, EARTH_RADIUS_U, METERS_PER_UNIT, SUN_DIRECTION, launchFrame } from './launchFrame'

/**
 * Altitude-aware sky: daylight Rayleigh blue at the pad, darkening through
 * the stratosphere to black space with a thin blue limb at the horizon.
 * The dome follows the camera and is drawn first without depth so it never
 * clips against the real-scale Earth.
 */
export function SkyDome() {
  const { camera, scene } = useThree()
  const skyRef = useRef<THREE.Mesh>(null)
  const starsRef = useRef<THREE.Points>(null)

  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uUp: { value: new THREE.Vector3(0, 1, 0) },
          uSun: { value: SUN_DIRECTION.clone() },
          uAlt: { value: 0 },
          uHorizonDip: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w; // push to far plane
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uUp;
          uniform vec3 uSun;
          uniform float uAlt;       // km
          uniform float uHorizonDip; // radians the true horizon sits below horizontal
          varying vec3 vDir;

          void main() {
            vec3 dir = normalize(vDir);
            float elev = asin(clamp(dot(dir, uUp), -1.0, 1.0)) + uHorizonDip;

            // 0 = sea level sky, 1 = black space
            float space = smoothstep(8.0, 75.0, uAlt);

            vec3 zenithDay   = vec3(0.16, 0.38, 0.78);
            vec3 horizonDay  = vec3(0.72, 0.83, 0.94);
            vec3 zenithSpace = vec3(0.0, 0.0, 0.004);
            vec3 limbSpace   = vec3(0.22, 0.48, 0.95);

            vec3 zenith  = mix(zenithDay, zenithSpace, pow(space, 0.6));
            vec3 horizon = mix(horizonDay, limbSpace, space);

            // Sky band gets thinner as the atmosphere drops below us
            float bandWidth = mix(0.55, 0.035, space);
            float t = clamp(elev / bandWidth, 0.0, 1.0);
            vec3 col = mix(horizon, zenith, pow(t, mix(0.45, 0.8, space)));

            // Below the horizon the planet covers the sky; in space keep it black so nothing pale shows if the globe is still loading
            if (elev < 0.0) col = mix(horizon, vec3(0.0, 0.004, 0.012), space);

            // Sun: hot core + Mie scattering glow (glow weakens in vacuum)
            float s = max(dot(dir, normalize(uSun)), 0.0);
            col += vec3(1.0, 0.95, 0.85) * pow(s, 1800.0) * 40.0;
            col += vec3(1.0, 0.86, 0.62) * pow(s, 12.0) * mix(0.45, 0.06, space);
            col += vec3(1.0, 0.92, 0.80) * pow(s, 220.0) * 1.6;

            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  )

  // Static star field on a unit sphere (shown above the stratosphere)
  const starCount = useGraphicsProfile().stars
  const starGeometry = useMemo(() => {
    const count = starCount
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const phi = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      positions[i * 3] = r * Math.cos(phi) * 900
      positions[i * 3 + 1] = u * 900
      positions[i * 3 + 2] = r * Math.sin(phi) * 900
      const warm = Math.random()
      const b = 0.55 + Math.random() * 0.45
      colors[i * 3] = b * (warm > 0.8 ? 1 : 0.85)
      colors[i * 3 + 1] = b * 0.9
      colors[i * 3 + 2] = b * (warm < 0.25 ? 1 : 0.85)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [starCount])

  const starMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.6,
        sizeAttenuation: false,
        vertexColors: true,
        // Opaque queue + additive blend so the Earth (drawn later) covers the stars
        transparent: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(0, 0, 0),
        depthTest: false,
        depthWrite: false,
      }),
    []
  )

  const fog = useMemo(() => new THREE.FogExp2('#b9cfe6', 0.00022), [])

  useFrame(() => {
    // Camera altitude above the surface (km)
    const toCam = camera.position.clone().sub(EARTH_CENTER)
    const r = toCam.length()
    const altKm = Math.max(0, ((r - EARTH_RADIUS_U) * METERS_PER_UNIT) / 1000)
    launchFrame.cameraAltitudeKm = altKm
    launchFrame.cameraUp.copy(toCam.normalize())

    skyMaterial.uniforms.uUp.value.copy(launchFrame.cameraUp)
    skyMaterial.uniforms.uAlt.value = altKm
    skyMaterial.uniforms.uHorizonDip.value = Math.acos(Math.min(1, 6371 / (6371 + altKm)))

    if (skyRef.current) skyRef.current.position.copy(camera.position)
    if (starsRef.current) starsRef.current.position.copy(camera.position)
    starMaterial.color.setScalar(THREE.MathUtils.smoothstep(altKm, 30, 90))

    // Thick haze at the pad, thinning out quickly with altitude
    const space = THREE.MathUtils.smoothstep(altKm, 6, 70)
    fog.density = 0.00022 * Math.exp(-altKm / 4) * (1 - space)
    fog.color.setRGB(0.72, 0.81, 0.91)
    scene.fog = fog.density > 1e-7 ? fog : null
  })

  return (
    <>
      <mesh ref={skyRef} material={skyMaterial} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[1000, 48, 24]} />
      </mesh>
      <points
        ref={starsRef}
        geometry={starGeometry}
        material={starMaterial}
        renderOrder={-999}
        frustumCulled={false}
      />
    </>
  )
}
