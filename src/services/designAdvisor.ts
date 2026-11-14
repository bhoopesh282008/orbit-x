import { COMPONENT_CATALOGUE } from '@/data/components'
import type { ComponentCategory, SpacecraftComponent } from '@/stores/spacecraftStore'

export type Resource = 'mass' | 'cost' | 'power'

export interface FixAction {
  /** Replace `remove` with `add` (either may be absent for a pure add/remove). */
  remove?: SpacecraftComponent
  add?: SpacecraftComponent
  label: string
}

export interface DesignHint {
  resource: Resource
  severity: 'warn' | 'bad'
  /** One sentence: why this matters for the mission. */
  why: string
  /** One sentence: the cheapest concrete change, with numbers. */
  fix: string
  action?: FixAction
}

interface Limits {
  maxMass: number
  budget: number
  vehicleCost: number
  requiredInstruments: string[]
  /** Mission destination, used to protect capabilities the mission depends on */
  destination?: string
}

/** Lowest communications tier that can close the link from the destination. */
function minimumComms(destination = ''): string[] {
  const d = destination.toLowerCase()
  if (d.includes('mars') || d.includes('deep')) return ['comm-deep']
  if (d.includes('moon') || d.includes('lunar')) return ['comm-high', 'comm-deep']
  return ['comm-low', 'comm-high', 'comm-deep']
}

/** Swaps that would quietly break the mission (less propellant, weaker link, different engine). */
function breaksCapability(a: FixAction, limits: Limits) {
  if (!a.remove || !a.add) return false
  switch (a.add.category) {
    case 'communication':
      return !minimumComms(limits.destination).includes(a.add.id)
    case 'fuel':
      return a.add.mass < a.remove.mass
    case 'propulsion':
      return true
    default:
      return false
  }
}

const isRequired = (c: SpacecraftComponent, required: string[]) =>
  c.category === 'instruments' && required.some((r) => c.id === `inst-${r}` || c.id.includes(r))

/** Single-slot categories where a swap (not removal) is the natural fix. */
const SWAPPABLE: ComponentCategory[] = ['structure', 'propulsion', 'fuel', 'power', 'energy', 'communication']

const totals = (parts: SpacecraftComponent[], vehicleCost: number) => ({
  mass: parts.reduce((s, c) => s + c.mass, 0),
  cost: parts.reduce((s, c) => s + c.cost, 0) + vehicleCost,
  power: parts.reduce((s, c) => s + c.powerGeneration - c.powerConsumption, 0),
})

/** Every single-part change (swap within a slot, or drop an optional instrument). */
function candidateChanges(parts: SpacecraftComponent[], required: string[]): FixAction[] {
  const out: FixAction[] = []
  for (const part of parts) {
    if (SWAPPABLE.includes(part.category)) {
      for (const alt of COMPONENT_CATALOGUE) {
        if (alt.category === part.category && alt.id !== part.id && !parts.some((p) => p.id === alt.id)) {
          out.push({ remove: part, add: alt, label: `Swap ${part.name} → ${alt.name}` })
        }
      }
    } else if (part.category === 'instruments' && !isRequired(part, required)) {
      out.push({ remove: part, label: `Remove optional ${part.name}` })
    }
  }
  return out
}

function apply(parts: SpacecraftComponent[], a: FixAction) {
  const next = a.remove ? parts.filter((p) => p.id !== a.remove!.id) : [...parts]
  if (a.add) next.push(a.add)
  return next
}

/**
 * Finds the change that fixes `resource` while breaking nothing else,
 * preferring the smallest side-effects (cheapest / lightest change).
 */
function bestFix(parts: SpacecraftComponent[], limits: Limits, resource: Resource): FixAction | undefined {
  const ok = (t: ReturnType<typeof totals>) => ({
    mass: t.mass <= limits.maxMass,
    cost: t.cost <= limits.budget,
    power: t.power >= 0,
  })
  const now = totals(parts, limits.vehicleCost)
  const before = ok(now)
  // How far past the limit the resource is (0 = within limit)
  const overshoot = (t: ReturnType<typeof totals>) =>
    resource === 'mass' ? Math.max(0, t.mass - limits.maxMass) : resource === 'cost' ? Math.max(0, t.cost - limits.budget) : Math.max(0, -t.power)
  let best: { a: FixAction; score: number } | undefined
  let bestPartial: { a: FixAction; gain: number } | undefined
  for (const a of candidateChanges(parts, limits.requiredInstruments)) {
    if (breaksCapability(a, limits)) continue
    const t = totals(apply(parts, a), limits.vehicleCost)
    const after = ok(t)
    // Never break a resource that was fine before
    if ((['mass', 'cost', 'power'] as Resource[]).some((r) => before[r] && !after[r])) continue
    if (!after[resource]) {
      // Not a full fix: remember the biggest safe step toward the limit
      const gain = overshoot(now) - overshoot(t)
      if (gain > 0 && (!bestPartial || gain > bestPartial.gain)) bestPartial = { a, gain }
      continue
    }
    // Prefer changes that also fix other problems, then the cheapest in credits
    const fixedOthers = (['mass', 'cost', 'power'] as Resource[]).filter((r) => !before[r] && after[r]).length
    const score = fixedOthers * 1e7 - t.cost
    if (!best || score > best.score) best = { a, score }
  }
  if (best) return best.a
  if (bestPartial) return { ...bestPartial.a, label: `Step 1: ${bestPartial.a.label}` }
  return undefined
}

