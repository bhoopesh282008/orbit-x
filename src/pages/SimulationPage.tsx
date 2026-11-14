import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Radio,
  Gauge,
  Activity,
  AlertTriangle,
  Clock,
  Battery,
  Trophy,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { MissionEvent } from '@/stores/simulationStore'
import { DYNAMIC_MISSION_EVENTS } from '@/data/missionEvents'
import { SpaceOrbitScene } from '@/components/simulation/SpaceOrbitScene'

const MISSION_PHASES: Record<string, string[]> = {
  'lunar-explorer': [
    'Pre-launch Systems Checkout',
    'Stage 1 Ignition & Liftoff',
    'Low Earth Parking Orbit',
    'Trans-Lunar Injection (TLI)',
    'Lunar Cislunar Transfer',
    'Lunar Orbit Insertion (LOI)',
    'Scientific Sensor Operations',
    'Mission Accomplished',
  ],
  'earth-observer': [
    'Terminal Countdown',
    'Launch & Booster Separation',
    'Orbit Insertion Burn',
    'Solar Array & Antenna Deployment',
    'Sensor Calibration Pass',
    'Continuous Earth Scanning',
    'High-Rate Telemetry Downlink',
    'Mission Accomplished',
  ],
  'mars-pathfinder': [
    'Pad Countdown',
    'Atmospheric Ascent',
    'Earth Departure Stage (EDS)',
    'Trans-Mars Injection (TMI)',
    'Interplanetary Heliocentric Cruise',
    'Mars Orbital Insertion (MOI)',
    'Aeroshell & Atmosphere Radiometry',
    'Mission Accomplished',
  ],
}

