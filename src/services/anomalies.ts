import type { SpacecraftComponent, LaunchVehicle } from '@/stores/spacecraftStore'
import type { Mission } from '@/stores/missionStore'
import type { RoleId } from '@/stores/crewStore'
import { calculateSpacecraftMetrics, type SpacecraftEngineeringMetrics } from '@/services/engineeringCalculations'

/**
 * Mid-mission anomalies. Each one is a real kind of spacecraft emergency;
 * every option's consequence is computed from the player's actual design
 * (battery size, shielding, Δv reserve, antenna, distance), so the same
 * choice can be right for one spacecraft and wrong for another.
 */

export type Verdict = 'good' | 'ok' | 'bad'

export interface AnomalyOutcome {
  verdict: Verdict
  /** What happened, with numbers */
  result: string
  /** The engineering lesson */
  lesson: string
  scienceLossPct: number
  deltaVUsed: number
  health?: { subsystem: 'powerHealth' | 'commHealth' | 'gncHealth' | 'obcHealth'; amount: number }
  scoreDelta: number
}

export interface AnomalyOption {
  id: string
  label: string
  /** What the team expects, before knowing the outcome */
  tradeoff: string
  resolve: (ctx: AnomalyContext) => AnomalyOutcome
}

export interface AnomalyDef {
  id: string
  triggerAt: number // mission-control sim seconds
  subsystem: string
  role: RoleId
  title: string
  situation: string
  facts: (ctx: AnomalyContext) => [string, string][]
  options: AnomalyOption[]
}

export interface AnomalyContext {
  missionId: string
  destination: string
  components: SpacecraftComponent[]
  m: SpacecraftEngineeringMetrics
  deltaVMargin: number
  shielding: 'none' | 'partial' | 'hardened'
  distanceKm: number
  instruments: number
}

const fmt = (n: number) => Math.round(n).toLocaleString()

export function buildAnomalyContext(
  missionId: string,
  components: SpacecraftComponent[],
  vehicle: LaunchVehicle | null,
  mission: Mission | undefined,
  reserveDeltaV = 150
): AnomalyContext {
  const m = calculateSpacecraftMetrics(components, vehicle, mission, reserveDeltaV)
  const bus = components.find((c) => c.category === 'structure')?.id
  const destination = mission?.destination ?? 'Earth Orbit'
  return {
    missionId,
    destination,
    components,
    m,
    deltaVMargin: m.totalAvailableDeltaV - m.requiredMissionDeltaV,
    shielding: bus === 'bus-heavy' ? 'hardened' : bus === 'bus-medium' ? 'partial' : 'none',
    distanceKm: destination.toLowerCase().includes('mars') ? 225_000_000 : destination.toLowerCase().includes('moon') ? 384_400 : 2_000,
    instruments: Math.max(1, components.filter((c) => c.category === 'instruments').length),
  }
}

// ---------------------------------------------------------------------------
// Anomaly library
// ---------------------------------------------------------------------------

