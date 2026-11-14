import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Plus,
  Check,
  X,
  RotateCcw,
  Wand2,
  Box,
  Flame,
  Fuel,
  Sun,
  BatteryMedium,
  RadioTower,
  ScanEye,
  CircleAlert,
  CircleCheck,
  Replace,
  Lightbulb,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMissionStore } from '@/stores/missionStore'
import { useSpacecraftStore } from '@/stores/spacecraftStore'
import type { ComponentCategory, SpacecraftComponent } from '@/stores/spacecraftStore'
import { adviseDesign, autoResolve, type DesignHint, type FixAction } from '@/services/designAdvisor'
import { COMPONENT_CATALOGUE } from '@/data/components'
import { MISSION_SCIENCE, RELEVANCE_LABEL } from '@/data/missionScience'
import { CrewBar, OwnerLock } from '@/components/crew/CrewBar'
import { roleForCategory, roleInfo, useCrewView } from '@/stores/crewStore'
import { SpacecraftViewer } from '@/components/designer/SpacecraftViewer'
import { cn } from '@/lib/utils'

const categories: { id: ComponentCategory; label: string; icon: LucideIcon; single: boolean }[] = [
  { id: 'structure', label: 'Bus', icon: Box, single: true },
  { id: 'propulsion', label: 'Engine', icon: Flame, single: true },
  { id: 'fuel', label: 'Tank', icon: Fuel, single: true },
  { id: 'power', label: 'Solar', icon: Sun, single: false },
  { id: 'energy', label: 'Battery', icon: BatteryMedium, single: true },
  { id: 'communication', label: 'Comms', icon: RadioTower, single: true },
  { id: 'instruments', label: 'Science', icon: ScanEye, single: false },
]

const ease = [0.16, 1, 0.3, 1] as const

