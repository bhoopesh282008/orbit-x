import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Rocket,
  AlertTriangle,
  Scale,
  DollarSign,
  Zap,
  Info,
  Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import { useCrewView } from '@/stores/crewStore'
import { LAUNCH_VEHICLES } from '@/data/launchVehicles'
import { Rocket3DViewer } from '@/three/components/rockets/LaunchVehicle'

export default function LaunchPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)

  const selectedVehicle = useSpacecraftStore((s) => s.selectedLaunchVehicle)
  const setLaunchVehicle = useSpacecraftStore((s) => s.setLaunchVehicle)
  const totalMass = useSpacecraftStore((s) => s.getTotalMass())
  const spacecraftCost = useSpacecraftStore((s) => s.selectedComponents.reduce((sum, c) => sum + c.cost, 0))

  const crew = useCrewView()
  const handleSelectRocket = (vehicle: typeof LAUNCH_VEHICLES[0]) => {
    // In co-op, choosing the rocket is the Flight Director's call
    if (!crew.canEdit('director')) return
    setLaunchVehicle(vehicle)
  }

  return (
    <PageContainer>
      {/* Standardized Header */}
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : undefined}
        title="Choose a launch vehicle"
        description={`Size and assign booster rocket stages for ${mission?.name || 'Mission'} (${mission?.destination || 'Target'}). Ensure payload mass is within rocket lift limits.`}
        backTo={`/designer/${missionId}`}
        backLabel="Spacecraft workstation"
        actions={
          <Button
            size="sm"
            disabled={!selectedVehicle}
            onClick={() => navigate(`/validation/${missionId}`)}
            className="bg-accent-blue hover:bg-accent-blue/90"
          >
            Proceed to Validation <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        }
      />

      {crew.team && !crew.canEdit('director') && (
        <p className="rounded-xl border border-status-warning/30 bg-status-warning/[0.07] px-4 py-3 text-sm text-text-secondary">
          Choosing the rocket is the Flight Director’s call — hand the console to{' '}
          <span className="font-semibold text-text-primary">{crew.ownerOf('director').name}</span> to change it.
        </p>
      )}

      {/* Overview Info Banner */}
      <Card className="border-white/10 bg-bg-panel">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-accent-blue shrink-0" />
            <div>
              <p className="font-bold text-text-primary">Flight Vehicle Sizing & Lift Envelope</p>
              <p className="text-text-muted">
                Match your assembled spacecraft wet mass against booster payload capability to clear launch validation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right shrink-0">
            <div>
              <span className="text-text-muted block text-[10px]">SPACECRAFT WET MASS</span>
              <span className="font-bold text-accent-cyan text-sm">{totalMass} kg</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px]">CHASSIS COST</span>
              <span className="font-bold text-sm text-text-primary">{spacecraftCost.toLocaleString()} cr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Rocket Options Grid with Equal-Height Balanced Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {LAUNCH_VEHICLES.map((vehicle) => {
          const isSelected = selectedVehicle?.id === vehicle.id
          const isCompatible = totalMass <= vehicle.payloadCapacity
          const combinedCost = spacecraftCost + vehicle.cost
          const isOverBudget = combinedCost > (mission?.budget ?? 0)

          return (
            <motion.div
              key={vehicle.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full"
            >
              <Card
                onClick={() => handleSelectRocket(vehicle)}
                className={`flex-1 flex flex-col justify-between cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-accent-blue ring-2 ring-accent-blue/30 bg-bg-elevated'
                    : 'border-white/10 hover:border-white/20 bg-bg-panel'
                }`}
              >
                <div>
                  {/* Interactive 3D Launch Vehicle Display */}
                  <div className="h-48 rounded-t-xl bg-gradient-to-b from-bg-secondary via-[#0a1428] to-bg-panel flex flex-col items-center justify-center relative overflow-hidden border-b border-white/5">
                    <Rocket3DViewer vehicleId={vehicle.id} />

                    <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                      <Badge variant={isSelected ? 'default' : 'outline'} className="text-[10px]">
                        {isSelected ? 'SELECTED' : 'READY'}
                      </Badge>
                    </div>

                    <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                      <span className="text-[9px] font-mono text-text-muted bg-bg-panel/80 px-1.5 py-0.5 rounded">
                        3D PBR Model
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base leading-tight text-text-primary">{vehicle.name}</h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{vehicle.description}</p>
                    </div>

                    {/* Specs Table */}
                    <div className="space-y-2 py-2.5 border-y border-white/5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-text-muted flex items-center gap-1">
                          <Scale className="h-3 w-3" /> Lift Capacity:
                        </span>
                        <span className={`font-bold ${!isCompatible ? 'text-status-danger' : 'text-text-primary'}`}>
                          {vehicle.payloadCapacity.toLocaleString()} kg
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-text-muted flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Vehicle Cost:
                        </span>
                        <span className="font-bold text-accent-cyan">
                          {vehicle.cost.toLocaleString()} cr
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-text-muted flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Upper Stage &Delta;v:
                        </span>
                        <span className="font-bold text-status-warning">
                          +{vehicle.maxDeltaV.toLocaleString()} m/s
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-text-muted">Reliability:</span>
                        <span className="font-bold text-status-success">
                          {(vehicle.reliability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Warnings */}
                    {!isCompatible && (
                      <div className="p-2 rounded bg-status-danger/10 border border-status-danger/20 flex items-center gap-2 text-[11px] text-status-danger font-mono">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Exceeds lift limit by {totalMass - vehicle.payloadCapacity} kg</span>
                      </div>
                    )}

                    {isOverBudget && (
                      <div className="p-2 rounded bg-status-warning/10 border border-status-warning/20 flex items-center gap-2 text-[11px] text-status-warning font-mono">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Combined cost exceeds mission allocation</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="p-4 sm:p-5 pt-0 mt-auto">
                  <Button
                    variant={isSelected ? 'default' : 'secondary'}
                    className="w-full text-xs font-mono"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectRocket(vehicle)
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" /> Vehicle Assigned
                      </>
                    ) : (
                      'Select Flight Vehicle'
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </PageContainer>
  )
}