const solarStorm = (at: number): AnomalyDef => ({
  id: 'solar-storm',
  triggerAt: at,
  subsystem: 'Space weather',
  role: 'director',
  title: 'Solar particle storm',
  situation:
    'NOAA’s Space Weather Prediction Center has issued an S3 radiation storm alert. High-energy protons are rising fast and can flip bits in electronics or damage detectors.',
  facts: (c) => [
    ['Proton flux (>10 MeV)', '1,200 pfu, rising'],
    ['Forecast duration', '~8 hours'],
    ['Your bus shielding', c.shielding === 'hardened' ? 'Radiation-hardened (heavy bus)' : c.shielding === 'partial' ? 'Partial (medium bus)' : 'None (small bus)'],
  ],
  options: [
    {
      id: 'safe',
      label: 'Enter safe mode until it passes',
      tradeoff: 'Protects the electronics; no science for ~8 h.',
      resolve: (c) => ({
        verdict: c.shielding === 'hardened' ? 'ok' : 'good',
        result: `Spacecraft rode out the storm in safe mode. 8 h of observations lost (−8% science).`,
        lesson:
          c.shielding === 'hardened'
            ? 'Your hardened bus could have kept working — extra shielding mass buys you the right to keep operating through storms.'
            : 'Textbook call for an unshielded spacecraft: losing a day of data beats losing the flight computer.',
        scienceLossPct: 8,
        deltaVUsed: 0,
        scoreDelta: c.shielding === 'hardened' ? 0 : 2,
      }),
    },
    {
      id: 'continue',
      label: 'Keep all instruments running',
      tradeoff: 'No science lost — if the electronics survive.',
      resolve: (c) =>
        c.shielding === 'hardened'
          ? {
              verdict: 'good',
              result: 'Shielding held. Zero upsets recorded and science continued uninterrupted.',
              lesson: 'Shielding mass paid for itself: a hardened design can keep working when others must hide.',
              scienceLossPct: 0,
              deltaVUsed: 0,
              scoreDelta: 2,
            }
          : c.shielding === 'partial'
            ? {
                verdict: 'ok',
                result: 'Several single-event upsets; the computer rebooted twice. −5% science, flight computer health −5%.',
                lesson: 'Partial shielding reduces but does not remove radiation risk.',
                scienceLossPct: 5,
                deltaVUsed: 0,
                health: { subsystem: 'obcHealth', amount: 5 },
                scoreDelta: 0,
              }
            : {
                verdict: 'bad',
                result: 'A latch-up damaged the spectrometer detector and the computer fell into safe mode anyway. −25% science for the rest of the mission.',
                lesson: 'Unshielded electronics in a proton storm are a gamble; the cheapest bus has the least protection.',
                scienceLossPct: 25,
                deltaVUsed: 0,
                health: { subsystem: 'obcHealth', amount: 20 },
                scoreDelta: -5,
              },
    },
    {
      id: 'instruments-off',
      label: 'Power down instruments, stay pointed',
      tradeoff: 'Protects the detectors; keeps the spacecraft ready to resume.',
      resolve: (c) => ({
        verdict: c.shielding === 'hardened' ? 'ok' : 'good',
        result: 'Detectors were safe and observations resumed within minutes of the all-clear. −4% science.',
        lesson: 'A partial safing protects the most sensitive hardware while keeping the spacecraft ready.',
        scienceLossPct: 4,
        deltaVUsed: 0,
        scoreDelta: c.shielding === 'hardened' ? 0 : 1,
      }),
    },
  ],
})

