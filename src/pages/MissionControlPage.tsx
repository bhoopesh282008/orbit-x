import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Activity,
  Zap,
  Radio,
  Thermometer,
  ShieldAlert,
  Terminal,
  Play,
  Pause,
  Trophy,
  AlertTriangle,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useAdvancedSimulationStore } from '@/stores/advancedSimulationStore'
import { COMMAND_ALLOWLIST, type CommandId } from '@/services/commandSystem'
import { SpaceOrbitScene } from '@/components/simulation/SpaceOrbitScene'
import { AnomalyConsole, DecisionLog } from '@/components/mission/AnomalyConsole'
import { useAnomalyStore } from '@/stores/anomalyStore'

export default function MissionControlPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)
  const components = useSpacecraftStore((s) => s.selectedComponents)

  const simTimeSeconds = useAdvancedSimulationStore((s) => s.simTimeSeconds)
  const timeMultiplier = useAdvancedSimulationStore((s) => s.timeMultiplier)
  const isPaused = useAdvancedSimulationStore((s) => s.isPaused)
  const thermal = useAdvancedSimulationStore((s) => s.thermal)
  const power = useAdvancedSimulationStore((s) => s.power)
  const comm = useAdvancedSimulationStore((s) => s.comm)
  const science = useAdvancedSimulationStore((s) => s.science)
  const health = useAdvancedSimulationStore((s) => s.health)
  const inEclipse = useAdvancedSimulationStore((s) => s.inEclipse)
  const groundStations = useAdvancedSimulationStore((s) => s.groundStations)
  const commandHistory = useAdvancedSimulationStore((s) => s.commandHistory)
  const alarms = useAdvancedSimulationStore((s) => s.alarms)

  const initializeSimulation = useAdvancedSimulationStore((s) => s.initializeSimulation)
  const advanceSimulationStep = useAdvancedSimulationStore((s) => s.advanceSimulationStep)
  const setSimulationSpeed = useAdvancedSimulationStore((s) => s.setSimulationSpeed)
  const togglePause = useAdvancedSimulationStore((s) => s.togglePause)
  const queueCommand = useAdvancedSimulationStore((s) => s.queueCommand)
  const acknowledgeAlarm = useAdvancedSimulationStore((s) => s.acknowledgeAlarm)

  useEffect(() => {
    if (missionId && components.length > 0) {
      initializeSimulation(missionId, components)
      // Each run of the mission clock starts with a clean anomaly record
      useAnomalyStore.getState().reset(missionId)
    }
  }, [missionId, components, initializeSimulation])

  // Simulation tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      advanceSimulationStep(1 * timeMultiplier, components)
    }, 1000)
    return () => clearInterval(interval)
  }, [timeMultiplier, components, advanceSimulationStep])

  const formatMET = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = Math.floor(totalSeconds % 60)
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const activeGroundStation = groundStations.find((g) => g.contactActive)

  return (
    <PageContainer variant="wide" className="space-y-4">
      {/* Flight Director Header */}
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : 'Operations'}
        title="Mission control"
        description={`Real-time telemetry downlinks, deep-space communication tracking, and avionics command uplinks for ${mission?.name || 'Mission'}.`}
        backTo={`/launch-operations/${missionId}`}
        backLabel="Launch operations"
        badge={
          <Badge variant={health.safeModeActive ? 'danger' : 'success'} className="font-mono text-xs">
            {health.safeModeActive ? 'Safe mode' : 'Nominal'}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Simulation controls */}
            <div className="flex items-center rounded-lg bg-bg-secondary p-1 border border-white/5">
              <Button size="sm" variant="ghost" onClick={togglePause} className="h-7 px-2.5 text-xs text-accent-cyan">
                {isPaused ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
                {isPaused ? 'Resume Clock' : 'Pause'}
              </Button>
            </div>

            {/* Speeds */}
            <div className="flex items-center gap-1 rounded-lg bg-bg-secondary p-1 border border-white/5">
              {[1, 5, 10, 50].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimulationSpeed(s)}
                  className={`h-7 px-2 text-xs font-mono rounded transition-colors cursor-pointer ${
                    timeMultiplier === s
                      ? 'bg-accent-blue text-white font-bold'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => navigate(`/results/${missionId}`)}
              className="bg-status-success hover:bg-status-success/90 font-bold text-xs"
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5" /> Complete & Generate Debrief
            </Button>
          </div>
        }
      />

      {/* Top Real-time Astrodynamics Viewport & Ground Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[460px]">
        {/* 3D Celestial Scene (8 cols) */}
        <div className="lg:col-span-8 min-h-[380px] lg:min-h-[480px] rounded-xl overflow-hidden border border-white/10 relative">
          <SpaceOrbitScene
            destination={mission?.destination ?? 'Moon'}
            progress={Math.min((simTimeSeconds / 600) * 100, 100)}
            cameraMode="follow"
          />

          <div className="absolute top-3 right-3 bg-bg-panel/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
            <span className="text-text-muted">MET: </span>
            <span className="text-status-success font-bold">{formatMET(simTimeSeconds)}</span>
          </div>
        </div>

        {/* Real-time Subsystem Gauges Rack (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 min-w-0">
          <Card className="border-white/10 flex-1 flex flex-col">
            <CardHeader className="p-3.5 pb-2 border-b border-white/5">
              <CardTitle className="text-xs uppercase font-mono tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-accent-cyan">
                  <Activity className="h-4 w-4" /> Real-time Subsystem Rack
                </span>
                <Badge variant={inEclipse ? 'warning' : 'success'} className="text-[9px] font-mono">
                  {inEclipse ? 'IN ECLIPSE (SHADOW)' : 'SOLAR TRACKING'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 text-xs font-mono overflow-y-auto max-h-[400px]">
              {/* Power */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted flex items-center gap-1">
                    <Zap className="h-3 w-3 text-status-warning" /> EPS Power Balance:
                  </span>
                  <span className={power.netBalanceWatts >= 0 ? 'text-status-success font-bold' : 'text-status-danger font-bold'}>
                    {power.netBalanceWatts >= 0 ? `+${power.netBalanceWatts} W` : `${power.netBalanceWatts} W`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Gen: {power.generationWatts}W</span>
                  <span>Load: {power.consumptionWatts}W</span>
                </div>
                <Progress value={power.batteryChargePercent} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Battery SoC:</span>
                  <span className="text-text-primary font-bold">{power.batteryChargePercent}%</span>
                </div>
              </div>

              {/* Thermal */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span className="text-text-muted flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-accent-blue" /> Bus Core Temperature:
                  </span>
                  <span className="text-text-primary font-bold">{thermal.busTemperatureC} °C</span>
                </div>
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Payload: {thermal.payloadTemperatureC} °C</span>
                  <span className={thermal.heaterActive ? 'text-status-warning' : 'text-text-muted'}>
                    Heaters: {thermal.heaterActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Comms & Ground Station */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span className="text-text-muted flex items-center gap-1">
                    <Radio className="h-3 w-3 text-accent-cyan" /> DSN Link Margin:
                  </span>
                  <span className="text-status-success font-bold">+{comm.linkMarginDb} dB</span>
                </div>
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Data Rate: {comm.dataRateKbps} kbps</span>
                  <span>Latency: {comm.latencySeconds}s</span>
                </div>
                <p className="text-[10px] text-text-muted truncate pt-0.5">
                  Ground Complex: {activeGroundStation ? `${activeGroundStation.name} (${activeGroundStation.code})` : 'Awaiting Horizon Pass'}
                </p>
              </div>

              {/* Scientific Buffer */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Science Data Buffer:</span>
                  <span className="text-accent-cyan font-bold">{science.storedDataMb} / {science.maxStorageMb} MB</span>
                </div>
                <Progress value={(science.storedDataMb / science.maxStorageMb) * 100} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Total Collected: {science.totalDataCollectedMb} MB</span>
                  <span>Downlinked: {Math.round(science.totalDataCollectedMb - science.storedDataMb)} MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {missionId && <AnomalyConsole missionId={missionId} />}
      {missionId && <DecisionLog missionId={missionId} />}

      {/* Flight Director Command Uplink & Alarm Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Command Uplink Terminal (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card className="border-white/10">
            <CardHeader className="p-3.5 pb-2 border-b border-white/5">
              <CardTitle className="text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-accent-cyan" />
                Interactive Flight Command Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              <p className="text-xs text-text-secondary">
                Select an authorized telemetry command to uplink via Deep Space Network carrier:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'CMD_SAFE_MODE_ENTER',
                  'CMD_SAFE_MODE_EXIT',
                  'CMD_ATTITUDE_POINT_SUN',
                  'CMD_ATTITUDE_POINT_EARTH',
                  'CMD_DATA_DOWNLINK_START',
                  'CMD_THERMAL_HEATER_OVERRIDE',
                ].map((cmdId) => {
                  const cmd = COMMAND_ALLOWLIST[cmdId as CommandId]
                  return (
                    <button
                      key={cmdId}
                      onClick={() => queueCommand(cmdId as CommandId)}
                      className="p-2.5 rounded-lg border border-white/10 bg-bg-elevated hover:bg-accent-blue/15 hover:border-accent-blue/40 text-left transition-all text-xs font-mono group cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-text-primary group-hover:text-accent-cyan">
                        <span>{cmd.name}</span>
                        <Send className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1 truncate">{cmd.description}</p>
                    </button>
                  )
                })}
              </div>

              {/* Command History log */}
              <div className="pt-2 border-t border-white/5 space-y-1.5 font-mono text-xs">
                <span className="text-[10px] text-text-muted uppercase">Uplink Acknowledgment Stream:</span>
                <div className="bg-bg-elevated p-2 rounded-lg max-h-24 overflow-y-auto space-y-1 text-[11px]">
                  {commandHistory.length === 0 ? (
                    <span className="text-text-muted">Awaiting operator uplink commands...</span>
                  ) : (
                    commandHistory.map((h) => (
                      <div key={h.queueId} className="flex justify-between items-center text-[10px]">
                        <span className="text-accent-cyan font-bold">{h.commandId}</span>
                        <span className="text-status-success">ACK T+{h.timestamp}s</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flight Alarm & Event Log (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card className="border-white/10">
            <CardHeader className="p-3.5 pb-2 border-b border-white/5">
              <CardTitle className="text-xs uppercase font-mono tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2 text-status-warning">
                  <ShieldAlert className="h-4 w-4" />
                  Spacecraft Fault & Alarm Center
                </span>
                <span className="text-[10px] text-text-muted">{alarms.length} EVENTS</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 ${
                    alarm.severity === 'WARNING'
                      ? 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                      : alarm.severity === 'CAUTION'
                      ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                      : 'bg-bg-elevated border-white/5 text-text-primary'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[11px]">{alarm.title}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {alarm.subsystem}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">{alarm.condition}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Rec: {alarm.recommendedAction}</p>
                    </div>
                  </div>
                  {!alarm.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlarm(alarm.id)}
                      className="text-[10px] h-6 px-2 shrink-0"
                    >
                      ACK
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