/** Horizontal budget meter: value, limit, fill bar and a plain-language detail line. */
function BudgetMeter({
  label,
  value,
  limit,
  pct,
  state,
  detail,
  hint,
  onApply,
  blockedBy,
}: {
  label: string
  value: string
  limit?: string
  pct: number
  state: 'ok' | 'warn' | 'bad'
  detail: string
  hint?: DesignHint
  onApply?: (action: FixAction) => void
  /** Co-op: who must apply this fix when it isn't the active player's subsystem */
  blockedBy?: (action: FixAction) => string | null
}) {
  const bar =state === 'bad' ? 'bg-status-danger' : state === 'warn' ? 'bg-status-warning' : 'bg-accent-blue'
  const text = state === 'bad' ? 'text-status-danger' : state === 'warn' ? 'text-status-warning' : 'text-text-primary'
  return (
    <div className="min-w-0 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow !text-[10px]">{label}</span>
        {limit && <span className="truncate font-mono text-[10.5px] text-text-muted">of {limit}</span>}
      </div>
      <p className={cn('mt-1.5 font-mono text-lg font-semibold leading-none tracking-tight', text)}>{value}</p>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={cn('h-full rounded-full', bar)}
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          transition={{ duration: 0.6, ease }}
        />
      </div>
      <p className="mt-1.5 truncate text-[11px] text-text-muted">{detail}</p>
      {hint && (
        <div
          className={cn(
            'mt-2.5 rounded-lg border px-2.5 py-2 text-[11.5px] leading-snug',
            hint.severity === 'bad'
              ? 'border-status-danger/30 bg-status-danger/[0.07]'
              : 'border-status-warning/30 bg-status-warning/[0.06]'
          )}
          role="note"
        >
          <p className="text-text-secondary">{hint.why}</p>
          <p className="mt-1 flex items-start gap-1.5 font-medium text-text-primary">
            <Lightbulb className={cn('mt-[1px] h-3.5 w-3.5 shrink-0', hint.severity === 'bad' ? 'text-status-danger' : 'text-status-warning')} />
            <span>{hint.fix}</span>
          </p>
          {hint.action && blockedBy?.(hint.action) && (
            <p className="mt-2 text-[11px] text-text-muted">Hand the console to {blockedBy(hint.action)} to apply this.</p>
          )}
          {hint.action && onApply && !blockedBy?.(hint.action) && (
            <button
              onClick={() => onApply(hint.action!)}
              className="mt-2 rounded-md bg-white/[0.08] px-2 py-1 text-[11px] font-semibold text-text-primary transition hover:bg-white/[0.14]"
            >
              Apply fix
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DesignerPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const missions = useMissionStore((s) => s.missions)
  const mission = missions.find((m) => m.id === missionId)

  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('structure')
  const [inspectedComponent, setInspectedComponent] = useState<SpacecraftComponent | null>(null)

  const selectedComponents = useSpacecraftStore((s) => s.selectedComponents)
  const addComponent = useSpacecraftStore((s) => s.addComponent)
  const removeComponent = useSpacecraftStore((s) => s.removeComponent)
  const clearDesign = useSpacecraftStore((s) => s.clearDesign)
  const ensureMandatoryInstruments = useSpacecraftStore((s) => s.ensureMandatoryInstruments)
  const autoEquipFlightReady = useSpacecraftStore((s) => s.autoEquipFlightReady)

  // Equip the mission's mandatory instruments when entering the designer
  useEffect(() => {
    if (mission?.requiredInstruments && mission.requiredInstruments.length > 0) {
      ensureMandatoryInstruments(mission.requiredInstruments)
    }
  }, [missionId, mission?.requiredInstruments, ensureMandatoryInstruments])

  const totalMass = useSpacecraftStore((s) => s.getTotalMass())
  const totalCost = useSpacecraftStore((s) => s.getTotalCost())
  const powerGen = useSpacecraftStore((s) => s.getPowerGeneration())
  const powerCon = useSpacecraftStore((s) => s.getPowerConsumption())
  const powerBalance = powerGen - powerCon

  const maxMass = mission?.maxPayloadMass ?? 0
  const budget = mission?.budget ?? 0
  const budgetRemaining = budget - totalCost
  const isOverMass = totalMass > maxMass
  const isOverBudget = budgetRemaining < 0
  const isPowerDeficit = powerBalance < 0

  const filled = (cat: ComponentCategory) => selectedComponents.some((c) => c.category === cat)

  const checklist = useMemo(() => {
    const items: { ok: boolean; label: string; fix?: ComponentCategory }[] = [
      { ok: filled('structure'), label: 'Spacecraft bus fitted', fix: 'structure' },
      { ok: filled('propulsion'), label: 'Main engine fitted', fix: 'propulsion' },
      { ok: filled('fuel'), label: 'Propellant tank fitted', fix: 'fuel' },
      { ok: filled('power'), label: 'Solar generation fitted', fix: 'power' },
      { ok: filled('communication'), label: 'Ground link fitted', fix: 'communication' },
      ...(mission?.requiredInstruments ?? []).map((inst) => ({
        ok: selectedComponents.some((c) => c.id === `inst-${inst}` || c.id.includes(inst)),
        label: `Required instrument: ${inst}`,
        fix: 'instruments' as ComponentCategory,
      })),
      { ok: !isOverMass, label: `Mass within ${maxMass.toLocaleString()} kg limit` },
      { ok: !isOverBudget, label: 'Cost within mission budget' },
      { ok: !isPowerDeficit, label: 'Power generation covers load' },
    ]
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComponents, mission, isOverMass, isOverBudget, isPowerDeficit, maxMass])

  const selectedVehicle = useSpacecraftStore((s) => s.selectedLaunchVehicle)
  const replaceComponent = useSpacecraftStore((s) => s.replaceComponent)
  const hints = useMemo(
    () =>
      adviseDesign(selectedComponents, {
        maxMass,
        budget,
        vehicleCost: selectedVehicle?.cost ?? 0,
        requiredInstruments: mission?.requiredInstruments ?? [],
        destination: mission?.destination,
      }),
    [selectedComponents, maxMass, budget, selectedVehicle, mission?.requiredInstruments, mission?.destination]
  )
  const applyFix = (a: FixAction) => {
    if (a.remove && a.add) replaceComponent(a.remove.id, a.add)
    else if (a.remove) removeComponent(a.remove.id)
    else if (a.add) addComponent(a.add)
  }

  const crew = useCrewView()
  const isDirector = crew.canEdit('director')
  /** In co-op, a fix may only touch the active player's own subsystems. */
  const fixOwners = (a: FixAction) => [a.remove?.category, a.add?.category].filter(Boolean).map((c) => roleForCategory(c!))
  const fixBlockedBy = (a: FixAction) => {
    const blocked = fixOwners(a).find((r) => !crew.canEdit(r))
    return blocked ? `${crew.ownerOf(blocked).name} (${roleInfo(blocked).short})` : null
  }

  const blocking = checklist.filter((c) => !c.ok)
  const ready = blocking.length === 0

  const filteredCatalogue = COMPONENT_CATALOGUE.filter((c) => c.category === activeCategory)
  const activeMeta = categories.find((c) => c.id === activeCategory)!
  const occupant = activeMeta.single ? selectedComponents.find((c) => c.category === activeCategory) : undefined

  const handleToggleComponent = (comp: SpacecraftComponent) => {
    const isInstalled = selectedComponents.some((c) => c.id === comp.id)
    if (isInstalled) {
      removeComponent(comp.id)
    } else {
      if (['structure', 'propulsion', 'fuel', 'energy', 'communication'].includes(comp.category)) {
        const existing = selectedComponents.find((c) => c.category === comp.category)
        if (existing) removeComponent(existing.id)
      }
      addComponent(comp)
    }
    setInspectedComponent(comp)
  }

  const handleAutoFit = () => {
    autoEquipFlightReady({
      requiredInstruments: mission?.requiredInstruments,
      minDeltaV: mission?.minDeltaV,
      destination: mission?.destination,
    })
    // Then trim the baseline until it fits mass, budget and power
    const fitted = useSpacecraftStore.getState()
    useSpacecraftStore.setState({
      selectedComponents: autoResolve(fitted.selectedComponents, {
        maxMass,
        budget,
        vehicleCost: fitted.selectedLaunchVehicle?.cost ?? 0,
        requiredInstruments: mission?.requiredInstruments ?? [],
        destination: mission?.destination,
      }),
    })
  }

  return (
    <PageContainer variant="wide" className="space-y-5">
      <PageHeader
        eyebrow={mission ? `${mission.codename} · ${mission.destination}` : 'Spacecraft design'}
        title="Spacecraft workstation"
        description={`Fit a bus, engine, tank, power, comms and instruments for ${mission?.name ?? 'this mission'}. Every part changes mass, cost and power.`}
        backTo={`/campaign/${missionId}`}
        backLabel="Mission briefing"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={clearDesign} disabled={selectedComponents.length === 0 || !isDirector} title={isDirector ? undefined : 'Only the Flight Director can reset the whole design'}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button variant="secondary" size="sm" onClick={handleAutoFit} disabled={!isDirector} title={isDirector ? 'Fit a flight-ready baseline for this mission' : 'Only the Flight Director can auto-fit the whole spacecraft'}>
              <Wand2 className="h-3.5 w-3.5" /> Auto-fit baseline
            </Button>
            <Button asChild size="sm" variant={ready ? 'default' : 'secondary'}>
              <Link to={`/launch/${missionId}`}>
                {ready ? 'Proceed to launch' : `Proceed (${blocking.length} open)`} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      {/* Budget strip */}
      <div className="panel-surface grid grid-cols-2 divide-white/[0.06] overflow-hidden rounded-2xl md:grid-cols-4 md:divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-white/[0.06] md:[&>*:nth-child(n+3)]:border-t-0">
        <BudgetMeter
          label="Mass"
          value={`${totalMass.toLocaleString()} kg`}
          limit={`${maxMass.toLocaleString()} kg`}
          pct={maxMass ? (totalMass / maxMass) * 100 : 0}
          state={isOverMass ? 'bad' : totalMass > maxMass * 0.9 ? 'warn' : 'ok'}
          detail={isOverMass ? `${(totalMass - maxMass).toLocaleString()} kg over the limit` : `${(maxMass - totalMass).toLocaleString()} kg margin`}
          hint={hints.mass}
          onApply={applyFix}
          blockedBy={fixBlockedBy}
        />
        <BudgetMeter
          label="Cost"
          value={`${totalCost.toLocaleString()} cr`}
          limit={`${budget.toLocaleString()} cr`}
          pct={budget ? (totalCost / budget) * 100 : 0}
          state={isOverBudget ? 'bad' : totalCost > budget * 0.9 ? 'warn' : 'ok'}
          detail={isOverBudget ? `${Math.abs(budgetRemaining).toLocaleString()} cr over budget` : `${budgetRemaining.toLocaleString()} cr left`}
          hint={hints.cost}
          onApply={applyFix}
          blockedBy={fixBlockedBy}
        />
        <BudgetMeter
          label="Power balance"
          value={`${powerBalance > 0 ? '+' : ''}${powerBalance} W`}
          pct={powerGen ? (powerCon / powerGen) * 100 : powerCon ? 100 : 0}
          state={isPowerDeficit ? 'bad' : powerGen && powerCon / powerGen > 0.85 ? 'warn' : 'ok'}
          detail={`${powerGen} W generated · ${powerCon} W drawn`}
          hint={hints.power}
          onApply={applyFix}
          blockedBy={fixBlockedBy}
        />
        <BudgetMeter
          label="Flight readiness"
          value={`${checklist.length - blocking.length}/${checklist.length}`}
          pct={((checklist.length - blocking.length) / checklist.length) * 100}
          state={ready ? 'ok' : blocking.length > 3 ? 'bad' : 'warn'}
          detail={ready ? 'All checks pass' : `${blocking.length} check${blocking.length === 1 ? '' : 's'} open`}
        />
      </div>

      <CrewBar components={selectedComponents} vehicleCost={selectedVehicle?.cost ?? 0} budget={budget} />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {/* Catalogue */}
        <section className="flex min-w-0 flex-col gap-3 lg:col-span-3" aria-label="Component catalogue">
          <div className="panel-surface grid grid-cols-4 gap-1 rounded-xl p-1 lg:grid-cols-4" role="tablist">
            {categories.map((cat) => {
              const active = activeCategory === cat.id
              const has = filled(cat.id)
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10.5px] font-medium transition-colors',
                    active ? 'bg-white/[0.07] text-text-primary' : 'text-text-muted hover:bg-white/[0.035] hover:text-text-primary'
                  )}
                >
                  <cat.icon className={cn('h-4 w-4', active && 'text-accent-blue')} strokeWidth={1.75} />
                  {cat.label}
                  <span
                    className={cn('absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full', has ? 'bg-status-success' : 'bg-white/10')}
                    aria-label={has ? 'Fitted' : 'Empty'}
                  />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[12.5px] text-text-secondary">
              {activeMeta.single ? 'One slot' : 'Stack as many as you need'}
            </p>
            <span className="font-mono text-[11px] text-text-muted">{filteredCatalogue.length} parts</span>
          </div>

          <ul className="flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-[560px]">
            {filteredCatalogue.map((comp) => {
              const isInstalled = selectedComponents.some((c) => c.id === comp.id)
              const replaces = !isInstalled && occupant ? occupant : undefined
              const inspected = inspectedComponent?.id === comp.id
              return (
                <li key={comp.id}>
                  <div
                    className={cn(
                      'group rounded-xl border p-3 transition-colors',
                      isInstalled
                        ? 'border-accent-blue/45 bg-accent-blue/[0.07]'
                        : inspected
                          ? 'border-white/20 bg-bg-elevated'
                          : 'border-white/[0.06] bg-bg-panel hover:border-white/15'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setInspectedComponent(comp)}
                      className="block w-full text-left"
                      aria-label={`Inspect ${comp.name}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium leading-snug text-text-primary">{comp.name}</p>
                        {isInstalled && <Badge variant="default" className="shrink-0">Fitted</Badge>}
                      </div>
                      {comp.category === 'instruments' && missionId && MISSION_SCIENCE[missionId]?.instruments[comp.id] && (
                        <p
                          className={cn(
                            'mt-1 text-[11px] font-medium',
                            MISSION_SCIENCE[missionId].instruments[comp.id].relevance === 'key'
                              ? 'text-status-success'
                              : MISSION_SCIENCE[missionId].instruments[comp.id].relevance === 'useful'
                                ? 'text-accent-blue'
                                : 'text-text-muted'
                          )}
                          title={MISSION_SCIENCE[missionId].instruments[comp.id].why}
                        >
                          {RELEVANCE_LABEL[MISSION_SCIENCE[missionId].instruments[comp.id].relevance]} for this mission
                        </p>
                      )}
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-text-muted">{comp.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-text-secondary">
                        <span>{comp.mass} kg</span>
                        <span>{(comp.cost / 1000).toFixed(0)}k cr</span>
                        {comp.powerGeneration > 0 && <span className="text-status-success">+{comp.powerGeneration} W</span>}
                        {comp.powerConsumption > 0 && <span className="text-status-warning">−{comp.powerConsumption} W</span>}
                      </div>
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                      <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-text-muted">
                        {replaces && (
                          <>
                            <Replace className="h-3 w-3 shrink-0" /> Replaces {replaces.name}
                          </>
                        )}
                      </span>
                      {!crew.canEdit(roleForCategory(comp.category)) ? (
                        <OwnerLock role={roleForCategory(comp.category)} />
                      ) : (
                      <Button
                        size="sm"
                        variant={isInstalled ? 'ghost' : 'secondary'}
                        className={cn('h-7 shrink-0 px-2.5 text-xs', isInstalled && 'hover:text-status-danger')}
                        onClick={() => handleToggleComponent(comp)}
                      >
                        {isInstalled ? (
                          <>
                            <X className="h-3.5 w-3.5" /> Remove
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> Fit
                          </>
                        )}
                      </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Inspection bay */}
        <section className="relative flex min-h-[420px] min-w-0 flex-col lg:col-span-6 lg:min-h-[640px]" aria-label="3D inspection bay">
          <SpacecraftViewer
            components={selectedComponents}
            onSelectComponent={(c) => setInspectedComponent(c)}
            selectedComponentId={inspectedComponent?.id}
            pureWhiteBackground
          />
          <AnimatePresence>
            {selectedComponents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="pointer-events-auto max-w-[300px] rounded-2xl border border-white/[0.08] bg-bg-primary/70 p-5 text-center backdrop-blur-md">
                  <Box className="mx-auto h-6 w-6 text-text-muted" strokeWidth={1.5} />
                  <p className="mt-2 text-sm font-medium">The bay is empty</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Start with a bus from the catalogue, or fit a flight-ready baseline and tune it from there.
                  </p>
                  <Button size="sm" className="mt-4" onClick={handleAutoFit}>
                    <Wand2 className="h-3.5 w-3.5" /> Auto-fit baseline
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Inspector + manifest + checklist */}
        <aside className="flex min-w-0 flex-col gap-3 lg:col-span-3">
          <section className="panel-surface rounded-2xl p-4" aria-labelledby="inspector-title">
            <p id="inspector-title" className="eyebrow !text-[10px]">Inspector</p>
            {inspectedComponent ? (
              <>
                <p className="mt-2 text-[15px] font-semibold leading-snug">{inspectedComponent.name}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{inspectedComponent.description}</p>
                <dl className="mt-3 divide-y divide-white/[0.06] text-[12px]">
                  {Object.entries(inspectedComponent.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between gap-3 py-1.5">
                      <dt className="text-text-muted">{key}</dt>
                      <dd className="text-right font-mono text-text-primary">{val}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-text-muted">
                Select a part in the catalogue or the manifest to see its full specification.
              </p>
            )}
          </section>

          <section className="panel-surface rounded-2xl p-4" aria-labelledby="checklist-title">
            <div className="flex items-center justify-between">
              <p id="checklist-title" className="eyebrow !text-[10px]">Pre-flight checklist</p>
              {ready ? <Badge variant="success">Go</Badge> : <Badge variant="warning">{blocking.length} open</Badge>}
            </div>
            <ul className="mt-2.5 space-y-1">
              {checklist.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    disabled={item.ok || !item.fix}
                    onClick={() => item.fix && setActiveCategory(item.fix)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px] transition-colors',
                      item.ok ? 'text-text-muted' : 'text-text-primary',
                      !item.ok && item.fix && 'hover:bg-white/[0.04]'
                    )}
                  >
                    {item.ok ? (
                      <CircleCheck className="h-3.5 w-3.5 shrink-0 text-status-success" />
                    ) : (
                      <CircleAlert className="h-3.5 w-3.5 shrink-0 text-status-warning" />
                    )}
                    <span className={cn('truncate',item.ok && 'line-through decoration-white/20')}>
                      {item.label}
                    </span>
                    {!item.ok && item.fix && <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-surface flex min-h-0 flex-1 flex-col rounded-2xl p-4" aria-labelledby="manifest-title">
            <div className="flex items-center justify-between">
              <p id="manifest-title" className="eyebrow !text-[10px]">Manifest</p>
              <span className="font-mono text-[11px] text-text-muted">{selectedComponents.length} parts</span>
            </div>
            {selectedComponents.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-text-muted">Nothing fitted yet.</p>
            ) : (
              <ul className="mt-2 max-h-[240px] space-y-1 overflow-y-auto">
                {selectedComponents.map((comp) => {
                  const Icon = categories.find((c) => c.id === comp.category)?.icon ?? Box
                  return (
                    <li key={comp.id}>
                      <div className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04]">
                        <button
                          type="button"
                          onClick={() => setInspectedComponent(comp)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] text-text-primary">{comp.name}</span>
                            <span className="block font-mono text-[10.5px] text-text-muted">
                              {comp.mass} kg · {(comp.cost / 1000).toFixed(0)}k cr
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeComponent(comp.id)}
                          className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:text-status-danger focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Remove ${comp.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {ready && (
            <Button asChild size="lg" className="w-full">
              <Link to={`/launch/${missionId}`}>
                <Check className="h-4 w-4" /> Design is go — choose a launcher
              </Link>
            </Button>
          )}
        </aside>
      </div>
    </PageContainer>
  )
}
