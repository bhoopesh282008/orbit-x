import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  Clock,
  DollarSign,
  Crosshair,
  Target,
  ShieldAlert,
  Radio,
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { Planet3DViewer } from '@/three/components/planets/RealisticPlanet'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const statusConfig = {
  locked: { label: 'Locked', badge: 'outline' as const, icon: Lock },
  available: { label: 'Flight Ready', badge: 'cyan' as const, icon: Crosshair },
  'in-progress': { label: 'In Progress', badge: 'default' as const, icon: Target },
  completed: { label: 'Accomplished', badge: 'success' as const, icon: CheckCircle2 },
  failed: { label: 'Failed', badge: 'danger' as const, icon: Crosshair },
}

const difficultyBadgeColors: Record<string, string> = {
  Easy: 'text-status-success border-status-success/30 bg-status-success/10',
  Medium: 'text-status-warning border-status-warning/30 bg-status-warning/10',
  Hard: 'text-status-danger border-status-danger/30 bg-status-danger/10',
  Expert: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10',
}

const planetTextureMap: Record<string, 'moon' | 'earth' | 'mars'> = {
  'lunar-explorer': 'moon',
  'earth-observer': 'earth',
  'mars-pathfinder': 'mars',
}

export default function CampaignPage() {
  const missions = useMissionStore((s) => s.missions)
  const campaignProgress = useMissionStore((s) => s.campaignProgress)
  const completedCount = missions.filter((m) => m.status === 'completed').length

  return (
    <PageContainer>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Standardized Header */}
        <motion.div variants={itemVariants}>
          <PageHeader
            eyebrow="Operate"
            title="Campaign"
            description="Progressive spaceflight objectives designed to validate spacecraft avionics, delta-v orbital maneuvers, and interplanetary operations."
            icon={Target}
            iconColor="text-accent-blue"
            badge={
              <Badge variant="cyan" className="font-mono text-xs">
                PROGRAM LEVEL: {completedCount + 1}/{missions.length}
              </Badge>
            }
          />
        </motion.div>

        {/* Campaign Certification Banner Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/10 bg-gradient-to-r from-bg-panel via-bg-elevated to-bg-panel">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] sm:text-xs uppercase font-mono tracking-wider text-text-muted">
                    Campaign Operations Certification
                  </span>
                  <p className="text-lg sm:text-xl font-semibold mt-0.5 text-text-primary">
                    Phase {completedCount + 1} of {missions.length} —{' '}
                    <span className="text-accent-blue font-semibold text-sm sm:text-base">
                      {completedCount === missions.length
                        ? 'Master Spaceflight Engineer Certified'
                        : completedCount === 0
                        ? 'Preliminary Orbital Verification'
                        : 'Deep Space Operations Qualified'}
                    </span>
                  </p>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-3xl sm:text-4xl font-semibold text-accent-cyan font-mono">{campaignProgress}%</span>
                  <span className="text-xs text-text-muted uppercase font-mono">Completed</span>
                </div>
              </div>
              <Progress value={campaignProgress} className="h-2.5" />

              {/* Milestone Dots */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/5">
                {missions.map((m, idx) => {
                  const isPassed = m.status === 'completed'
                  const isCurrent = m.status === 'in-progress' || m.status === 'available'
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          isPassed
                            ? 'bg-status-success text-white shadow-sm shadow-status-success/30'
                            : isCurrent
                            ? 'bg-accent-blue text-white ring-2 ring-accent-blue/30'
                            : 'bg-white/5 text-text-muted border border-white/10'
                        }`}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{m.name}</p>
                        <p className="text-[10px] text-text-muted font-mono truncate">{m.destination}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mission List */}
        <div className="space-y-4">
          {missions.map((mission, index) => {
            const config = statusConfig[mission.status]
            const isLocked = mission.status === 'locked'
            const StatusIcon = config.icon
            const texture = planetTextureMap[mission.id] || 'earth'

            return (
              <motion.div key={mission.id} variants={itemVariants}>
                <Card
                  className={`overflow-hidden transition-all duration-300 border ${
                    isLocked
                      ? 'border-white/5 opacity-60 bg-bg-panel/40'
                      : 'border-white/10 hover:border-accent-blue/40 bg-bg-panel'
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-stretch">
                      {/* Left: 3D Planet Display Container */}
                      <div className="md:w-56 shrink-0 flex flex-col items-center justify-center p-5 bg-gradient-to-b from-bg-secondary to-bg-panel border-b md:border-b-0 md:border-r border-white/5">
                        <Planet3DViewer
                          type={texture}
                          size={110}
                        />
                        <div className="mt-3 text-center">
                          <span className="text-[9px] font-mono tracking-wider text-text-muted uppercase">Target Vector</span>
                          <p className="text-xs font-bold text-text-primary">{mission.destination}</p>
                        </div>
                      </div>

                      {/* Right: Mission Parameters Panel */}
                      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between space-y-4 min-w-0">
                        <div>
                          {/* Title & Badge */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-white/5 text-text-muted shrink-0">
                                {mission.codename}
                              </span>
                              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary truncate">
                                {mission.name}
                              </h3>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                                  difficultyBadgeColors[mission.difficulty] || ''
                                }`}
                              >
                                {mission.difficulty}
                              </span>
                            </div>

                            <Badge variant={config.badge} className="px-2.5 py-0.5 shrink-0 text-xs">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>

                          {/* Briefing Text */}
                          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                            {mission.description}
                          </p>

                          {/* Telemetry Metric Specs */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-2.5 border-y border-white/5 font-mono text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <DollarSign className="h-4 w-4 text-accent-cyan shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase text-text-muted">Max Budget</p>
                                <p className="font-bold truncate">{mission.budget.toLocaleString()} cr</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Clock className="h-4 w-4 text-accent-blue shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase text-text-muted">Duration</p>
                                <p className="font-bold truncate">{mission.duration}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Zap className="h-4 w-4 text-status-warning shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase text-text-muted">Min Delta-v</p>
                                <p className="font-bold truncate">{mission.minDeltaV.toLocaleString()} m/s</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Radio className="h-4 w-4 text-status-success shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase text-text-muted">Max Payload</p>
                                <p className="font-bold truncate">{mission.maxPayloadMass.toLocaleString()} kg</p>
                              </div>
                            </div>
                          </div>

                          {/* Objectives pills */}
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {mission.objectives.map((obj) => (
                                <div
                                  key={obj.id}
                                  className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-bg-elevated/70 border border-white/5 text-text-secondary"
                                >
                                  <span className={obj.required ? 'text-accent-blue font-bold' : 'text-text-muted'}>
                                    {obj.required ? '●' : '○'}
                                  </span>
                                  <span className="truncate">{obj.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action row */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5">
                          {isLocked ? (
                            <div className="flex items-center gap-2 text-xs text-status-warning font-mono">
                              <ShieldAlert className="h-4 w-4 shrink-0" />
                              <span>Clear {missions[index - 1]?.name} to unlock flight authorization.</span>
                            </div>
                          ) : mission.status === 'completed' ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 text-xs font-bold text-status-success font-mono">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Mission Completed ({mission.score ? `${mission.score} pts` : '100%'})</span>
                              </div>
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/campaign/${mission.id}`}>
                                  Review Briefing <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs text-text-muted font-mono hidden sm:inline">Flight clearance active.</span>
                              <Button size="sm" asChild className="w-full sm:w-auto bg-accent-blue hover:bg-accent-blue/90">
                                <Link to={`/campaign/${mission.id}`}>
                                  {mission.status === 'in-progress' ? 'Resume Spacecraft Design' : 'Open Mission Briefing'}
                                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </PageContainer>
  )
}
