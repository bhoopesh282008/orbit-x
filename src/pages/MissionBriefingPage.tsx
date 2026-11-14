import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Target,
  DollarSign,
  Clock,
  Zap,
  Shield,
  Radio,
  FlaskConical,
  Lock,
  Compass,
  Cpu,
  Layers,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { Planet3DViewer } from '@/three/components/planets/RealisticPlanet'
import { MISSION_SCIENCE, RELEVANCE_LABEL } from '@/data/missionScience'
import { COMPONENT_CATALOGUE } from '@/data/components'

const planetTextureMap: Record<string, 'moon' | 'earth' | 'mars'> = {
  'lunar-explorer': 'moon',
  'earth-observer': 'earth',
  'mars-pathfinder': 'mars',
}

const requirementIcons: Record<string, typeof Zap> = {
  fuel: Zap,
  communication: Radio,
  power: Cpu,
  mass: Shield,
  instrument: FlaskConical,
}

export default function MissionBriefingPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const startMission = useMissionStore((s) => s.startMission)
  const mission = missions.find((m) => m.id === missionId)

  if (!mission) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-text-primary">
          <h2 className="text-xl font-bold mb-2">Mission Vector Not Found</h2>
          <p className="text-text-secondary text-sm mb-4">The requested flight parameters do not exist in the mission catalogue.</p>
          <Button asChild>
            <Link to="/campaign">Return to Campaign Operations</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (mission.status === 'locked') {
    return (
      <PageContainer>
        <div className="p-12 text-center space-y-4 text-text-primary max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-status-danger/10 border border-status-danger/30 flex items-center justify-center mx-auto text-status-danger">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Classified Mission Parameters</h2>
          <p className="text-text-secondary text-sm">
            Access restricted. Complete previous spaceflight milestones to unlock aerospace engineering clearance.
          </p>
          <Button asChild variant="outline">
            <Link to="/campaign">Back to Campaign</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  const texture = planetTextureMap[mission.id] || 'earth'

  const handleBeginDesign = () => {
    if (mission.status === 'available') {
      startMission(mission.id)
    }
    navigate(`/designer/${mission.id}`)
  }

  return (
    <PageContainer>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Standardized Header */}
        <PageHeader
          title={mission.name}
          description={mission.description}
          backTo="/campaign"
          backLabel="Campaign Operations"
          badge={
            <Badge variant="cyan" className="font-mono text-xs">
              {mission.codename} • {mission.difficulty}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/mission-planner/${mission.id}`)}
                className="border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10"
              >
                <Compass className="h-4 w-4 mr-1.5" /> Mission Planning Studio
              </Button>
              <Button
                onClick={handleBeginDesign}
                className="bg-accent-blue hover:bg-accent-blue/90 shadow-sm shadow-accent-blue/20"
              >
                Begin Spacecraft Design <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          }
        />

        {/* Science first: the question this mission exists to answer */}
        {MISSION_SCIENCE[mission.id] && (
          <section className="panel-surface rounded-2xl p-5 sm:p-7" aria-label="Science objective">
            <p className="eyebrow !text-[10px]">The science question</p>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              {MISSION_SCIENCE[mission.id].question}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">{MISSION_SCIENCE[mission.id].whyItMatters}</p>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold">How we’ll know it worked</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                  {MISSION_SCIENCE[mission.id].successCriteria.map((c) => (
                    <li key={c} className="flex gap-2">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Instruments that answer it</h3>
                <ul className="mt-2 space-y-1.5">
                  {Object.entries(MISSION_SCIENCE[mission.id].instruments)
                    .sort(([, a], [, b]) => ['key', 'useful', 'low'].indexOf(a.relevance) - ['key', 'useful', 'low'].indexOf(b.relevance))
                    .map(([id, info]) => {
                      const comp = COMPONENT_CATALOGUE.find((c) => c.id === id)
                      const required = mission.requiredInstruments.some((r) => id === `inst-${r}`)
                      return (
                        <li key={id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-text-primary">{comp?.name ?? id}</span>
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                                info.relevance === 'key'
                                  ? 'bg-status-success/15 text-status-success'
                                  : info.relevance === 'useful'
                                    ? 'bg-accent-blue/15 text-accent-blue'
                                    : 'bg-white/[0.06] text-text-muted'
                              }`}
                            >
                              {required ? 'Required' : RELEVANCE_LABEL[info.relevance]}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">{info.why}</p>
                        </li>
                      )
                    })}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Real missions that asked this</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {MISSION_SCIENCE[mission.id].precedents.map((p) => (
                    <li key={p.name}>
                      <span className="font-medium text-text-primary">{p.name}</span>
                      <p className="text-xs text-text-muted">{p.what}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Hero Briefing Card with 3D Planet */}
        <Card className="border-white/10 bg-gradient-to-br from-bg-panel via-bg-elevated to-bg-secondary overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {/* 3D Photorealistic Target Planet */}
              <div className="shrink-0 flex flex-col items-center justify-center">
                <Planet3DViewer
                  type={texture}
                  size={150}
                />
                <span className="mt-2.5 text-[11px] font-mono uppercase tracking-wider text-accent-cyan font-bold">
                  Target: {mission.destination}
                </span>
              </div>

              {/* Title & Core Metrics Grid */}
              <div className="flex-1 space-y-3 min-w-0 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-bg-panel/80 border border-white/10 text-xs font-mono text-text-muted">
                  <span>{mission.codename}</span>
                  <span>/</span>
                  <span className="text-accent-blue">{mission.destination} Insertion</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
                  Flight Target: {mission.destination}
                </h2>
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                  {mission.briefing}
                </p>

                {/* Constraint Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 font-mono">
                  <div className="bg-bg-panel/80 border border-white/5 p-2.5 rounded-lg text-left">
                    <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase mb-0.5">
                      <DollarSign className="h-3 w-3 text-accent-cyan" />
                      <span>Budget</span>
                    </div>
                    <p className="text-sm font-bold truncate text-text-primary">{mission.budget.toLocaleString()} cr</p>
                  </div>

                  <div className="bg-bg-panel/80 border border-white/5 p-2.5 rounded-lg text-left">
                    <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase mb-0.5">
                      <Clock className="h-3 w-3 text-accent-blue" />
                      <span>Timeline</span>
                    </div>
                    <p className="text-sm font-bold truncate text-text-primary">{mission.duration}</p>
                  </div>

                  <div className="bg-bg-panel/80 border border-white/5 p-2.5 rounded-lg text-left">
                    <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase mb-0.5">
                      <Zap className="h-3 w-3 text-status-warning" />
                      <span>Min &Delta;v</span>
                    </div>
                    <p className="text-sm font-bold truncate text-text-primary">{mission.minDeltaV.toLocaleString()} m/s</p>
                  </div>

                  <div className="bg-bg-panel/80 border border-white/5 p-2.5 rounded-lg text-left">
                    <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase mb-0.5">
                      <Shield className="h-3 w-3 text-status-success" />
                      <span>Payload Mass</span>
                    </div>
                    <p className="text-sm font-bold truncate text-text-primary">&le; {mission.maxPayloadMass.toLocaleString()} kg</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Constraints & Objectives Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Objectives (7 cols) */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <Card className="border-white/10">
              <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4.5 w-4.5 text-status-success" />
                  Flight Acceptance Objectives
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-2.5">
                {mission.objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-bg-elevated/60 border border-white/5"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-full border border-accent-blue/40 flex items-center justify-center shrink-0 mt-0.5 bg-accent-blue/10 text-accent-blue font-bold text-xs">
                        {obj.required ? '★' : '☆'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{obj.description}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {obj.required
                            ? 'Mandatory mission acceptance requirement'
                            : 'Secondary bonus telemetry objective (+Credits & XP)'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={obj.required ? 'default' : 'outline'} className="text-[10px] shrink-0">
                      {obj.required ? 'MANDATORY' : 'OPTIONAL'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Directive notice */}
            <Card className="border-white/10">
              <CardContent className="p-4 sm:p-5 flex items-start gap-3 text-xs leading-relaxed text-text-secondary">
                <Info className="h-4 w-4 text-accent-blue shrink-0 mt-0.5" />
                <span>
                  <strong>Engineering Directive:</strong> Pursuant to Tsiolkovsky's Rocket Equation{' '}
                  <code className="text-accent-cyan font-mono">&Delta;v = Isp &times; g0 &times; ln(m0 / mf)</code>,
                  every kilogram of unnecessary payload directly reduces final injection velocity. Balance scientific sensor payload with sufficient propellant reserves.
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Constraints & Requirements (5 cols) */}
          <div className="lg:col-span-5 space-y-6 min-w-0">
            <Card className="border-white/10">
              <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-accent-blue" />
                  Engineering Flight Constraints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                {mission.requirements.map((req, i) => {
                  const Icon = requirementIcons[req.type] || Zap
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-elevated/40 border border-white/5">
                      <div className="p-2 rounded bg-white/5 text-accent-cyan shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-text-muted uppercase font-mono truncate">{req.description}</p>
                        <p className="text-xs font-bold font-mono text-text-primary">
                          &ge; {req.value.toLocaleString()} {req.unit}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {mission.requiredInstruments.length > 0 && (
                  <div className="p-3 rounded-lg bg-bg-elevated/40 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase">
                      <FlaskConical className="h-3.5 w-3.5 text-accent-blue" />
                      <span>Required Scientific Instruments</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mission.requiredInstruments.map((inst) => (
                        <Badge key={inst} variant="cyan" className="capitalize text-[11px] font-mono">
                          {inst}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Launch Gate Action Box */}
            <Card className="border-accent-blue/30 bg-accent-blue/5">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Compass className="h-4 w-4 text-accent-cyan" />
                    Engineering Authorization Ready
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Assemble structural bus, propulsion engine, fuel tanks, solar arrays, and sensor instruments in the workstation.
                  </p>
                </div>
                <Button
                  onClick={handleBeginDesign}
                  className="w-full bg-accent-blue hover:bg-accent-blue/90 font-medium"
                >
                  Proceed to Spacecraft Designer <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </PageContainer>
  )
}