const batteryCell = (at: number): AnomalyDef => {
  const eclipseNeed = (c: AnomalyContext) => c.m.powerConsumptionWatts * (35 / 60)
  const usable = (c: AnomalyContext) => c.m.batteryCapacityWh * 0.875 * 0.6
  return {
    id: 'battery-cell',
    triggerAt: at,
    subsystem: 'Electrical power',
    role: 'power',
    title: 'Battery cell short',
    situation: 'One of eight lithium-ion cells has shorted. Battery capacity just dropped by 12.5%, and the next eclipse is in 40 minutes.',
    facts: (c) => [
      ['Battery capacity', `${fmt(c.m.batteryCapacityWh)} → ${fmt(c.m.batteryCapacityWh * 0.875)} Wh`],
      ['Usable at 60% depth of discharge', `${fmt(usable(c))} Wh`],
      ['Energy needed per eclipse', `${fmt(eclipseNeed(c))} Wh (35 min × ${fmt(c.m.powerConsumptionWatts)} W)`],
    ],
    options: [
      {
        id: 'shed',
        label: 'Shed load: instruments only in sunlight',
        tradeoff: 'Guaranteed safe; observations pause during every eclipse.',
        resolve: (c) => {
          const ok = usable(c) >= eclipseNeed(c)
          return {
            verdict: ok ? 'ok' : 'good',
            result: 'Battery stayed healthy. Night-side observations lost (−12% science).',
            lesson: ok
              ? `The battery still had ${fmt(usable(c) - eclipseNeed(c))} Wh of margin — the shutdown cost science it didn't need to.`
              : 'Correct: without margin, cutting load is the only way through an eclipse.',
            scienceLossPct: 12,
            deltaVUsed: 0,
            scoreDelta: ok ? 0 : 2,
          }
        },
      },
      {
        id: 'continue',
        label: 'Carry on at full load',
        tradeoff: 'Keeps all science — works only if the battery still has margin.',
        resolve: (c) => {
          const margin = usable(c) - eclipseNeed(c)
          return margin >= 0
            ? {
                verdict: 'good',
                result: `Eclipse passed with ${fmt(margin)} Wh to spare. No science lost.`,
                lesson: 'Sizing the battery with margin at design time turned an emergency into a non-event.',
                scienceLossPct: 0,
                deltaVUsed: 0,
                scoreDelta: 2,
              }
            : {
                verdict: 'bad',
                result: `Battery ran ${fmt(-margin)} Wh short every eclipse. Repeated brownouts tripped safe mode and deep discharge aged the battery. −30% science.`,
                lesson: 'Eclipse energy = load × eclipse time. If it exceeds usable capacity, the spacecraft browns out every orbit.',
                scienceLossPct: 30,
                deltaVUsed: 0,
                health: { subsystem: 'powerHealth', amount: 30 },
                scoreDelta: -5,
              }
        },
      },
      {
        id: 'bypass',
        label: 'Isolate the cell (ground team, ~2 days)',
        tradeoff: 'Restores a healthy string; reduced ops while engineers work.',
        resolve: () => ({
          verdict: 'good',
          result: 'Engineers bypassed the failed cell. Battery is healthy at 87.5% capacity. −6% science during the fix.',
          lesson: 'Batteries are built from redundant cell strings precisely so a single failure can be isolated.',
          scienceLossPct: 6,
          deltaVUsed: 0,
          scoreDelta: 1,
        }),
      },
    ],
  }
}

