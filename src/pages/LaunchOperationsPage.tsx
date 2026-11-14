import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Wrench,
  XCircle,
  Gauge,
  Lightbulb,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useSimulationStore } from '@/stores/simulationStore'
import {
  useLaunchSimulationStore,
  type LaunchCameraPreset,
  type LaunchPhase,
  type LaunchTelemetry,
} from '@/stores/launchSimulationStore'
import { CinematicLaunchScene } from '@/three/components/rockets/CinematicLaunchScene'
import { ASCENT_TIMELINE, ORBIT_ALTITUDE_KM } from '@/services/ascentTrajectory'
import { soundFX } from '@/utils/soundFX'
import { predictLaunchOutcome, type Finding } from '@/services/launchOutcome'
import { useMissionPlannerStore } from '@/stores/missionPlannerStore'
import { TeamPoll } from '@/components/crew/TeamPoll'
import { roleInfo, useCrewView } from '@/stores/crewStore'

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const CAMERAS: { id: LaunchCameraPreset; label: string; hint: string }[] = [
  { id: 'auto', label: 'Director', hint: 'Automatic broadcast shots for each phase' },
  { id: 'pad', label: 'Pad', hint: 'Fixed camera at the launch pad' },
  { id: 'tracking', label: 'Tracking', hint: 'Long-lens ground tracking camera (2.4 km away)' },
  { id: 'rocket', label: 'Chase', hint: 'Chase camera flying alongside the vehicle' },
  { id: 'onboard', label: 'Onboard', hint: 'Camera on the upper stage looking down at Earth' },
  { id: 'curvature', label: 'Long range', hint: 'Vehicle against the curved horizon' },
  { id: 'space', label: 'Orbital', hint: 'Wide view from space' },
  { id: 'manual', label: 'Free', hint: 'Drag to orbit, scroll to zoom' },
]

const SPEEDS = [1, 5, 10, 25, 50]

interface Milestone {
  t: number
  label: string
  short: string
  phase?: LaunchPhase
  learn: string
}

const MILESTONES: Milestone[] = [
  {
    t: 0,
    label: 'Liftoff',
    short: 'LIFTOFF',
    learn:
      'The engines must produce more thrust than the vehicle weighs (thrust-to-weight > 1). At liftoff it is only ~1.4, so the rocket climbs slowly at first.',
  },
  {
    t: ASCENT_TIMELINE.pitchKick,
    label: 'Gravity turn',
    short: 'PITCH',
    learn:
      'After clearing the tower the rocket tilts slightly east. Gravity then gradually bends the path toward horizontal, which saves fuel — orbit is about going sideways fast, not just up.',
  },
  {
    t: ASCENT_TIMELINE.maxQ,
    label: 'Max-Q',
    short: 'MAX-Q',
    learn:
      'Maximum dynamic pressure: speed is rising but the air is still thick, so aerodynamic stress peaks. Engines throttle down briefly to protect the structure.',
  },
  {
    t: ASCENT_TIMELINE.meco,
    label: 'MECO & stage separation',
    short: 'MECO',
    learn:
      'Main engine cutoff. The empty first stage is dead weight, so it is dropped. Shedding mass is why rockets have stages — the rocket equation rewards it.',
  },
  {
    t: ASCENT_TIMELINE.fairingSep,
    label: 'Fairing separation',
    short: 'FAIRING',
    learn:
      'Above ~100 km the air is too thin to heat the payload, so the protective nose fairing splits and falls away, saving more mass.',
  },
  {
    t: ASCENT_TIMELINE.seco,
    label: 'SECO — orbit',
    short: 'SECO',
    learn:
      'Second engine cutoff at ~7.8 km/s. At this speed the vehicle falls around the Earth as fast as the surface curves away beneath it: that is an orbit.',
  },
  {
    t: ASCENT_TIMELINE.payloadSep,
    label: 'Payload deploy',
    short: 'DEPLOY',
    learn:
      'Springs push the spacecraft gently away from the upper stage. It now unfolds solar arrays and antennas and begins its own mission.',
  },
]

