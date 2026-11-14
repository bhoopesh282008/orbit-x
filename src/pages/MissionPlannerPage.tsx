import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Compass,
  ArrowRight,
  Calendar,
  Zap,
  Target,
  ShieldCheck,
  Flame,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useMissionPlannerStore } from '@/stores/missionPlannerStore'
import { InterplanetaryTrajectoryViewer } from '@/three/scenes/InterplanetaryTrajectoryViewer'

export default function MissionPlannerPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)

  const trajectoryPlan = useMissionPlannerStore((s) => s.trajectoryPlan)
  const selectedWindowId = useMissionPlannerStore((s) => s.selectedWindowId)
  const plannedManeuvers = useMissionPlannerStore((s) => s.plannedManeuvers)
  const selectedDestinationOrbit = useMissionPlannerStore((s) => s.selectedDestinationOrbit)
  const userReserveDeltaVMargin = useMissionPlannerStore((s) => s.userReserveDeltaVMargin)
  const initializePlan = useMissionPlannerStore((s) => s.initializePlan)
  const selectWindow = useMissionPlannerStore((s) => s.selectWindow)
  const setDestinationOrbit = useMissionPlannerStore((s) => s.setDestinationOrbit)
  const setReserveDeltaV = useMissionPlannerStore((s) => s.setReserveDeltaV)

  useEffect(() => {
    if (missionId) {
      initializePlan(missionId)
    }
  }, [missionId, initializePlan])

  const totalRequiredDeltaV = (trajectoryPlan?.totalMissionDeltaV || 3800) + userReserveDeltaVMargin

  return (
    <PageContainer variant="wide" className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : undefined}
        title="Mission planner"
        description={`Astrodynamic trajectory optimization, launch opportunity sequencing, and delta-v budget allocation for ${mission?.name || 'Mission'}.`}
        backTo={`/campaign/${missionId}`}
        backLabel="Mission briefing"
        icon={Compass}
        iconColor="text-accent-cyan"
        badge={
          <Badge variant="cyan" className="font-mono text-xs">
            ASTRODYNAMICS V2.4
          </Badge>
        }
        actions={
          <Button
            onClick={() => navigate(`/designer/${missionId}`)}
            className="bg-accent-blue hover:bg-accent-blue/90 shadow-sm shadow-accent-blue/20"
          >
            Authorize Flight Profile & Design Spacecraft
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        }
      />

      {/* Top Interactive Astrodynamics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[460px]">
        {/* 3D Interplanetary Orbit Canvas (8 cols) */}
        <div className="lg:col-span-8 min-h-[420px] rounded-xl overflow-hidden border border-white/10 relative">
          <InterplanetaryTrajectoryViewer
            destination={mission?.destination || 'Moon'}
          />
        </div>

        {/* Trajectory & Delta-V Budget Rack (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <Card className="border-white/10 bg-bg-panel flex-1">
            <CardHeader className="p-4 pb-2 border-b border-white/5">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-status-warning" />
                  Mission &Delta;v Budget Sizing
                </span>
                <span className="font-mono text-xs text-accent-cyan font-bold">
                  {totalRequiredDeltaV.toLocaleString()} m/s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs font-mono">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-text-muted">Departure / Injection:</span>
                  <span className="font-bold text-text-primary">
                    +{trajectoryPlan?.tliDeltaV.toLocaleString()} m/s
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-text-muted">Target Orbit Insertion:</span>
                  <span className="font-bold text-text-primary">
                    +{trajectoryPlan?.insertionDeltaV.toLocaleString()} m/s
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-text-muted">Mid-Course Reserve (TCM):</span>
                  <span className="font-bold text-text-primary">
                    +{trajectoryPlan?.midcourseReserveDeltaV.toLocaleString()} m/s
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-text-muted">Engineer Margin (+Buffer):</span>
                  <span className="font-bold text-status-warning">
                    +{userReserveDeltaVMargin} m/s
                  </span>
                </div>
              </div>

              {/* Safety Margin Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Safety Reserve Allocation:</span>
                  <span className="text-status-warning font-bold">{userReserveDeltaVMargin} m/s</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="25"
                  value={userReserveDeltaVMargin}
                  onChange={(e) => setReserveDeltaV(Number(e.target.value))}
                  className="w-full accent-accent-blue cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
              </div>

              <div className="p-2.5 rounded bg-bg-elevated border border-white/5 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-accent-cyan font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Feasibility Verification</span>
                </div>
                <p className="text-text-muted font-sans text-[11px] leading-relaxed">
                  Payload mass must be matched with a booster capable of at least{' '}
                  <strong className="text-text-primary">{totalRequiredDeltaV} m/s</strong> total energy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Launch Windows & Maneuver Node Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Launch Window Picker (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-accent-blue" />
                Planetary Launch Window Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Planetary orbital alignments produce periodic minimum-energy Hohmann transfer windows. Select a launch opportunity:
              </p>

              <div className="space-y-2.5">
                {trajectoryPlan?.launchWindows.map((win) => {
                  const isSelected = selectedWindowId === win.id
                  return (
                    <div
                      key={win.id}
                      onClick={() => selectWindow(win.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/30'
                          : 'border-white/5 bg-bg-elevated/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-accent-blue text-white' : 'border border-white/20 text-transparent'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary font-mono">{win.dateString}</span>
                            <Badge
                              variant={win.status === 'optimal' ? 'success' : win.status === 'standard' ? 'cyan' : 'warning'}
                              className="text-[10px] uppercase font-mono"
                            >
                              {win.status}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-text-muted font-mono">
                            Daily Window: {win.windowOpenHours} hrs • C3 Energy: {win.c3Energy} km²/s²
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <span className="text-text-muted block text-[10px]">PENALTY</span>
                        <span className={win.deltaVOffset === 0 ? 'text-status-success font-bold' : 'text-status-warning'}>
                          +{win.deltaVOffset} m/s
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orbit Destination & Maneuver Schedule (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-accent-cyan" />
                Destination Insertion Orbit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  'Polar Circular (100km)',
                  'Equatorial Prograde (250km)',
                  'Sun-Synchronous Scan (650km)',
                  'High Elliptic Capture (Apo: 5000km)',
                ].map((orbit) => {
                  const isCurrent = selectedDestinationOrbit === orbit
                  return (
                    <button
                      key={orbit}
                      onClick={() => setDestinationOrbit(orbit)}
                      className={`p-3 text-left rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-accent-cyan bg-accent-cyan/10 font-bold text-accent-cyan'
                          : 'border-white/10 bg-bg-elevated/50 text-text-muted hover:text-text-primary hover:border-white/20'
                      }`}
                    >
                      {orbit}
                    </button>
                  )
                })}
              </div>

              {/* Maneuver Schedule Table */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-status-warning" />
                  Planned Delta-V Maneuver Schedule
                </span>

                <div className="space-y-2 font-mono text-xs">
                  {plannedManeuvers.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-bg-elevated border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-text-primary">{m.name}</p>
                        <p className="text-[10px] text-text-muted font-sans mt-0.5">{m.purpose}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-accent-cyan font-bold">&Delta;v: {m.deltaVRequired} m/s</span>
                        <span className="text-[10px] text-text-muted block">t_burn: {m.burnDurationSeconds}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
