import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls as DreiOrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { RealisticRocketAssembly } from './RealisticRocketAssembly'
import { useLaunchSimulationStore, type LaunchCameraPreset } from '@/stores/launchSimulationStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { soundFX } from '@/utils/soundFX'
import { useGraphicsProfile } from '@/hooks/useGraphicsProfile'
import { ASCENT_TIMELINE } from '@/services/ascentTrajectory'
import {
  KM,
  PAD_DECK_HEIGHT,
  SUN_DIRECTION,
  launchFrame,
  surfacePoint,
  vehicleHeight,
} from '@/three/launch/launchFrame'
import { SkyDome } from '@/three/launch/SkyDome'
import { RealScaleEarth } from '@/three/launch/RealScaleEarth'
import { LaunchComplex } from '@/three/launch/LaunchComplex'
import { ExhaustPlume, SmokeTrail } from '@/three/launch/ExhaustPlume'
import { ReentryGlow, VehicleBreakup } from '@/three/launch/FailureEffects'

interface CinematicLaunchSceneProps {
  vehicleId: string
  missionName?: string
  className?: string
}

/** Distance from the vehicle's local origin (stage-1 base) to its engine exits. */
const ROCKET_BASE_OFFSET = 0.62

const PRE_LIFTOFF = new Set(['STANDBY', 'COUNTDOWN', 'ENGINE_START'])

/** Writes the vehicle's world pose for this frame into `launchFrame`. */
function updateFlightFrame(vehicleId: string) {
  const { telemetry, phase, launchFailure } = useLaunchSimulationStore.getState()
  const ft = telemetry.flightTime
  const liftedOff = !PRE_LIFTOFF.has(phase) && !(phase === 'ABORTED' && ft === 0)
  const aborted = phase === 'ABORTED'

  // Engine spool-up from T-3 s; liftoff at T-0
  let ignition = 0
  if (phase === 'ENGINE_START') ignition = THREE.MathUtils.clamp((3.2 - telemetry.countdownSeconds) / 2.2, 0, 1)
  if (liftedOff) ignition = 1
  if (aborted) ignition = 0

  const theta = telemetry.downrange / 6371
  surfacePoint(telemetry.downrange, telemetry.altitude, launchFrame.rocketPosition)
  launchFrame.localUp.set(Math.sin(theta), Math.cos(theta), 0)
  launchFrame.rocketPosition.addScaledVector(launchFrame.localUp, ROCKET_BASE_OFFSET)

  // Hold-down shake while the engines are at full thrust on the pad
  if (phase === 'ENGINE_START' && ignition > 0.3) {
    launchFrame.rocketPosition.x += (Math.random() - 0.5) * 0.012
    launchFrame.rocketPosition.z += (Math.random() - 0.5) * 0.012
  }

  // Body axis: tilt from local vertical by (90° - flight path angle), plus Earth curvature
  const tilt = theta + ((90 - telemetry.pitchAngle) * Math.PI) / 180
  launchFrame.rocketQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -tilt)
  launchFrame.rocketUp.set(0, 1, 0).applyQuaternion(launchFrame.rocketQuaternion)

  launchFrame.rocketAltitudeKm = telemetry.altitude
  launchFrame.liftedOff = liftedOff
  launchFrame.ignitionLevel = ignition
  launchFrame.flightTime = ft
  launchFrame.stage1Firing = !aborted && (phase === 'ENGINE_START' || (liftedOff && ft < ASCENT_TIMELINE.meco))
  launchFrame.stage2Firing =
    !aborted &&
    ((ft >= ASCENT_TIMELINE.stage2Ignition &&
      ft < (launchFailure?.kind === 'short-of-orbit' ? launchFailure.atTime : ASCENT_TIMELINE.seco)) ||
      phase === 'TRANS_INJECTION')

  void vehicleId
}

type OrbitControlsImpl = { target: THREE.Vector3; enabled: boolean }

// ---------------------------------------------------------------------------
// Camera director
// ---------------------------------------------------------------------------

const FIXED_TRACKING_CAMERA = new THREE.Vector3(150, 20, 280) // ~2.5 km south-east, clear line of sight
const FIXED_PAD_CAMERA = new THREE.Vector3(20, 2.4, 66)