const PHASE_LABEL: Record<LaunchPhase, string> = {
  STANDBY: 'Standby',
  COUNTDOWN: 'Terminal count',
  ENGINE_START: 'Engine start',
  LIFTOFF: 'Liftoff',
  ASCENT: 'Powered ascent',
  BOOSTER_SEPARATION: 'Booster separation',
  STAGE_SEPARATION: 'Stage separation',
  FAIRING_SEPARATION: 'Second stage burn',
  ORBITAL_INSERTION: 'Orbital insertion',
  DEPLOYMENT: 'Payload deployment',
  ORBITAL_FLIGHT: 'In orbit',
  TRANS_INJECTION: 'Trans-injection burn',
  MISSION_CRUISE: 'Cruise',
  MISSION_COMPLETE: 'Mission success',
  REENTRY: 'Falling back — no orbit',
  ABORTED: 'Aborted',
}

const formatClock = (t: LaunchTelemetry) => {
  const pre = t.countdownSeconds > 0
  const secs = pre ? t.countdownSeconds : t.flightTime
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `T${pre ? '−' : '+'}${pad(h)}:${pad(m)}:${pad(s)}`
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Webcast-style circular speed gauge with altitude readout. */
function StageGauge({ label, speedKmh, altitudeKm, active }: { label: string; speedKmh: number; altitudeKm: number; active: boolean }) {
  const max = 30000
  const frac = Math.min(1, speedKmh / max)
  const r = 34
  const c = 2 * Math.PI * r
  const arc = c * 0.75
  return (
    <div className={cn('flex items-center gap-3 transition-opacity', active ? 'opacity-100' : 'opacity-45')}>
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-[225deg]" aria-hidden>
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${arc * frac} ${c}`}
            className="transition-[stroke-dasharray] duration-200"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-mono text-[13px] font-semibold text-white tabular-nums">{Math.round(speedKmh).toLocaleString()}</span>
          <span className="mt-1 font-mono text-[9px] tracking-[0.14em] text-white/55">KM/H</span>
        </div>
      </div>
      <div className="leading-tight">
        <div className="font-mono text-[10px] tracking-[0.18em] text-white/55">{label}</div>
        <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
          {altitudeKm < 10 ? altitudeKm.toFixed(2) : altitudeKm.toFixed(1)}
          <span className="ml-1 text-xs font-normal text-white/55">km</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.14em] text-white/45">ALTITUDE</div>
      </div>
    </div>
  )
}

/** Horizontal mission timeline with evenly spaced milestones, like a launch broadcast. */
function MissionTimeline({ flightTime, countdown, cutoff = Infinity }: { flightTime: number; countdown: number; cutoff?: number }) {
  // Stops: T-30 s, then each milestone, evenly spaced; progress interpolates between stops
  const stops = [-30, ...MILESTONES.map((m) => m.t)]
  // Milestones after a failure never happened, so stop the timeline there
  const now = Math.min(cutoff, countdown > 0 ? -countdown : flightTime)
  const n = stops.length - 1
  let progress = 1
  for (let i = 0; i < n; i++) {
    if (now < stops[i + 1]) {
      progress = (i + Math.max(0, (now - stops[i]) / (stops[i + 1] - stops[i]))) / n
      break
    }
  }
  return (
    <div className="relative mx-4 h-9">
      <div className="absolute left-0 right-0 top-[11px] h-[2px] rounded bg-white/15" />
      <div className="absolute left-0 top-[11px] h-[2px] rounded bg-[var(--accent-blue)] transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      {MILESTONES.map((m, i) => {
        const x = ((i + 1) / n) * 100
        const passed = now >= m.t
        return (
          <div key={m.short} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${x}%` }}>
            <div
              className={cn(
                'mx-auto mt-[6px] h-3 w-3 rounded-full border-2 transition-colors',
                passed ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]' : 'border-white/40 bg-black/60'
              )}
            />
            <div className={cn('mt-1 whitespace-nowrap font-mono text-[9px] tracking-[0.14em]', passed ? 'text-white' : 'text-white/45')}>
              {m.short}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Readout({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'accent' | 'warn' }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[15px] font-semibold tabular-nums',
          tone === 'accent' ? 'text-[var(--accent-cyan)]' : tone === 'warn' ? 'text-[var(--status-warning)]' : 'text-white'
        )}
      >
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-white/45">{unit}</span>}
      </div>
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="text-white/50">{label}</span>
        <span className="text-white tabular-nums">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn('h-full rounded-full transition-[width] duration-200', value < 15 ? 'bg-[var(--status-warning)]' : 'bg-[var(--accent-blue)]')}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