const groundOutage = (at: number): AnomalyDef => {
  const generated = (c: AnomalyContext) => 9 * 40 * c.instruments // MB in 9 h
  const free = 512 - 120
  const lost = (c: AnomalyContext) => Math.max(0, generated(c) - free)
  const lowGainWorks = (c: AnomalyContext) => c.distanceKm < 1_000_000
  return {
    id: 'ground-outage',
    triggerAt: at,
    subsystem: 'Communications',
    role: 'power',
    title: 'Deep Space Network outage',
    situation: 'The 70 m dish you were scheduled on is down for an emergency repair. The next pass is in 9 hours, and your onboard recorder is filling up.',
    facts: (c) => [
      ['Next scheduled pass', 'in 9 h'],
      ['Recorder free space', `${fmt(free)} MB of 512 MB`],
      ['Data your instruments make in 9 h', `${fmt(generated(c))} MB (${c.instruments} instrument${c.instruments > 1 ? 's' : ''})`],
      ['Distance to Earth', `${fmt(c.distanceKm)} km`],
    ],
    options: [
      {
        id: 'buffer',
        label: 'Store everything onboard and wait',
        tradeoff: 'No extra risk; data beyond the recorder size is overwritten.',
        resolve: (c) => {
          const l = lost(c)
          return {
            verdict: l === 0 ? 'good' : 'ok',
            result: l === 0 ? 'The recorder absorbed the outage. Nothing lost.' : `Recorder overflowed: ${fmt(l)} MB overwritten (−${Math.min(15, Math.round(l / 60))}% science).`,
            lesson: 'Onboard storage is a buffer against ground outages: data rate × outage time must fit.',
            scienceLossPct: l === 0 ? 0 : Math.min(15, Math.round(l / 60)),
            deltaVUsed: 0,
            scoreDelta: l === 0 ? 1 : 0,
          }
        },
      },
      {
        id: 'low-gain',
        label: 'Downlink through a small station on the low-gain antenna',
        tradeoff: 'Keeps data flowing at a trickle — if the link closes at this distance.',
        resolve: (c) =>
          lowGainWorks(c)
            ? {
                verdict: 'good',
                result: 'A 34 m station locked on. Data trickled down slowly; nothing was lost (−2% science from reduced resolution).',
                lesson: 'Close to Earth, even a low-gain link closes — signal strength falls with distance squared.',
                scienceLossPct: 2,
                deltaVUsed: 0,
                scoreDelta: 2,
              }
            : {
                verdict: 'bad',
                result: `No lock. At ${fmt(c.distanceKm)} km the signal is ~${fmt(20 * Math.log10(c.distanceKm / 384_400))} dB weaker than at the Moon. Time spent trying, then the recorder still overflowed (−${Math.min(15, Math.round(lost(c) / 60)) + 3}% science).`,
                lesson: 'Inverse-square law: Mars is ~600× farther than the Moon, so the signal is ~55 dB weaker. Low-gain antennas cannot close that link.',
                scienceLossPct: Math.min(15, Math.round(lost(c) / 60)) + 3,
                deltaVUsed: 0,
                scoreDelta: -3,
              },
      },
      {
        id: 'prioritize',
        label: 'Throttle instruments to fit the recorder',
        tradeoff: 'You choose what to keep instead of losing data at random.',
        resolve: (c) => {
          const l = lost(c)
          return {
            verdict: l === 0 ? 'ok' : 'good',
            result: l === 0 ? 'Unnecessary — the recorder had room. −3% science from throttling.' : `Lowest-priority observations were skipped on purpose. −${Math.max(3, Math.round(l / 120))}% science, but the key data survived.`,
            lesson: 'When you must lose data, choose which data — that is what science operations planning is for.',
            scienceLossPct: l === 0 ? 3 : Math.max(3, Math.round(l / 120)),
            deltaVUsed: 0,
            scoreDelta: l === 0 ? 0 : 2,
          }
        },
      },
    ],
  }
}

const courseCorrection = (at: number): AnomalyDef => ({
  id: 'tcm',
  triggerAt: at,
  subsystem: 'Navigation',
  role: 'spacecraft',
  title: 'Off-course: trajectory correction needed',
  situation: 'Fresh tracking shows the spacecraft will miss its aim point by 180 km. Every course correction spends propellant from your Δv reserve.',
  facts: (c) => [
    ['Predicted miss distance', '180 km'],
    ['Your Δv reserve', `${fmt(c.deltaVMargin)} m/s`],
    ['Time to arrival', c.destination.toLowerCase().includes('mars') ? '~200 days' : '~3 days'],
  ],
  options: [
    {
      id: 'now',
      label: 'Burn now (small correction)',
      tradeoff: 'Cheapest burn; tracking is still a little uncertain.',
      resolve: () => ({
        verdict: 'good',
        result: 'A 3 m/s burn fixed the trajectory. Final aim point within 4 km.',
        lesson: 'Correct early: the farther from the target, the smaller the push needed to bend the path.',
        scienceLossPct: 0,
        deltaVUsed: 3,
        scoreDelta: 2,
      }),
    },
    {
      id: 'wait',
      label: 'Wait two days for better tracking',
      tradeoff: 'More accurate solution; the burn grows the longer you wait.',
      resolve: () => ({
        verdict: 'ok',
        result: 'A 9 m/s burn with a sharper solution. Aim point within 1 km, but it cost 3× the propellant.',
        lesson: 'Waiting buys accuracy but costs Δv: a classic navigation trade-off.',
        scienceLossPct: 0,
        deltaVUsed: 9,
        scoreDelta: 0,
      }),
    },
    {
      id: 'skip',
      label: 'Skip it and fix the orbit at arrival',
      tradeoff: 'Saves propellant now; one big correction later.',
      resolve: (c) =>
        c.deltaVMargin >= 60
          ? {
              verdict: 'ok',
              result: `Arrival correction cost 60 m/s (20× the early burn). Reserve dropped to ${fmt(c.deltaVMargin - 60)} m/s.`,
              lesson: 'Late corrections are expensive; you could afford it only because the design carried reserve.',
              scienceLossPct: 0,
              deltaVUsed: 60,
              scoreDelta: -2,
            }
          : {
              verdict: 'bad',
              result: `The arrival correction needed 60 m/s but only ${fmt(Math.max(0, c.deltaVMargin))} m/s was left. The spacecraft ended up in a high, unplanned orbit: −40% science.`,
              lesson: 'Δv reserve is your insurance policy. Skipping cheap early burns spends it at the worst time.',
              scienceLossPct: 40,
              deltaVUsed: Math.max(0, c.deltaVMargin),
              health: { subsystem: 'gncHealth', amount: 10 },
              scoreDelta: -6,
            },
    },
  ],
})