export default function SimulationPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)

  const components = useSpacecraftStore((s) => s.selectedComponents)

  const phases = useMemo(() => {
    return (missionId && MISSION_PHASES[missionId]) || [
      'Pre-launch',
      'Ascent',
      'Cruise',
      'Orbit Insertion',
      'Science Run',
      'Completed',
    ]
  }, [missionId])

  const status = useSimulationStore((s) => s.status)
  const speed = useSimulationStore((s) => s.speed)
  const telemetry = useSimulationStore((s) => s.telemetry)
  const startSimulation = useSimulationStore((s) => s.startSimulation)
  const pauseSimulation = useSimulationStore((s) => s.pauseSimulation)
  const resumeSimulation = useSimulationStore((s) => s.resumeSimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const updateTelemetry = useSimulationStore((s) => s.updateTelemetry)
  const completeSimulation = useSimulationStore((s) => s.completeSimulation)

  const [activeEvent, setActiveEvent] = useState<MissionEvent | null>(null)
  const [progressPercent, setProgressPercentState] = useState(0)
  // Mirror progress in a ref so the tick loop can read it without running
  // side effects inside a state updater (which React treats as render work).
  const progressRef = useRef(0)
  const setProgressPercent = (value: number) => {
    progressRef.current = value
    setProgressPercentState(value)
  }
  const [cameraMode, setCameraMode] = useState<'follow' | 'destination' | 'orbit'>('follow')
  const [scienceDataYield, setScienceDataYield] = useState(0)

  useEffect(() => {
    startSimulation(phases)
    setProgressPercent(0)
    setScienceDataYield(0)
    return () => {
      resetSimulation()
    }
  }, [phases, startSimulation, resetSimulation])

  useEffect(() => {
    if (status !== 'running') return

    const interval = setInterval(() => {
      {
        const prev = progressRef.current
        if (prev >= 100) return
        const next = prev + 0.5 * speed
        if (next >= 100) {
          setProgressPercent(100)
          completeSimulation({
            missionId: missionId || 'unknown',
            outcome: 'excellent',
            completionPercentage: 100,
            objectivesCompleted: mission?.objectives.length || 4,
            totalObjectives: mission?.objectives.length || 4,
            score: 95,
            scientificData: Math.round(scienceDataYield + 120),
            totalCost: components.reduce((s, c) => s + c.cost, 0),
            remainingFuel: Math.max(telemetry.fuelRemaining, 15),
            finalBattery: Math.max(telemetry.batteryEnergy, 40),
            communicationScore: 98,
            healthScore: telemetry.spacecraftHealth,
            engineeringEfficiency: 92,
            budgetEfficiency: 90,
            timeline: [
              { time: 0, event: 'Launch sequence executed flawlessly' },
              { time: 30, event: 'Orbital transfer completed on nominal vector' },
              { time: 70, event: 'Scientific sensors activated at target body' },
              { time: 100, event: 'Mission parameters successfully closed' },
            ],
            achievements: ['first-launch', 'lunar-explorer'],
            recommendations: [
              'Optimal mass ratio maintained throughout injection maneuvers.',
              'Solar array orientation yielded consistent surplus power balance.',
            ],
          })
          return
        }

        if (missionId && DYNAMIC_MISSION_EVENTS[missionId]) {
          const matchedEvent = DYNAMIC_MISSION_EVENTS[missionId]?.find(
            (e) => !e.resolved && e.timestamp > prev - 0.6 && e.timestamp <= next + 0.6
          )
          if (matchedEvent && !activeEvent) {
            pauseSimulation()
            setActiveEvent(matchedEvent)
          }
        }

        const currentPhaseIdx = Math.min(
          Math.floor((next / 100) * phases.length),
          phases.length - 1
        )
        const currentPhaseName = phases[currentPhaseIdx] || phases[0] || 'Launch'

        const calculatedVelocity = Math.round(2400 + Math.sin((next / 100) * Math.PI) * 5800)
        const remainingFuel = Math.max(0, Math.round(100 - next * 0.75))
        const batterySurplus = Math.round(85 + Math.sin(next * 0.1) * 12)
        const currentHealth = telemetry.spacecraftHealth

        updateTelemetry({
          elapsedTime: telemetry.elapsedTime + 1 * speed,
          phase: currentPhaseName,
          phaseIndex: currentPhaseIdx,
          velocity: calculatedVelocity,
          fuelRemaining: remainingFuel,
          batteryEnergy: batterySurplus,
          spacecraftHealth: currentHealth,
        })

        setScienceDataYield((prevSci) => prevSci + 0.3 * speed)
        setProgressPercent(next)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [
    status,
    speed,
    phases,
    missionId,
    activeEvent,
    telemetry,
    scienceDataYield,
    mission,
    components,
    pauseSimulation,
    updateTelemetry,
    completeSimulation,
  ])

  const handleResolveEventChoice = (choiceId: string) => {
    if (!activeEvent) return
    const choice = activeEvent.choices.find((c) => c.id === choiceId)
    if (choice) {
      if (choice.impact.health) {
        updateTelemetry({
          spacecraftHealth: Math.min(100, telemetry.spacecraftHealth + choice.impact.health),
        })
      }
      if (choice.impact.fuelRemaining) {
        updateTelemetry({
          fuelRemaining: Math.max(0, telemetry.fuelRemaining + choice.impact.fuelRemaining),
        })
      }
      if (choice.impact.scienceData) {
        setScienceDataYield((prev) => Math.max(0, prev + choice.impact.scienceData))
      }
    }
    setActiveEvent(null)
    resumeSimulation()
  }

  return (
    <PageContainer variant="wide" className="space-y-4">
      {/* Standardized Header */}
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : 'Flight'}
        title="Flight simulation"
        description={`Orbital trajectory telemetry and real-time guidance stream for ${mission?.name || 'Mission'} (${mission?.destination || 'Target'}).`}
        backTo={`/validation/${missionId}`}
        backLabel="Validation"
        badge={
          <Badge variant="cyan" className="font-mono text-xs">
            {telemetry.phase}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Simulation controls */}
            <div className="flex items-center rounded-lg bg-bg-secondary p-1 border border-white/5">
              {status === 'running' ? (
                <Button size="sm" variant="ghost" onClick={pauseSimulation} className="h-7 px-2.5 text-xs text-accent-cyan">
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={resumeSimulation} className="h-7 px-2.5 text-xs text-status-success font-bold">
                  <Play className="h-3.5 w-3.5 mr-1" /> Resume
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => { resetSimulation(); setProgressPercent(0) }} className="h-7 px-2 text-xs text-text-muted">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Speed toggles */}
            <div className="flex items-center gap-1 rounded-lg bg-bg-secondary p-1 border border-white/5">
              {[1, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`h-7 px-2 text-xs font-mono rounded transition-colors cursor-pointer ${
                    speed === s
                      ? 'bg-accent-blue text-white font-bold'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {progressPercent >= 100 && (
              <Button
                size="sm"
                onClick={() => navigate(`/results/${missionId}`)}
                className="bg-status-success hover:bg-status-success/90 font-bold text-xs"
              >
                <Trophy className="h-3.5 w-3.5 mr-1.5" /> View Mission Report
              </Button>
            )}
          </div>
        }
      />

      {/* Main Viewport & Telemetry HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[500px]">
        {/* Left Column: 3D Celestial Scene (8 cols) */}
        <div className="lg:col-span-8 flex flex-col min-w-0 min-h-[400px] lg:min-h-[560px] rounded-xl overflow-hidden border border-white/10 relative">
          <SpaceOrbitScene
            destination={mission?.destination ?? 'Moon'}
            progress={progressPercent}
            cameraMode={cameraMode}
          />

          {/* Camera View Selector overlay */}
          <div
            className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-bg-primary/70 p-0.5 backdrop-blur-md"
            role="radiogroup"
            aria-label="Camera view"
          >
            {(['follow', 'destination', 'orbit'] as const).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={cameraMode === mode}
                onClick={() => setCameraMode(mode)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors ${
                  cameraMode === mode
                    ? 'bg-white/[0.1] text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {mode === 'follow' ? 'Follow craft' : mode === 'destination' ? 'Target' : 'Overview'}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Telemetry Rack Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 min-w-0">
          {/* Phase progress */}
          <Card className="border-white/10 shrink-0">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted uppercase">Flight Trajectory Vector</span>
                <span className="text-accent-cyan font-bold">{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center gap-2 pt-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-status-success animate-ping shrink-0" />
                <span className="font-bold text-text-primary truncate">{telemetry.phase}</span>
              </div>
            </CardContent>
          </Card>

          {/* Gauges card */}
          <Card className="border-white/10 flex-1 flex flex-col min-h-0">
            <CardContent className="p-4 space-y-3.5 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs uppercase font-mono tracking-wider text-text-muted flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-accent-cyan" /> Real-time Telemetry
                </span>
                <Badge variant="success" className="text-[10px] font-mono">LINK NOMINAL</Badge>
              </div>

              {/* Velocity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-accent-blue" /> Velocity
                  </span>
                  <span className="font-bold text-text-primary">{telemetry.velocity.toLocaleString()} m/s</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-blue transition-all"
                    style={{ width: `${Math.min((telemetry.velocity / 8500) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Fuel */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-status-warning" /> Propellant
                  </span>
                  <span className="font-bold text-status-warning">{telemetry.fuelRemaining}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-warning transition-all"
                    style={{ width: `${telemetry.fuelRemaining}%` }}
                  />
                </div>
              </div>

              {/* Battery */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Battery className="h-3.5 w-3.5 text-status-success" /> Battery Reserve
                  </span>
                  <span className="font-bold text-status-success">{telemetry.batteryEnergy}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-success transition-all"
                    style={{ width: `${telemetry.batteryEnergy}%` }}
                  />
                </div>
              </div>

              {/* Bus Health */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-accent-cyan" /> Bus Integrity
                  </span>
                  <span className="font-bold text-text-primary">{telemetry.spacecraftHealth}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan transition-all"
                    style={{ width: `${telemetry.spacecraftHealth}%` }}
                  />
                </div>
              </div>

              {/* Telemetry Stream summary */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono text-[11px]">
                <div className="bg-bg-elevated p-2 rounded">
                  <span className="text-text-muted block text-[10px]">COMM STATUS</span>
                  <span className="text-status-success font-bold flex items-center gap-1">
                    <Radio className="h-3 w-3" /> DSN LOCKED
                  </span>
                </div>
                <div className="bg-bg-elevated p-2 rounded">
                  <span className="text-text-muted block text-[10px]">SCIENCE RETURN</span>
                  <span className="text-accent-cyan font-bold">+{Math.round(scienceDataYield)} MB</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-bg-elevated/40 border border-white/5 text-[11px] font-mono text-text-muted flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-accent-blue" />
                <span>Elapsed: T+{telemetry.elapsedTime}s</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dynamic Event Dialog */}
      <AnimatePresence>
        {activeEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-bg-panel border border-accent-blue/40 shadow-2xl rounded-xl overflow-hidden p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-status-warning">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted">In-Flight Anomaly Countermeasure</span>
                  <h3 className="text-base font-bold text-text-primary leading-tight">{activeEvent.name}</h3>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed bg-bg-elevated p-3 rounded-lg border border-white/5">
                {activeEvent.description}
              </p>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-text-muted">Command Resolution:</span>
                {activeEvent.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleResolveEventChoice(choice.id)}
                    className="w-full text-left p-3 rounded-lg border border-white/10 hover:border-accent-blue/50 bg-bg-elevated/60 hover:bg-accent-blue/10 transition-all text-xs cursor-pointer group"
                  >
                    <p className="font-bold text-text-primary group-hover:text-accent-cyan">{choice.label}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{choice.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
