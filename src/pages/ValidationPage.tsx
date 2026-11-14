import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Rocket,
  Wrench,
  Compass,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useMissionPlannerStore } from '@/stores/missionPlannerStore'
import { SpacecraftViewer } from '@/components/designer/SpacecraftViewer'
import { validateSpacecraftMission } from '@/services/simulationEngine'

export default function ValidationPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)

  const components = useSpacecraftStore((s) => s.selectedComponents)
  const vehicle = useSpacecraftStore((s) => s.selectedLaunchVehicle)
  const autoEquipFlightReady = useSpacecraftStore((s) => s.autoEquipFlightReady)
  const ensureMandatoryInstruments = useSpacecraftStore((s) => s.ensureMandatoryInstruments)
  const userReserveDeltaVMargin = useMissionPlannerStore((s) => s.userReserveDeltaVMargin)

  // Ensure mandatory instruments are installed when viewing validation
  useEffect(() => {
    if (mission?.requiredInstruments && mission.requiredInstruments.length > 0) {
      ensureMandatoryInstruments(mission.requiredInstruments)
    }
  }, [missionId, mission?.requiredInstruments, ensureMandatoryInstruments])

  const report = validateSpacecraftMission(components, vehicle, mission, userReserveDeltaVMargin)

  const handleAutoEquip = () => {
    autoEquipFlightReady({
      requiredInstruments: mission?.requiredInstruments,
      minDeltaV: (mission?.minDeltaV ?? 3200) + userReserveDeltaVMargin,
      destination: mission?.destination,
    })
  }

  return (
    <PageContainer>
      {/* Standardized Header */}
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : undefined}
        title="Pre-flight validation"
        description={`Formal Systems Readiness Review (SRR) for ${mission?.name || 'Mission'}. All mandatory engineering checks must pass to authorize launch.`}
        backTo={`/launch/${missionId}`}
        backLabel="Launch vehicle"
        actions={
          <div className="flex items-center gap-2">
            {!report.overallPass && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoEquip}
                className="text-xs border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Auto-Equip Flight Ready
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to={`/designer/${missionId}`}>
                <Wrench className="h-3.5 w-3.5 mr-1.5" /> Reconfigure Chassis
              </Link>
            </Button>
            {!report.overallPass && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/launch-operations/${missionId}`)}
                className="text-xs border-status-danger/40 text-status-danger hover:bg-status-danger/10"
                title="Fly this design as-is and see exactly how it fails"
              >
                Launch anyway
              </Button>
            )}
            <Button
              size="sm"
              disabled={!report.overallPass}
              onClick={() => navigate(`/launch-operations/${missionId}`)}
              className={
                report.overallPass
                  ? 'bg-status-success hover:bg-status-success/90 shadow-sm shadow-status-success/20 font-bold text-xs'
                  : 'opacity-50 cursor-not-allowed text-xs'
              }
            >
              <Rocket className="h-3.5 w-3.5 mr-1.5" /> Authorize Launch Sequence
            </Button>
          </div>
        }
      />

      {/* Primary Readiness Status Banner */}
      <Card
        className={`border ${
          report.overallPass
            ? 'border-status-success/30 bg-status-success/5'
            : 'border-status-danger/30 bg-status-danger/5'
        }`}
      >
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 mx-auto md:mx-0 ${
                report.overallPass
                  ? 'bg-status-success/20 text-status-success'
                  : 'bg-status-danger/20 text-status-danger'
              }`}
            >
              {report.overallPass ? <ShieldCheck className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary">
                {report.overallPass
                  ? 'FLIGHT READINESS APPROVED (GO FOR LAUNCH)'
                  : 'FLIGHT CLEARANCE REVOKED (NO-GO)'}
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {report.overallPass
                  ? 'All mandatory structural, delta-v, communication, and power constraints satisfy flight safety margins.'
                  : 'Critical engineering violations detected. Correct failed parameters before initiating orbital countdown.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-center font-mono w-full md:w-auto">
            <div className="bg-bg-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-text-muted uppercase block">Available &Delta;v</span>
              <span className="text-sm font-bold text-accent-cyan">{report.deltaV.toLocaleString()} m/s</span>
            </div>
            <div className="bg-bg-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-text-muted uppercase block">Required &Delta;v</span>
              <span className="text-sm font-bold text-text-primary">
                {report.metrics.requiredMissionDeltaV.toLocaleString()} m/s
              </span>
            </div>
            <div className="bg-bg-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-text-muted uppercase block">Wet Mass</span>
              <span className="text-sm font-bold text-text-primary">{report.totalMass.toLocaleString()} kg</span>
            </div>
            <div className="bg-bg-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-text-muted uppercase block">Power Margin</span>
              <span className={`text-sm font-bold ${report.powerBalance >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                {report.powerBalance >= 0 ? `+${report.powerBalance}` : report.powerBalance} W
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3D Spacecraft Pre-Flight Inspection Canvas Viewport */}
      {components.length > 0 && (
        <Card className="border-white/10 overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-accent-cyan" />
              Pre-Flight 360° Spacecraft Payload Inspection
            </CardTitle>
            <span className="text-[11px] font-mono text-text-muted">
              {components.length} Integrated Flight Modules
            </span>
          </CardHeader>
          <CardContent className="p-0 h-[280px] sm:h-[320px] relative">
            <SpacecraftViewer components={components} />
          </CardContent>
        </Card>
      )}

      {/* Detailed Inspection Checklist */}
      <Card className="border-white/10">
        <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Compass className="h-4.5 w-4.5 text-accent-blue" />
            Engineering Acceptance Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 divide-y divide-white/5">
          {report.items.map((item, idx) => {
            const isPass = item.status === 'pass'
            const isWarning = item.status === 'warning'

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isPass && <CheckCircle2 className="h-4.5 w-4.5 text-status-success" />}
                    {isWarning && <AlertTriangle className="h-4.5 w-4.5 text-status-warning" />}
                    {!isPass && !isWarning && <XCircle className="h-4.5 w-4.5 text-status-danger" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{item.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {item.metric && (
                    <span className="text-xs font-mono font-medium text-text-primary bg-bg-elevated px-2 py-1 rounded border border-white/5">
                      {item.metric}
                    </span>
                  )}
                  {!isPass && item.category === 'Launch Vehicle' && (
                    <Button variant="outline" size="sm" asChild className="h-7 text-[11px] px-2 text-accent-cyan border-accent-cyan/30">
                      <Link to={`/launch/${missionId}`}>Select Booster</Link>
                    </Button>
                  )}
                  {!isPass && item.category !== 'Launch Vehicle' && (
                    <Button variant="outline" size="sm" asChild className="h-7 text-[11px] px-2 text-accent-blue border-accent-blue/30">
                      <Link to={`/designer/${missionId}`}>Configure</Link>
                    </Button>
                  )}
                  <Badge
                    variant={isPass ? 'success' : isWarning ? 'warning' : 'danger'}
                    className="font-mono text-[10px] uppercase tracking-wider"
                  >
                    {item.status}
                  </Badge>
                </div>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" asChild className="text-xs text-text-secondary">
          <Link to={`/launch/${missionId}`}>
            &larr; Return to Launch Bay
          </Link>
        </Button>

        {report.overallPass && (
          <Button
            size="lg"
            onClick={() => navigate(`/simulation/${missionId}`)}
            className="bg-accent-blue hover:bg-accent-blue/90 font-bold px-6 text-sm"
          >
            Initiate Flight Simulation <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </PageContainer>
  )
}
