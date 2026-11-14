import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RotateCcw,
  CheckCircle2,
  Award,
  BarChart3,
  Scale,
  DollarSign,
  Compass,
  ArrowRight,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useAnomalyStore, summarizeDecisions, NO_DECISIONS } from '@/stores/anomalyStore'
import { useGameStore } from '@/stores/gameStore'
import { Planet3DViewer } from '@/three/components/planets/RealisticPlanet'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

export default function ResultsPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()

  const missions = useMissionStore((s) => s.missions)
  const completeMissionInStore = useMissionStore((s) => s.completeMission)
  const mission = missions.find((m) => m.id === missionId)

  const addXP = useGameStore((s) => s.addXP)
  const addCredits = useGameStore((s) => s.addCredits)
  const unlockAchievement = useGameStore((s) => s.unlockAchievement)

  const objectiveScore = 35
  const engineeringScore = 23
  const resourceScore = 19
  // Mid-mission anomaly decisions feed the science and operations scores
  const resolvedAnomalies = useAnomalyStore((st) => (st.missionId === missionId ? st.resolved : NO_DECISIONS))
  const decisions = summarizeDecisions(resolvedAnomalies)
  const scienceScore = Math.round(10 * (decisions.scienceRetainedPct / 100))
  const operationsScore = Math.max(-10, Math.min(6, decisions.scoreDelta))
  const budgetScore = 9
  const totalCompositeScore = Math.max(
    0,
    Math.min(100, objectiveScore + engineeringScore + resourceScore + scienceScore + budgetScore + operationsScore)
  )

  useEffect(() => {
    if (missionId) {
      completeMissionInStore(missionId, totalCompositeScore, 100)
      addXP(500)
      addCredits(25000)
      unlockAchievement('first-launch')
      if (missionId === 'lunar-explorer') unlockAchievement('lunar-explorer')
      if (missionId === 'mars-pathfinder') unlockAchievement('mars-pathfinder')
    }
  }, [missionId, completeMissionInStore, addXP, addCredits, unlockAchievement, totalCompositeScore])

  const radarPerformanceData = [
    { subject: 'Objectives', score: Math.round((objectiveScore / 35) * 100), fullMark: 100 },
    { subject: 'Engineering', score: Math.round((engineeringScore / 25) * 100), fullMark: 100 },
    { subject: 'Operations', score: Math.max(0, Math.min(100, 70 + operationsScore * 5)), fullMark: 100 },
    { subject: 'Resources', score: Math.round((resourceScore / 20) * 100), fullMark: 100 },
    { subject: 'Science', score: decisions.scienceRetainedPct, fullMark: 100 },
    { subject: 'Budget', score: Math.round((budgetScore / 10) * 100), fullMark: 100 },
  ]

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Standardized Header */}
        <PageHeader
          eyebrow={mission ? `${mission.codename} · ${mission.destination}` : undefined}
          title="Mission debrief"
          description={`Comprehensive flight performance report and score evaluation for ${mission?.name || 'Mission'} (${mission?.destination || 'Target'}).`}
          backTo="/campaign"
          backLabel="Campaign"
          actions={
            <Button
              onClick={() => navigate('/campaign')}
              className="bg-accent-blue hover:bg-accent-blue/90 font-medium"
            >
              Return to Campaign <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          }
        />

        {/* Outcome Banner */}
        <Card className="border-status-success/30 bg-gradient-to-r from-bg-panel via-bg-elevated to-bg-panel relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-status-success/5 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-bg-secondary border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner mx-auto md:mx-0">
                <Planet3DViewer
                  type={
                    mission?.id.includes('mars')
                      ? 'mars'
                      : mission?.id.includes('lunar') || mission?.id.includes('moon')
                      ? 'moon'
                      : 'earth'
                  }
                  size={62}
                />
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-mono text-status-success font-bold uppercase mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    FLIGHT OUTCOME:{' '}
                    {totalCompositeScore >= 90
                      ? 'EXCELLENT SUCCESS'
                      : totalCompositeScore >= 75
                        ? 'MISSION SUCCESS'
                        : totalCompositeScore >= 55
                          ? 'PARTIAL SUCCESS'
                          : 'MISSION DEGRADED'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary">{mission?.name} Mission Debrief</h2>
                <p className="text-xs text-text-secondary mt-1">
                  Orbital insertion at target body achieved within nominal covariance tolerances. Scientific telemetry catalogued.
                </p>
              </div>
            </div>

            <div className="text-center md:text-right shrink-0">
              <span className="text-[10px] font-mono uppercase text-text-muted block">Composite Mission Score</span>
              <div className="text-4xl sm:text-5xl font-semibold text-status-success tracking-tight">
                {totalCompositeScore}<span className="text-2xl text-text-muted font-normal">/100</span>
              </div>
              <Badge variant="success" className="mt-1 font-mono text-[10px]">GRADE: OPTIMAL (A+)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Performance & Score Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Radar Chart (6 cols) */}
          <div className="lg:col-span-6 flex flex-col min-w-0">
            <Card className="border-white/10 flex-1 flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent-cyan" />
                  Engineering Systems Proficiency Radar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex items-center justify-center min-h-[260px]">
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarPerformanceData}>
                      <PolarGrid stroke="rgba(140,170,220,0.18)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="score" stroke="#fc3d21" fill="#fc3d21" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weighted Score Breakdown Table (6 cols) */}
          <div className="lg:col-span-6 flex flex-col min-w-0">
            <Card className="border-white/10 flex-1 flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4 text-accent-blue" />
                  Weighted Scoring Breakdown Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3 divide-y divide-white/5 text-xs font-mono">
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Primary Objective Acceptance (35% weight)</span>
                  <span className="font-bold text-status-success">{objectiveScore} / 35 pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Engineering Mass & Avionics Design (25% weight)</span>
                  <span className="font-bold text-accent-cyan">{engineeringScore} / 25 pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Power & Resource Allocation (20% weight)</span>
                  <span className="font-bold text-accent-blue">{resourceScore} / 20 pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Scientific Instrument Return (10% weight)</span>
                  <span className="font-bold text-status-warning">{scienceScore} / 10 pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Budget Fiscal Discipline (10% weight)</span>
                  <span className="font-bold text-text-primary">{budgetScore} / 10 pts</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Operations decisions ({resolvedAnomalies.length} anomal{resolvedAnomalies.length === 1 ? 'y' : 'ies'})</span>
                  <span className={`font-bold ${operationsScore > 0 ? 'text-status-success' : operationsScore < 0 ? 'text-status-danger' : 'text-text-primary'}`}>
                    {operationsScore > 0 ? '+' : ''}
                    {operationsScore} pts
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold">
                  <span className="text-text-primary">Total Evaluated Score</span>
                  <span className="text-status-success">{totalCompositeScore} / 100</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Anomaly decisions review */}
        {resolvedAnomalies.length > 0 && (
          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span>How the team handled anomalies</span>
                <span className="font-mono text-xs font-normal text-text-muted">
                  {decisions.good} good · {resolvedAnomalies.length - decisions.good - decisions.bad} acceptable · {decisions.bad} costly · science retained{' '}
                  {decisions.scienceRetainedPct}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {resolvedAnomalies.map((r) => (
                <div key={r.anomalyId} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-text-primary">{r.title}</p>
                    <span
                      className={`font-mono text-[11px] font-semibold uppercase ${
                        r.outcome.verdict === 'good' ? 'text-status-success' : r.outcome.verdict === 'bad' ? 'text-status-danger' : 'text-status-warning'
                      }`}
                    >
                      {r.outcome.verdict === 'good' ? 'Good call' : r.outcome.verdict === 'bad' ? 'Costly' : 'Acceptable'} ·{' '}
                      {r.outcome.scoreDelta > 0 ? '+' : ''}
                      {r.outcome.scoreDelta} pts
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {r.decidedBy ? `${r.decidedBy} chose` : 'Chose'}: <span className="text-text-secondary">{r.choice}</span>
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{r.outcome.result}</p>
                  <p className="mt-1 text-sm text-text-muted">{r.outcome.lesson}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rewards & Debrief Feedback Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-status-warning" />
                Commander Commendations & Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded bg-bg-elevated border border-white/5">
                <Star className="h-5 w-5 text-status-warning shrink-0" />
                <div>
                  <p className="text-xs font-bold font-mono text-status-warning">+500 Aerospace XP</p>
                  <p className="text-[10px] text-text-muted">Commander rank advancement applied</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded bg-bg-elevated border border-white/5">
                <DollarSign className="h-5 w-5 text-accent-cyan shrink-0" />
                <div>
                  <p className="text-xs font-bold font-mono text-accent-cyan">+25,000 Mission Bounty Credits</p>
                  <p className="text-[10px] text-text-muted">Added to research & hardware balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Compass className="h-4 w-4 text-accent-cyan" />
                Flight Analysis & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-2 text-xs text-text-secondary leading-relaxed">
              <p>
                &bull; <strong>Trajectory Efficiency:</strong> Specific impulse of chosen thrusters generated sufficient delta-v margin to counter orbital mascon drift.
              </p>
              <p>
                &bull; <strong>Power Balance:</strong> Solar array surface area provided positive generation through sunlight phases, buffering battery discharge during eclipse.
              </p>
              <p>
                &bull; <strong>Next Step:</strong> Subsequent campaign initiatives now unlocked in Campaign Operations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button variant="outline" asChild className="text-xs">
            <Link to={`/designer/${missionId}`}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reconfigure Spacecraft
            </Link>
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/campaign')}
            className="w-full sm:w-auto bg-accent-blue hover:bg-accent-blue/90 font-bold px-8 text-sm"
          >
            Advance Campaign Operations <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </PageContainer>
  )
}