const reactionWheel = (at: number): AnomalyDef => ({
  id: 'reaction-wheel',
  triggerAt: at,
  subsystem: 'Attitude control',
  role: 'spacecraft',
  title: 'Reaction wheel friction rising',
  situation: 'Wheel #3’s friction has tripled in a week — the same signature that preceded wheel failures on Kepler and Dawn. You have four wheels; three are needed for full pointing.',
  facts: (c) => [
    ['Wheel #3 drag torque', '3.1× nominal, rising'],
    ['Wheels needed for full control', '3 of 4'],
    ['Δv reserve for thruster momentum dumps', `${fmt(c.deltaVMargin)} m/s`],
  ],
  options: [
    {
      id: 'retire',
      label: 'Retire the wheel, fly on three',
      tradeoff: 'Full pointing kept; thrusters do more momentum dumping (uses propellant).',
      resolve: (c) => ({
        verdict: c.deltaVMargin >= 15 ? 'good' : 'ok',
        result:
          c.deltaVMargin >= 15
            ? 'Three-wheel mode is stable. Momentum dumps will use ~15 m/s over the mission.'
            : `Three-wheel mode is stable, but extra momentum dumps eat into a thin ${fmt(c.deltaVMargin)} m/s reserve.`,
        lesson: 'Redundant wheels let you retire a sick one before it fails; the cost is thruster propellant.',
        scienceLossPct: 0,
        deltaVUsed: 15,
        scoreDelta: c.deltaVMargin >= 15 ? 2 : 0,
      }),
    },
    {
      id: 'keep',
      label: 'Keep using it and monitor',
      tradeoff: 'No change now — but it may fail at a bad time.',
      resolve: () => ({
        verdict: 'bad',
        result: 'Two weeks later the wheel seized mid-observation. Pointing jitter blurred images and dropped the downlink rate: −35% science.',
        lesson: 'Trending telemetry is a warning. Act on degradation before it becomes a failure.',
        scienceLossPct: 35,
        deltaVUsed: 0,
        health: { subsystem: 'gncHealth', amount: 30 },
        scoreDelta: -4,
      }),
    },
    {
      id: 'slow',
      label: 'Run it at minimum speed',
      tradeoff: 'Less wear; the spacecraft slews more slowly between targets.',
      resolve: () => ({
        verdict: 'ok',
        result: 'The wheel survived, but slower slews meant fewer targets per day: −8% science.',
        lesson: 'Operating a degraded part gently can extend its life, at the cost of performance.',
        scienceLossPct: 8,
        deltaVUsed: 0,
        scoreDelta: 0,
      }),
    },
  ],
})

/** The scripted anomaly sequence for each campaign mission. */
export function anomaliesForMission(missionId: string): AnomalyDef[] {
  switch (missionId) {
    case 'earth-observer':
      return [batteryCell(60), solarStorm(240), groundOutage(480)]
    case 'mars-pathfinder':
      return [courseCorrection(60), groundOutage(240), solarStorm(480)]
    case 'lunar-explorer':
    default:
      return [courseCorrection(60), reactionWheel(240), solarStorm(480)]
  }
}