const fmt = (n: number) => Math.round(n).toLocaleString()

/** Plain-language "why + cheapest fix" hints for each resource that is tight or broken. */
export function adviseDesign(parts: SpacecraftComponent[], limits: Limits): Partial<Record<Resource, DesignHint>> {
  const t = totals(parts, limits.vehicleCost)
  const gen = parts.reduce((s, c) => s + c.powerGeneration, 0)
  const hints: Partial<Record<Resource, DesignHint>> = {}

  // ---- Mass
  if (limits.maxMass > 0 && t.mass > limits.maxMass * 0.9) {
    const over = t.mass - limits.maxMass
    let action = bestFix(parts, limits, 'mass')
    let delta = action ? (action.remove?.mass ?? 0) - (action.add?.mass ?? 0) : 0
    if (delta <= 0) {
      action = undefined
      delta = 0
    }
    hints.mass = {
      resource: 'mass',
      severity: over > 0 ? 'bad' : 'warn',
      why:
        over > 0
          ? `The rocket can only lift ${fmt(limits.maxMass)} kg to this orbit — ${fmt(over)} kg too heavy and it can't reach the destination.`
          : `Only ${fmt(-over)} kg of margin. Real missions keep 10–20% spare because mass always grows during development.`,
      fix: action
        ? `${action.label} — saves ${fmt(delta)} kg.`
        : over > 0
          ? 'Pick a lighter bus or fewer instruments.'
          : 'Avoid adding more hardware unless it earns its mass.',
      action,
    }
  }

  // ---- Cost
  if (limits.budget > 0 && t.cost > limits.budget * 0.9) {
    const over = t.cost - limits.budget
    let action = bestFix(parts, limits, 'cost')
    let delta = action ? (action.remove?.cost ?? 0) - (action.add?.cost ?? 0) : 0
    if (delta <= 0) {
      action = undefined
      delta = 0
    }
    hints.cost = {
      resource: 'cost',
      severity: over > 0 ? 'bad' : 'warn',
      why:
        over > 0
          ? `${fmt(over)} cr over budget — the mission would not be approved.`
          : `Less than 10% budget reserve. Unexpected problems in flight cost money to fix.`,
      fix: action
        ? `${action.label} — saves ${fmt(delta)} cr.`
        : over > 0
          ? 'No single safe swap closes the gap — drop an optional instrument or pick a cheaper rocket.'
          : 'Every remaining saving would cost capability — this is a lean design. Avoid adding more.',
      action,
    }
  }

  // ---- Power
  const draw = parts.reduce((s, c) => s + c.powerConsumption, 0)
  if (t.power < 0 || (gen > 0 && draw / gen > 0.85)) {
    const action = t.power < 0 ? bestFix(parts, limits, 'power') : undefined
    const after = action ? totals(apply(parts, action), limits.vehicleCost).power : 0
    hints.power = {
      resource: 'power',
      severity: t.power < 0 ? 'bad' : 'warn',
      why:
        t.power < 0
          ? `Instruments and systems draw ${fmt(-t.power)} W more than the solar arrays make — the battery drains and the spacecraft enters safe mode.`
          : `Under 15% power margin. Arrays degrade each year and output drops further from the Sun.`,
      fix: action ? `${action.label} — balance becomes +${fmt(after)} W.` : 'Fit bigger arrays or drop a power-hungry instrument.',
      action,
    }
  }

  return hints
}

/**
 * Repeatedly applies the advisor's own fixes until mass, cost and power all
 * pass (or no safe fix remains). Used to give demo links a valid baseline.
 */
export function autoResolve(parts: SpacecraftComponent[], limits: Limits): SpacecraftComponent[] {
  let current = parts
  for (let i = 0; i < 6; i++) {
    const hints = adviseDesign(current, limits)
    const next = (['power', 'mass', 'cost'] as Resource[])
      .map((r) => hints[r])
      .find((h) => h?.severity === 'bad' && h.action)
    if (!next?.action) break
    current = apply(current, next.action)
  }
  return current
}