/** Picks the shot a broadcast director would use for each phase of flight. */
function autoShot(ft: number, phase: string): LaunchCameraPreset {
  if (PRE_LIFTOFF.has(phase)) return 'pad'
  if (ft < 40) return 'tracking'
  if (ft < ASCENT_TIMELINE.meco - 8) return 'rocket'
  if (ft < ASCENT_TIMELINE.stage2Ignition + 20) return 'onboard'
  if (ft < ASCENT_TIMELINE.fairingSep + 15) return 'rocket'
  if (ft < ASCENT_TIMELINE.seco) return 'curvature'
  return 'space'
}

function CameraDirector({ vehicleId }: { vehicleId: string }) {
  const { camera } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dims = useMemo(() => vehicleHeight(vehicleId), [vehicleId])
  const coreRadius = vehicleId === 'orbit-x-light' ? 0.38 : vehicleId === 'orbit-x-heavy' ? 0.52 : 0.68
  const smoothOffset = useRef(new THREE.Vector3(30, 8, 40))
  const lastShot = useRef<LaunchCameraPreset | null>(null)
  const lastCenter = useRef(new THREE.Vector3())
  const smoothFov = useRef(36)
  const lookTarget = useRef(new THREE.Vector3(0, 5, 0))

  const tmp = useMemo(
    () => ({
      center: new THREE.Vector3(),
      desired: new THREE.Vector3(),
      side: new THREE.Vector3(0, 0, 1),
      east: new THREE.Vector3(),
      look: new THREE.Vector3(),
      radial: new THREE.Vector3(),
    }),
    []
  )

  useFrame((_, delta) => {
    const state = useLaunchSimulationStore.getState()
    const preset = state.activeCameraPreset
    const ft = state.telemetry.flightTime
    const autoPick: LaunchCameraPreset = preset === 'auto' ? autoShot(ft, state.phase) : preset
    // After a loss of vehicle, rocket-relative shots back away to frame the debris cloud
    const lost = state.telemetry.vehicleLost
    const shot: LaunchCameraPreset =
      lost && !['pad', 'tracking', 'tower', 'manual'].includes(autoPick) ? 'curvature' : autoPick
    const s1Sep = state.telemetry.stage1Separated
    const H = dims.top
    const U = launchFrame.rocketUp
    const L = launchFrame.localUp
    const { center, desired, side, east, look, radial } = tmp

    // Centre of the active vehicle (upper stack once the booster is gone)
    const centerY = s1Sep ? dims.coreHeight * 0.7 + 1.6 : H * 0.45
    center.copy(launchFrame.rocketPosition).addScaledVector(U, centerY)
    east.set(L.y, -L.x, 0) // horizontal downrange direction
    const switched = shot !== lastShot.current
    const k = switched ? 1 : 1 - Math.exp(-delta * 2.5)
    let fov = 36
    camera.up.copy(launchFrame.cameraUp)

    // Rocket-relative shots: smooth the offset (not the absolute position) so fast flight never lags
    const relative = (offset: THREE.Vector3, lookAt: THREE.Vector3) => {
      smoothOffset.current.lerp(offset, k)
      cam.position.copy(center).add(smoothOffset.current)
      look.copy(lookAt)
    }

    switch (shot) {
      case 'pad': {
        cam.position.copy(FIXED_PAD_CAMERA)
        const tgt = launchFrame.liftedOff ? center : desired.set(0, PAD_DECK_HEIGHT + H * 0.45, 0)
        lookTarget.current.lerp(tgt, switched ? 1 : 1 - Math.exp(-delta * 4))
        look.copy(lookTarget.current)
        fov = 30
        break
      }
      case 'tracking': {
        // Long-range tracking camera on the ground: zooms to keep the vehicle framed
        cam.position.copy(FIXED_TRACKING_CAMERA)
        lookTarget.current.lerp(center, switched ? 1 : 1 - Math.exp(-delta * 6))
        look.copy(lookTarget.current).addScaledVector(U, -H * 0.4)
        const dist = cam.position.distanceTo(center)
        const frame = H * 2.6 + Math.min(launchFrame.rocketAltitudeKm * 6, 40)
        fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(frame / 2 / dist)), 0.4, 40)
        break
      }
      case 'rocket':
      case 'side': {
        desired.copy(side).multiplyScalar(H * 2.2).addScaledVector(U, -H * 0.35).addScaledVector(L, H * 0.25)
        relative(desired, center)
        fov = 40
        break
      }
      case 'onboard': {
        // Camera mounted on the upper stage looking down the vehicle at Earth
        radial.copy(side)
        const mountY = dims.coreHeight * 0.7 + 1.2
        cam.position.copy(launchFrame.rocketPosition).addScaledVector(U, mountY).addScaledVector(radial, coreRadius + 0.32)
        look.copy(launchFrame.rocketPosition).addScaledVector(U, -60).addScaledVector(radial, coreRadius + 0.7)
        camera.up.copy(radial)
        smoothOffset.current.copy(cam.position).sub(center)
        fov = 68
        break
      }
      case 'staging': {
        desired.copy(side).multiplyScalar(H * 0.9).addScaledVector(east, -H * 0.4)
        relative(desired, look.copy(launchFrame.rocketPosition).addScaledVector(U, dims.coreHeight * 0.7))
        look.copy(launchFrame.rocketPosition).addScaledVector(U, dims.coreHeight * 0.7)
        fov = 45
        break
      }
      case 'payload':
      case 'spacecraft': {
        desired.copy(side).multiplyScalar(H * 0.6).addScaledVector(U, H * 0.25).addScaledVector(east, H * 0.15)
        relative(desired, center)
        look.copy(launchFrame.rocketPosition).addScaledVector(U, dims.coreHeight * 0.7 + 3)
        fov = 45
        break
      }
      case 'curvature': {
        // Long lens from far to the side: vehicle and plume against the curved horizon
        if (lost) {
          // Slow pull-back from the breakup point
          desired.copy(side).multiplyScalar(H * 16).addScaledVector(L, H * 2).addScaledVector(east, -H * 6)
          smoothOffset.current.lerp(desired, 1 - Math.exp(-delta * 0.8))
          cam.position.copy(center).add(smoothOffset.current)
          look.copy(center)
          fov = 45
          break
        }
        desired.copy(side).multiplyScalar(H * 12).addScaledVector(L, H * 4).addScaledVector(east, -H * 5)
        relative(desired, center)
        look.addScaledVector(L, -H * 2.2)
        fov = 38
        break
      }
      case 'space':
      case 'earth':
      case 'orbit': {
        desired.copy(side).multiplyScalar(H * 5).addScaledVector(L, H * 3.2).addScaledVector(east, -H * 3)
        relative(desired, center)
        look.addScaledVector(L, -H * 1.6)
        fov = 55
        break
      }
      case 'close': {
        desired.copy(side).multiplyScalar(2.6).addScaledVector(U, -H * 0.5).addScaledVector(east, 1.2)
        relative(desired, look.copy(launchFrame.rocketPosition))
        look.copy(launchFrame.rocketPosition).addScaledVector(U, 0.2)
        fov = 50
        break
      }
      case 'tower': {
        cam.position.set(-3.4, PAD_DECK_HEIGHT + H + 3.6, 1.6)
        look.copy(launchFrame.liftedOff ? center : desired.set(0, PAD_DECK_HEIGHT + H * 0.5, 0))
        fov = 55
        break
      }
      case 'manual':
      default: {
        // Free camera: OrbitControls drives rotation/zoom; we carry it along with the vehicle
        if (switched) lastCenter.current.copy(center)
        const moved = desired.copy(center).sub(lastCenter.current)
        cam.position.add(moved)
        fov = 45
        break
      }
    }

    lastCenter.current.copy(center)
    lastShot.current = shot

    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(center)
      controls.enabled = shot === 'manual'
    }
    if (shot !== 'manual') cam.lookAt(look)

    smoothFov.current = switched ? fov : THREE.MathUtils.lerp(smoothFov.current, fov, 1 - Math.exp(-delta * 3))
    if (Math.abs(cam.fov - smoothFov.current) > 1e-3) {
      cam.fov = smoothFov.current
      cam.updateProjectionMatrix()
    }
  })

  return (
    <DreiOrbitControls
      ref={controlsRef as never}
      enableDamping={false}
      enablePan={false}
      minDistance={1.5}
      maxDistance={20 * KM}
      onStart={() => {
        // Grabbing the view hands control to the free camera
        const st = useLaunchSimulationStore.getState()
        if (st.activeCameraPreset !== 'manual') st.setCameraPreset('manual')
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

function FlightUpdater({
  vehicleId,
  missionName,
  tickSimulation,
  rocketRef,
  sunRef,
  hemiRef,
}: {
  vehicleId: string
  missionName?: string
  tickSimulation: (dt: number, mission?: string) => void
  rocketRef: React.RefObject<THREE.Group | null>
  sunRef: React.RefObject<THREE.DirectionalLight | null>
  hemiRef: React.RefObject<THREE.HemisphereLight | null>
}) {
  useFrame((_, delta) => {
    tickSimulation(Math.min(delta, 0.1), missionName)
    updateFlightFrame(vehicleId)

    if (rocketRef.current) {
      rocketRef.current.position.copy(launchFrame.rocketPosition)
      rocketRef.current.quaternion.copy(launchFrame.rocketQuaternion)
    }
    // Keep the sun's shadow/lighting frame centred on the vehicle
    if (sunRef.current) {
      sunRef.current.target.position.copy(launchFrame.rocketPosition)
      sunRef.current.position.copy(launchFrame.rocketPosition).addScaledVector(SUN_DIRECTION, 500)
      sunRef.current.target.updateMatrixWorld()
    }
    // Skylight fades out as the atmosphere drops away
    if (hemiRef.current) {
      const space = THREE.MathUtils.smoothstep(launchFrame.cameraAltitudeKm, 10, 70)
      hemiRef.current.intensity = THREE.MathUtils.lerp(1.1, 0.12, space)
      hemiRef.current.up.copy(launchFrame.cameraUp)
    }
  })

  return null
}

/** Reports once the first frame has actually been drawn. */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    requestAnimationFrame(() => onReady())
  })
  return null
}