/** Altitude vs downrange plot of the flown trajectory. */
function AscentProfile({ telemetry }: { telemetry: LaunchTelemetry }) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const { flightTime, downrange, altitude } = telemetry
  useEffect(() => {
    if (flightTime === 0) {
      setPoints((p) => (p.length ? [] : p))
      return
    }
    if (flightTime > ASCENT_TIMELINE.seco + 5) return
    setPoints((p) => {
      const last = p[p.length - 1]
      if (last && Math.abs(downrange - last.x) < 2 && Math.abs(altitude - last.y) < 0.6) return p
      return [...p, { x: downrange, y: altitude }]
    })
  }, [flightTime, downrange, altitude])
  const W = 280
  const H = 110
  const maxX = 1700
  const maxY = 240
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${(p.x / maxX) * W},${H - (p.y / maxY) * H}`).join(' ')
  const cur = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" role="img" aria-label="Ascent profile: altitude against downrange distance">
      {[0, 80, 160, 240].map((a) => (
        <g key={a}>
          <line x1="0" x2={W} y1={H - (a / maxY) * H} y2={H - (a / maxY) * H} stroke="rgba(255,255,255,0.06)" />
          <text x="2" y={H - (a / maxY) * H - 2} className="fill-white/35 font-mono text-[8px]">
            {a} km
          </text>
        </g>
      ))}
      <line x1="0" x2={W} y1={H - (ORBIT_ALTITUDE_KM / maxY) * H} y2={H - (ORBIT_ALTITUDE_KM / maxY) * H} stroke="rgba(63,185,122,0.5)" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinejoin="round" />
      {cur && <circle cx={(cur.x / maxX) * W} cy={H - (cur.y / maxY) * H} r="3.5" fill="#fff" />}
      <text x={W - 2} y={H + 12} textAnchor="end" className="fill-white/35 font-mono text-[8px]">
        downrange {Math.round(telemetry.downrange)} km →
      </text>
    </svg>
  )
}

/** Post-flight failure report: what happened, the numbers, the physics, and the fix. */
function FailureReport({
  heading,
  findings,
  onFix,
  onRetry,
  secondary,
}: {
  heading: string
  findings: Finding[]
  onFix: () => void
  onRetry: () => void
  secondary?: { label: string; onClick: () => void }
}) {
  const crew = useCrewView()
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute left-1/2 top-1/2 max-h-[calc(100%-2rem)] w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--status-danger)]/35 bg-black/70 p-6 backdrop-blur-xl"
      role="alertdialog"
      aria-label={heading}
    >
      <div className="flex items-center gap-3">
        <XCircle className="h-8 w-8 shrink-0 text-[var(--status-danger)]" />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb4ae]">Mission failure report</div>
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {findings.map((f) => (
          <section key={f.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            {crew.team && f.area && (
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: crew.ownerOf(f.area).color }} aria-hidden />
                {roleInfo(f.area).short} · {crew.ownerOf(f.area).name}
              </p>
            )}
            {f.title !== heading && <h3 className="mb-1 font-semibold">{f.title}</h3>}
            <p className="text-sm leading-relaxed text-white/80">{f.detail}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent-cyan)]">Why · </span>
              {f.why}
            </p>
            <p className="mt-2 flex gap-1.5 text-sm font-medium">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
              {f.fix}
            </p>
          </section>
        ))}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          onClick={onFix}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-blue)] px-4 py-3 font-semibold text-white transition hover:brightness-110"
        >
          <Wrench className="h-4 w-4" /> Fix the design
        </button>
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" /> Recycle & retry
        </button>
      </div>
      {secondary && (
        <button onClick={secondary.onClick} className="mt-2 w-full rounded-xl px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">
          {secondary.label}
        </button>
      )}
    </motion.div>
  )
}

const USER_ABORT_MESSAGE = 'LAUNCH ABORTED — RANGE SAFETY TERMINATION ACTIVATED'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LaunchOperationsPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const mission = useMissionStore((s) => s.missions.find((m) => m.id === missionId))
  const selectedVehicle = useSpacecraftStore((s) => s.selectedLaunchVehicle)
  const startSimulation = useSimulationStore((s) => s.startSimulation)
  const updateTelemetry = useSimulationStore((s) => s.updateTelemetry)

  const phase = useLaunchSimulationStore((s) => s.phase)
  const telemetry = useLaunchSimulationStore((s) => s.telemetry)
  const eventLog = useLaunchSimulationStore((s) => s.eventLog)
  const isPaused = useLaunchSimulationStore((s) => s.isPaused)
  const simSpeed = useLaunchSimulationStore((s) => s.simSpeed)
  const isMuted = useLaunchSimulationStore((s) => s.isMuted)
  const camera = useLaunchSimulationStore((s) => s.activeCameraPreset)
  const {
    startCountdown,
    pauseSimulation,
    resumeSimulation,
    restartSimulation,
    abortLaunch,
    setSimSpeed,
    toggleMute,
    setCameraPreset,
    setVehicleProfile,
  } = useLaunchSimulationStore.getState()

  const vehicleId = selectedVehicle?.id || 'orbit-x-light'
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280)
  const [lesson, setLesson] = useState<Milestone | null>(null)
  const [summaryDismissed, setSummaryDismissed] = useState(false)
  const lastMilestone = useRef(-1)
  const maxG = useRef(1)

  useEffect(() => {
    setVehicleProfile({ hasBoosters: vehicleId !== 'orbit-x-light' })
    restartSimulation()
  }, [vehicleId, setVehicleProfile, restartSimulation])

  useEffect(() => soundFX.setMuted(isMuted), [isMuted])

  // Predict what this exact design does on launch day (same physics as the rest of the game)
  const components = useSpacecraftStore((s) => s.selectedComponents)
  const reserveDeltaV = useMissionPlannerStore((s) => s.userReserveDeltaVMargin)
  const outcome = useMemo(
    () => predictLaunchOutcome(components, selectedVehicle, mission, reserveDeltaV),
    [components, selectedVehicle, mission, reserveDeltaV]
  )
  const launchFailure = useLaunchSimulationStore((s) => s.launchFailure)
  useEffect(() => {
    useLaunchSimulationStore.getState().setLaunchFailure(outcome.launch)
  }, [outcome.launch])
  const noGo = outcome.poll.filter((p) => !p.go)
  const crew = useCrewView()

  // Surface a short "why it matters" lesson as each milestone is passed
  useEffect(() => {
    if (telemetry.countdownSeconds > 0 || phase === 'STANDBY') {
      lastMilestone.current = -1
      setSummaryDismissed(false)
      maxG.current = 1
      return
    }
    maxG.current = Math.max(maxG.current, telemetry.gForce)
    const idx = MILESTONES.reduce((acc, m, i) => (telemetry.flightTime >= m.t ? i : acc), -1)
    if (idx > lastMilestone.current) {
      lastMilestone.current = idx
      setLesson(MILESTONES[idx])
    }
  }, [telemetry.flightTime, telemetry.countdownSeconds, telemetry.gForce, phase])

  useEffect(() => {
    if (!lesson) return
    const id = window.setTimeout(() => setLesson(null), 11000)
    return () => window.clearTimeout(id)
  }, [lesson])

  // Hand off to the mission simulation once the payload is free
  useEffect(() => {
    if (!telemetry.spacecraftDeployed) return
    startSimulation([
      'Ignition & Liftoff',
      'Max-Q & Atmospheric Ascent',
      'Stage 1 Separation',
      'Fairing Jettison',
      'Stage 2 Orbital Insertion Burn',
      'Payload Spacecraft Deployment',
      mission?.name === 'Lunar Explorer'
        ? 'Trans-Lunar Injection (TLI)'
        : mission?.name === 'Mars Pathfinder'
          ? 'Trans-Mars Injection (TMI)'
          : 'Low Earth Orbit Circularization',
      'Payload Commissioning & Operations',
    ])
    updateTelemetry({
      phase: 'Orbital Insertion Nominal',
      phaseIndex: 5,
      velocity: Math.round(telemetry.totalVelocity),
      fuelRemaining: Math.round(telemetry.stage2Propellant),
      batteryEnergy: telemetry.batteryState,
      spacecraftHealth: 100,
      communicationStatus: 'nominal',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry.spacecraftDeployed])

  const preLaunch = phase === 'STANDBY'
  const designFailed =
    phase === 'ABORTED' &&
    !!launchFailure &&
    telemetry.statusMessage !== USER_ABORT_MESSAGE &&
    (telemetry.vehicleLost || launchFailure.kind === 'scrub' || launchFailure.kind === 'no-liftoff')
  // Let the explosion / shutdown play out before the report covers the view
  const [reportReady, setReportReady] = useState(false)
  useEffect(() => {
    if (!designFailed) {
      setReportReady(false)
      return
    }
    const id = window.setTimeout(() => setReportReady(true), telemetry.vehicleLost ? 3500 : 1800)
    return () => window.clearTimeout(id)
  }, [designFailed, telemetry.vehicleLost])
  const counting = phase === 'COUNTDOWN' || phase === 'ENGINE_START'
  const aborted = phase === 'ABORTED'
  const inOrbit = telemetry.spacecraftDeployed
  const speedKmh = telemetry.totalVelocity * 3.6
  const stage2Live = telemetry.stage1Separated
  const cameraHint = useMemo(() => CAMERAS.find((c) => c.id === camera)?.hint, [camera])

  return (
    <div className="force-dark relative h-full min-h-[560px] w-full select-none overflow-hidden bg-black text-white">
      {/* 3D world */}
      <div className="absolute inset-0">
        <CinematicLaunchScene vehicleId={vehicleId} missionName={mission?.name} />
      </div>

      {/* Edge vignettes keep overlays legible on bright skies */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

      {/* ---------------- Top bar ---------------- */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/validation/${missionId}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md transition hover:bg-white/10"
            aria-label="Back to design validation"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
              {mission?.codename ?? 'Mission'} · {selectedVehicle?.name.split(' (')[0] ?? 'ORBIT-X LIGHT'}
            </div>
            <div className="truncate text-lg font-semibold tracking-tight">{mission?.name ?? 'Launch'} — Launch</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-md xl:flex" role="radiogroup" aria-label="Camera">
            <Camera className="mx-2 h-3.5 w-3.5 text-white/55" aria-hidden />
            {CAMERAS.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={camera === c.id}
                title={c.hint}
                onClick={() => setCameraPreset(c.id)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition',
                  camera === c.id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <select
            value={camera}
            onChange={(e) => setCameraPreset(e.target.value as LaunchCameraPreset)}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs xl:hidden"
            aria-label="Camera"
          >
            {CAMERAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={toggleMute}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md transition hover:bg-white/10"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md transition hover:bg-white/10"
            aria-label={panelOpen ? 'Hide telemetry' : 'Show telemetry'}
            aria-expanded={panelOpen}
          >
            {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Status ticker */}
      {!preLaunch && (
        <div className="pointer-events-none absolute left-1/2 top-20 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 backdrop-blur-md">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              aborted ? 'bg-[var(--status-danger)]' : inOrbit ? 'bg-[var(--status-success)]' : 'live-dot bg-[var(--accent-blue)]'
            )}
          />
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-white/85">{telemetry.statusMessage}</span>
        </div>
      )}
      {camera === 'manual' && (
        <div className="pointer-events-none absolute left-1/2 top-32 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-white/60">
          {cameraHint?.toUpperCase()}
        </div>
      )}

      {/* ---------------- Pre-launch readiness poll ---------------- */}
      <AnimatePresence>
        {preLaunch && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute left-4 top-[5.5rem] w-[min(360px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-black/55 p-5 backdrop-blur-xl sm:left-6"
          >
            {crew.team ? (
              <TeamPoll outcome={outcome} onLaunch={startCountdown} onFix={() => navigate(`/designer/${missionId}`)} />
            ) : (
            <>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Launch director poll</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {noGo.length ? `NO-GO on ${noGo.length} item${noGo.length > 1 ? 's' : ''}` : 'Ready for terminal count'}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              LC-39A, Cape Canaveral · {ORBIT_ALTITUDE_KM} km orbit, 28.6° inclination. Real flight timeline — use time warp to speed up.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {outcome.poll.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-2">
                  <span className="text-white/75">{p.label}</span>
                  <span className={cn('font-mono text-[11px] font-semibold', p.go ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]')}>
                    {p.go ? 'GO' : 'NO-GO'}
                  </span>
                </li>
              ))}
            </ul>
            {noGo.length > 0 ? (
              <>
                <p className="mt-4 rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 px-3 py-2 text-xs leading-relaxed text-[#ffcdc8]">
                  This design breaks flight rules. A real launch director would stand down — but you can override and see exactly what goes wrong.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/designer/${missionId}`)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-blue)] px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <Wrench className="h-4 w-4" /> Fix design
                  </button>
                  <button
                    onClick={startCountdown}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--status-danger)]/50 bg-[var(--status-danger)]/20 px-3 py-2.5 text-sm font-semibold text-[#ffcdc8] transition hover:bg-[var(--status-danger)]/35"
                  >
                    <AlertTriangle className="h-4 w-4" /> Launch anyway
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={startCountdown}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-blue)] px-4 py-3 font-semibold text-white shadow-[0_8px_30px_-8px_var(--accent-blue)] transition hover:brightness-110 active:scale-[0.99]"
              >
                <Play className="h-4 w-4" /> Start terminal count
              </button>
            )}
            </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Lesson card ---------------- */}
      <AnimatePresence mode="wait">
        {lesson && !preLaunch && !designFailed && phase !== 'REENTRY' && !(inOrbit && !summaryDismissed) && (
          <motion.div
            key={lesson.short}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="absolute left-4 top-[5.5rem] w-[min(340px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-black/55 p-4 backdrop-blur-xl sm:left-6"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
              <Lightbulb className="h-3.5 w-3.5" /> Why it matters
            </div>
            <div className="mt-1 font-semibold">{lesson.label}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/70">{lesson.learn}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Launch-day failure ---------------- */}
      <AnimatePresence>
        {designFailed && launchFailure && reportReady && (
          <FailureReport
            heading={launchFailure.title}
            findings={[launchFailure]}
            onFix={() => navigate(`/designer/${missionId}`)}
            onRetry={restartSimulation}
          />
        )}
      </AnimatePresence>

      {/* ---------------- Orbit reached (possibly with on-orbit failures) ---------------- */}
      <AnimatePresence>
        {inOrbit && !summaryDismissed && outcome.orbit.length > 0 && (
          <FailureReport
            heading="Reached orbit — but the mission failed"
            findings={outcome.orbit}
            onFix={() => navigate(`/designer/${missionId}`)}
            onRetry={restartSimulation}
            secondary={{ label: 'Keep watching', onClick: () => setSummaryDismissed(true) }}
          />
        )}
        {inOrbit && !summaryDismissed && outcome.orbit.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/12 bg-black/60 p-6 text-center backdrop-blur-xl"
          >
            <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--status-success)]" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Payload deployed</h2>
            <p className="mt-1 text-sm text-white/65">
              {mission?.destination === 'Moon'
                ? 'Your spacecraft is free of the upper stage and on its way to the Moon.'
                : mission?.destination === 'Mars'
                  ? 'Your spacecraft is free of the upper stage and departing for Mars.'
                  : `Your spacecraft is in a stable ${ORBIT_ALTITUDE_KM} km orbit and on its own.`}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-left">
              <Readout label="Orbital speed" value={(telemetry.totalVelocity / 1000).toFixed(2)} unit="km/s" />
              <Readout label="Peak Max-Q" value={telemetry.maxQPeak.toFixed(1)} unit="kPa" />
              <Readout label="Peak load" value={maxG.current.toFixed(1)} unit="g" />
            </div>
            <button
              onClick={() => navigate(`/mission-control/${missionId}`)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--status-success)] px-4 py-3 font-semibold text-black transition hover:brightness-110"
            >
              Continue to mission control <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setSummaryDismissed(true)} className="mt-2 w-full rounded-xl px-4 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white">
              Keep watching
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Bottom broadcast bar ---------------- */}
      <div className={cn('absolute bottom-0 left-0 p-4 transition-[right] duration-300 sm:p-6', panelOpen ? 'right-0 xl:right-[360px]' : 'right-0')}>
        <div className="mb-3 hidden sm:block">
          <MissionTimeline
            flightTime={telemetry.flightTime}
            countdown={phase === 'STANDBY' ? 30 : telemetry.countdownSeconds}
            cutoff={(designFailed || phase === 'REENTRY') && launchFailure ? launchFailure.atTime - 0.01 : Infinity}
          />
        </div>
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6">
          <div className="hidden md:block">
            <StageGauge label={stage2Live ? 'STAGE 2' : 'STAGE 1'} speedKmh={speedKmh} altitudeKm={telemetry.altitude} active />
          </div>

          <div className="shrink-0">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/55">{PHASE_LABEL[phase]}</div>
              <div
                className={cn(
                  'whitespace-nowrap font-mono text-3xl font-semibold tabular-nums tracking-tight',
                  aborted && 'text-[var(--status-danger)]',
                  phase === 'ENGINE_START' && 'text-[var(--status-warning)]'
                )}
              >
                {formatClock(telemetry)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 md:items-end">
            {!preLaunch && !inOrbit && (
              <div className="flex gap-2">
                <button
                  onClick={isPaused ? resumeSimulation : pauseSimulation}
                  disabled={aborted}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur-md transition hover:bg-white/15 disabled:opacity-40"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? 'Resume' : 'Hold'}
                </button>
                {!aborted && (
                  <button
                    onClick={abortLaunch}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--status-danger)]/50 bg-[var(--status-danger)]/20 px-4 py-2.5 text-sm font-medium text-[#ffb4ae] transition hover:bg-[var(--status-danger)]/35"
                  >
                    <AlertTriangle className="h-4 w-4" /> Abort
                  </button>
                )}
                <button
                  onClick={restartSimulation}
                  className="grid place-items-center rounded-xl border border-white/15 bg-white/10 px-3 backdrop-blur-md transition hover:bg-white/15"
                  aria-label="Recycle to T−30 s"
                  title="Recycle to T−30 s"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 rounded-xl border border-white/12 bg-black/45 p-1 backdrop-blur-md" role="radiogroup" aria-label="Time warp">
              <span className="px-2 font-mono text-[10px] tracking-[0.14em] text-white/50">WARP</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={simSpeed === s}
                  onClick={() => setSimSpeed(s)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs transition',
                    simSpeed === s ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10'
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Telemetry drawer ---------------- */}
      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="absolute bottom-0 right-0 top-[4.5rem] flex w-[min(360px,100%)] flex-col gap-4 overflow-y-auto border-l border-white/10 bg-black/60 p-4 pb-24 backdrop-blur-xl"
            aria-label="Flight telemetry"
          >
            <section>
              <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                <Gauge className="h-3.5 w-3.5" /> Flight dynamics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Readout label="Altitude" value={telemetry.altitude.toFixed(1)} unit="km" tone="accent" />
                <Readout label="Downrange" value={telemetry.downrange.toFixed(0)} unit="km" />
                <Readout label="Speed" value={Math.round(telemetry.totalVelocity).toLocaleString()} unit="m/s" tone="accent" />
                <Readout label="Inertial" value={Math.round(telemetry.inertialVelocity).toLocaleString()} unit="m/s" />
                <Readout label="Mach" value={telemetry.altitude > 80 ? '—' : telemetry.machNumber.toFixed(2)} />
                <Readout
                  label="Dyn. pressure"
                  value={telemetry.dynamicPressure.toFixed(1)}
                  unit="kPa"
                  tone={telemetry.dynamicPressure > 25 ? 'warn' : undefined}
                />
                <Readout label="Flight path" value={telemetry.pitchAngle.toFixed(1)} unit="°" />
                <Readout label="G-load" value={telemetry.gForce.toFixed(2)} unit="g" tone={telemetry.gForce > 3.5 ? 'warn' : undefined} />
                <Readout label="Thrust" value={telemetry.thrust.toLocaleString()} unit="kN" />
                <Readout label="Mass" value={(telemetry.vehicleMass / 1000).toFixed(0)} unit="t" />
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Ascent profile</h3>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
                <AscentProfile telemetry={telemetry} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Propellant</h3>
              <Bar label="Stage 1 RP-1 / LOX" value={telemetry.stage1Propellant} />
              <Bar label="Stage 2 RP-1 / LOX" value={telemetry.stage2Propellant} />
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                <span>Δv to target</span>
                <span className="text-white tabular-nums">{telemetry.remainingDeltaV.toLocaleString()} m/s</span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Stage 1', telemetry.stage1Separated ? 'Separated' : 'Attached'],
                ['Fairing', telemetry.fairingSeparated ? 'Jettisoned' : 'Closed'],
                ['Payload', telemetry.spacecraftDeployed ? 'Deployed' : 'Captive'],
                ['Solar arrays', telemetry.solarPanelsDeployed ? 'Deployed' : 'Stowed'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                  <span className="text-white/55">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </section>

            <section className="min-h-0 flex-1">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Event log</h3>
              <ol className="space-y-1">
                {eventLog.slice(0, 14).map((e) => (
                  <li key={e.id} className="flex gap-3 rounded-md px-2 py-1.5 text-xs odd:bg-white/[0.03]">
                    <span className="shrink-0 font-mono text-[var(--accent-cyan)] tabular-nums">{e.met}</span>
                    <span className={cn('text-white/80', e.severity === 'critical' && 'text-[#ffb4ae]')}>{e.message}</span>
                  </li>
                ))}
              </ol>
            </section>
          </motion.aside>
        )}
      </AnimatePresence>

      {counting && telemetry.countdownSeconds <= 10 && telemetry.countdownSeconds > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.div
            key={Math.ceil(telemetry.countdownSeconds)}
            initial={{ opacity: 0.9, scale: 1.15 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.9 / Math.max(1, simSpeed) }}
            className="font-mono text-[120px] font-bold text-white/80 drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          >
            {Math.ceil(telemetry.countdownSeconds)}
          </motion.div>
        </div>
      )}
    </div>
  )
}