function LaunchSimulationWorld({ vehicleId, missionName }: { vehicleId: string; missionName?: string }) {
  const envResolution = useGraphicsProfile().envResolution
  const tickSimulation = useLaunchSimulationStore((s) => s.tickSimulation)
  const phase = useLaunchSimulationStore((s) => s.phase)
  const countdownSeconds = useLaunchSimulationStore((s) => s.telemetry.countdownSeconds)
  const stage1Separated = useLaunchSimulationStore((s) => s.telemetry.stage1Separated)
  const boostersSeparated = useLaunchSimulationStore((s) => s.telemetry.boostersSeparated)
  const fairingSeparated = useLaunchSimulationStore((s) => s.telemetry.fairingSeparated)
  const spacecraftDeployed = useLaunchSimulationStore((s) => s.telemetry.spacecraftDeployed)
  const solarPanelsDeployed = useLaunchSimulationStore((s) => s.telemetry.solarPanelsDeployed)
  const antennasDeployed = useLaunchSimulationStore((s) => s.telemetry.antennasDeployed)
  const vehicleLost = useLaunchSimulationStore((s) => s.telemetry.vehicleLost)
  const components = useSpacecraftStore((s) => s.selectedComponents)

  const rocketRef = useRef<THREE.Group>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const lastBeepSecRef = useRef<number>(-1)
  const dims = useMemo(() => vehicleHeight(vehicleId), [vehicleId])
  const coreRadius = vehicleId === 'orbit-x-light' ? 0.38 : vehicleId === 'orbit-x-heavy' ? 0.52 : 0.68

  // Sound cues by flight phase
  useEffect(() => {
    if (phase === 'ENGINE_START') soundFX.startEngineRoar()
    else if (phase === 'STAGE_SEPARATION' || phase === 'BOOSTER_SEPARATION') soundFX.playStageSeparation()
    else if (phase === 'DEPLOYMENT') {
      soundFX.stopEngineRoar()
      soundFX.playDeploymentChime()
    } else if (phase === 'STANDBY' || phase === 'ABORTED' || phase === 'ORBITAL_INSERTION') soundFX.stopEngineRoar()
  }, [phase])

  useEffect(() => {
    if (phase === 'COUNTDOWN' || phase === 'ENGINE_START') {
      const sec = Math.ceil(countdownSeconds)
      if (sec !== lastBeepSecRef.current) {
        if (sec <= 5 && sec > 0) soundFX.playCountdownBeep(false)
        else if (sec === 0) soundFX.playCountdownBeep(true)
        lastBeepSecRef.current = sec
      }
    }
  }, [countdownSeconds, phase])

  useEffect(() => () => soundFX.stopEngineRoar(), [])

  const stage2NozzleY = dims.coreHeight * 0.7 + 0.28

  return (
    <>
      {/* Must be first: advances the simulation and poses the vehicle before cameras/effects read it */}
      <FlightUpdater
        vehicleId={vehicleId}
        missionName={missionName}
        tickSimulation={tickSimulation}
        rocketRef={rocketRef}
        sunRef={sunRef}
        hemiRef={hemiRef}
      />
      <SkyDome />

      {/* Sunlight + sky/ground bounce light */}
      <directionalLight ref={sunRef} intensity={3.2} color="#fff3e2" />
      <hemisphereLight ref={hemiRef} args={['#bcd4f0', '#57543f', 1.1]} />
      <ambientLight intensity={0.06} />

      {/* Image-based lighting for metallic surfaces: blue sky above, coastal ground below */}
      <Environment resolution={envResolution} frames={1}>
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#7fa8d8" side={THREE.BackSide} />
        </mesh>
        <mesh scale={100} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#4a4a3c" side={THREE.BackSide} />
        </mesh>
        <mesh position={SUN_DIRECTION.clone().multiplyScalar(60)} scale={10}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={new THREE.Color(6, 5.6, 5)} />
        </mesh>
      </Environment>

      <RealScaleEarth />
      <LaunchComplex vehicleTop={dims.top + ROCKET_BASE_OFFSET} />

      <group ref={rocketRef} visible={!vehicleLost}>
        <RealisticRocketAssembly
          vehicleId={vehicleId}
          stage1Separated={stage1Separated}
          boostersSeparated={boostersSeparated}
          fairingSeparated={fairingSeparated}
          spacecraftDeployed={spacecraftDeployed}
          solarPanelsDeployed={solarPanelsDeployed}
          antennasDeployed={antennasDeployed}
          thrustActive={false}
          stage2ThrustActive={false}
          components={components}
        />
        {!stage1Separated && (
          <ExhaustPlume nozzleY={-0.6} nozzleRadius={coreRadius} kind="booster" active />
        )}
        <ExhaustPlume nozzleY={stage2NozzleY} nozzleRadius={coreRadius * 0.55} kind="vacuum" active />
        <ReentryGlow top={dims.top} />
      </group>

      <SmokeTrail nozzleOffset={-1.2} />
      <VehicleBreakup />
      <CameraDirector vehicleId={vehicleId} />
    </>
  )
}

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__launch = { launchFrame, store: useLaunchSimulationStore }
}

export function CinematicLaunchScene({ vehicleId, missionName, className = '' }: CinematicLaunchSceneProps) {
  const [ready, setReady] = useState(false)
  const gp = useGraphicsProfile()
  return (
    <div className={`w-full h-full relative select-none ${className}`}>
      <Canvas
        dpr={gp.dpr}
        camera={{ position: [20, 2.4, 66], fov: 30, near: 0.05, far: 4_000_000 }}
        gl={{ antialias: gp.antialias, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(0, PAD_DECK_HEIGHT + 4, 0)}
      >
        <LaunchSimulationWorld vehicleId={vehicleId} missionName={missionName} />
        <FirstFrame onReady={() => setReady(true)} />
      </Canvas>
      <div
        className={`pointer-events-none absolute inset-0 grid place-items-center bg-[#05070a] transition-opacity duration-700 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden={ready}
      >
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-blue)]" />
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">Building launch complex</div>
        </div>
      </div>
    </div>
  )
}

