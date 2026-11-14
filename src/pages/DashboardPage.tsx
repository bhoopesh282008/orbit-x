import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  FlaskConical,
  Lock,
  Medal,
  Radio,
  Rocket,
  Satellite,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useGameStore } from '@/stores/gameStore'
import { useMissionStore, type Mission } from '@/stores/missionStore'
import { Planet3DViewer } from '@/three/components/planets/RealisticPlanet'
import { MissionPatch } from '@/components/visuals/MissionPatch'
import { MISSION_SCIENCE } from '@/data/missionScience'
import { cn } from '@/lib/utils'

const ease = [0.16, 1, 0.3, 1] as const
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }

/** The real sequence a mission goes through in the app. */
const FLIGHT_PHASES = ['Brief', 'Plan', 'Design', 'Validate', 'Launch', 'Operate', 'Debrief']

/** Short, verifiable facts that rotate on the console. */
const SPACE_FACTS = [
  { k: 'Moon light-time', v: '1.3 s', d: 'Radio signals take about 1.3 seconds to reach the Moon.' },
  { k: 'ISS orbit', v: '≈ 93 min', d: 'The International Space Station circles Earth roughly every 93 minutes.' },
  { k: 'Sunlight at Mars', v: '43 %', d: 'Mars receives about 43% of the sunlight Earth does — solar arrays must be larger.' },
  { k: 'Escape velocity', v: '11.2 km/s', d: 'The speed needed to leave Earth’s gravity without further thrust.' },
  { k: 'Hohmann to Mars', v: '259 days', d: 'The minimum-energy transfer from Earth to Mars takes about 8.5 months.' },
]

function planetFor(mission: Mission): 'mars' | 'moon' | 'earth' {
  const id = mission.id.toLowerCase()
  if (id.includes('mars')) return 'mars'
  if (id.includes('lunar') || id.includes('moon')) return 'moon'
  return 'earth'
}

function useUtc() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

const STATUS: Record<Mission['status'], { label: string; tone: string; dot: string }> = {
  available: { label: 'GO', tone: 'text-status-success', dot: 'bg-status-success' },
  'in-progress': { label: 'ACTIVE', tone: 'text-accent-cyan', dot: 'bg-accent-cyan live-dot' },
  completed: { label: 'COMPLETE', tone: 'text-text-secondary', dot: 'bg-text-secondary' },
  locked: { label: 'HOLD', tone: 'text-text-muted', dot: 'bg-border-prominent' },
  failed: { label: 'SCRUB', tone: 'text-status-danger', dot: 'bg-status-danger' },
}

function Readout({ label, value, unit, sub }: { label: string; value: string | number; unit?: string; sub?: string }) {
  return (
    <div className="panel-surface rounded-xl px-4 py-3.5">
      <p className="eyebrow !text-[10px]">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold leading-none tracking-tight text-text-primary tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-text-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 truncate text-[11px] text-text-muted">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const player = useGameStore((s) => s.player)
  const missions = useMissionStore((s) => s.missions)
  const campaignProgress = useMissionStore((s) => s.campaignProgress)
  const now = useUtc()
  const [factIndex, setFactIndex] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setFactIndex((i) => (i + 1) % SPACE_FACTS.length), 7000)
    return () => window.clearInterval(t)
  }, [])

  const completed = missions.filter((m) => m.status === 'completed').length
  const available = missions.filter((m) => m.status === 'available')
  const current = missions.find((m) => m.status === 'in-progress') ?? available[0] ?? missions[0]
  const phaseIndex = current
    ? Math.min(FLIGHT_PHASES.length - 1, Math.floor((current.completionPercentage / 100) * FLIGHT_PHASES.length))
    : 0
  const xpPct = player.xpToNextLevel ? Math.min(100, (player.xp / player.xpToNextLevel) * 100) : 0
  const science = current ? MISSION_SCIENCE[current.id] : undefined
  const fact = SPACE_FACTS[factIndex]
  const utc = now.toISOString()

  return (
    <PageContainer variant="wide">
      <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">
        {/* ---------------- Console header ---------------- */}
        <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(2rem,3.4vw,2.75rem)] font-[850] leading-[1.02] tracking-[-0.03em] [font-stretch:92%]">
              Welcome back, Commander {(player.name.split('@')[0] || 'Commander').split(/[ ._]/)[0]}.
            </h1>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <p className="text-text-muted">UTC</p>
              <p className="mt-0.5 text-lg font-semibold text-text-primary tabular-nums">{utc.slice(11, 19)}</p>
            </div>
            <div>
              <p className="text-text-muted">DATE</p>
              <p className="mt-0.5 text-lg font-semibold text-text-primary tabular-nums">{utc.slice(0, 10)}</p>
            </div>
            <div>
              <p className="text-text-muted">PROGRAM</p>
              <p className="mt-0.5 text-lg font-semibold text-status-success">NOMINAL</p>
            </div>
          </div>
        </motion.div>

        {/* ---------------- Prime mission hero ---------------- */}
        {current && (
          <motion.section variants={item} aria-labelledby="prime-title" className="relative overflow-hidden rounded-3xl border border-border-subtle bg-bg-panel">
            {/* Planet backdrop */}
            <div className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden>
              <Planet3DViewer type={planetFor(current)} size={470} interactive={false} sunPosition={[-4, 2.5, 5]} sunIntensity={2.4} />
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-bg-panel from-40% via-bg-panel/75 to-transparent" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-blue/60 to-transparent" aria-hidden />

            <div className="relative grid gap-8 p-6 sm:p-9 lg:max-w-[62%]">
              <div className="flex flex-wrap items-center gap-4">
                <MissionPatch name={current.name} codename={current.codename} destination={current.destination} color={current.imageColor} size={112} />
                <div>
                  <h2 id="prime-title" className="text-4xl font-[850] leading-none tracking-[-0.035em] [font-stretch:90%] sm:text-[56px]">
                    {current.name}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">Prime mission · {current.codename}</p>
                  <p className="mt-2 flex items-center gap-2 font-mono text-xs">
                    <span className={cn('h-2 w-2 rounded-full', STATUS[current.status].dot)} />
                    <span className={STATUS[current.status].tone}>{STATUS[current.status].label}</span>
                    <span className="text-text-muted">· {current.difficulty} · Target {current.destination}</span>
                  </p>
                </div>
              </div>

              {science && (
                <div className="max-w-xl border-l-2 border-accent-blue pl-4">
                  <p className="eyebrow !text-[10px]">Science objective</p>
                  <p className="mt-1 text-lg font-medium leading-snug text-text-primary">{science.question}</p>
                </div>
              )}

              {/* Phase track */}
              <ol className="grid grid-cols-7 gap-1.5" aria-label="Mission phases">
                {FLIGHT_PHASES.map((phase, i) => (
                  <li key={phase} className="min-w-0">
                    <div
                      className={cn(
                        'h-1 rounded-full',
                        i < phaseIndex ? 'bg-accent-blue' : i === phaseIndex ? 'bg-accent-blue/50' : 'bg-border-prominent'
                      )}
                    />
                    <span className={cn('mt-2 block truncate font-mono text-[10px] uppercase tracking-wider', i === phaseIndex ? 'text-text-primary' : 'text-text-muted')}>
                      {phase}
                    </span>
                  </li>
                ))}
              </ol>

              <dl className="grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle sm:grid-cols-4">
                {[
                  ['Budget', `${Math.round(current.budget / 1000)}k cr`],
                  ['Duration', current.duration],
                  ['Min Δv', `${current.minDeltaV.toLocaleString()} m/s`],
                  ['Payload max', `${current.maxPayloadMass.toLocaleString()} kg`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-bg-elevated px-3.5 py-2.5">
                    <dt className="eyebrow !text-[9.5px]">{k}</dt>
                    <dd className="mt-1 truncate font-mono text-sm text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/campaign/${current.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_var(--accent-blue)] transition hover:brightness-110"
                >
                  {current.status === 'in-progress' ? 'Resume operations' : 'Open mission briefing'} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={`/designer/${current.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-prominent px-5 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-elevated"
                >
                  Spacecraft workstation
                </Link>
              </div>
            </div>
          </motion.section>
        )}

        {/* ---------------- Telemetry readouts ---------------- */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Readout label="Missions flown" value={completed} sub={`of ${missions.length} in campaign`} />
          <Readout label="Program progress" value={campaignProgress} unit="%" sub="campaign cleared" />
          <Readout label="Budget" value={`${(player.credits / 1000).toFixed(0)}k`} unit="cr" sub="available for missions" />
          <Readout label="Experience" value={player.xp.toLocaleString()} unit="XP" sub={`level ${player.level}`} />
          <Readout label="Discoveries" value={player.totalDiscoveries} sub="science highlights" />
          <Readout label="Medals" value={player.achievements.length} sub="achievements earned" />
        </motion.div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* ---------------- Flight status board ---------------- */}
          <motion.section variants={item} className="min-w-0 xl:col-span-8" aria-labelledby="board-title">
            <div className="panel-surface overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
                <h2 id="board-title" className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.18em]">
                  <Radio className="h-4 w-4 text-accent-blue" /> Flight status board
                </h2>
                <Link to="/campaign" className="text-xs text-accent-cyan hover:underline">
                  Campaign overview
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
                      <th scope="col" className="px-5 py-2.5 font-medium">Mission</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Target</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Δv req.</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Budget</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missions.map((m) => {
                      const st = STATUS[m.status]
                      const locked = m.status === 'locked'
                      return (
                        <tr key={m.id} className={cn('border-t border-border-subtle transition-colors', !locked && 'hover:bg-bg-elevated')}>
                          <td className="px-5 py-3">
                            {locked ? (
                              <span className="flex items-center gap-2 text-text-muted">
                                <Lock className="h-3.5 w-3.5" /> {m.name}
                              </span>
                            ) : (
                              <Link to={`/campaign/${m.id}`} className="font-medium text-text-primary hover:text-accent-cyan">
                                {m.name}
                              </Link>
                            )}
                            <p className="font-mono text-[10.5px] text-text-muted">{m.codename}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.imageColor }} />
                              {m.destination}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn('inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold', st.tone)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-text-secondary">{m.minDeltaV.toLocaleString()} m/s</td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-text-secondary">{Math.round(m.budget / 1000)}k</td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-text-secondary">{m.duration}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick stations */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {[
                { to: '/mission-lab', icon: FlaskConical, title: 'Mission lab', sub: 'Free-play trajectories' },
                { to: '/crew', icon: Users, title: 'Mission crew', sub: 'Solo or team of four' },
                { to: '/model-check', icon: ShieldCheck, title: 'Model accuracy', sub: '18 checks vs NASA data' },
                { to: current ? `/launch-operations/${current.id}` : '/campaign', icon: Rocket, title: 'Launch pad', sub: 'Go to the launch view' },
              ].map((s) => (
                <Link
                  key={s.title}
                  to={s.to}
                  className="group panel-surface flex items-center gap-3 rounded-xl p-3.5 transition hover:border-border-prominent"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-elevated text-text-secondary transition group-hover:bg-accent-blue/15 group-hover:text-accent-blue">
                    <s.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.title}</span>
                    <span className="block truncate text-xs text-text-muted">{s.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </motion.section>

          {/* ---------------- Side column ---------------- */}
          <motion.aside variants={item} className="min-w-0 space-y-4 xl:col-span-4">
            <section className="panel-surface rounded-2xl p-5" aria-labelledby="record-title">
              <div className="flex items-center justify-between">
                <h2 id="record-title" className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
                  Commander record
                </h2>
                <span className="rounded-md border border-border-prominent px-2 py-0.5 text-[11px] text-text-secondary">{player.title}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="eyebrow !text-[10px]">Level</p>
                  <p className="font-mono text-4xl font-semibold leading-none">{player.level}</p>
                </div>
                <p className="font-mono text-xs text-text-muted">
                  {Math.max(0, player.xpToNextLevel - player.xp).toLocaleString()} XP to next
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                <motion.div
                  className="h-full rounded-full bg-accent-blue"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1, ease, delay: 0.3 }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Flights', completed],
                  ['Medals', player.achievements.length],
                  ['Success', `${Math.round(player.successRate ?? 0)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-bg-elevated py-2">
                    <p className="font-mono text-base font-semibold">{v}</p>
                    <p className="text-[10.5px] text-text-muted">{k}</p>
                  </div>
                ))}
              </div>
              {player.achievements.length === 0 && (
                <p className="mt-4 flex items-start gap-2 text-xs text-text-muted">
                  <Medal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Fly your first mission within budget to earn the Flight Engineer medal.
                </p>
              )}
            </section>

            <section className="panel-surface rounded-2xl p-5" aria-labelledby="program-title">
              <h2 id="program-title" className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
                Program status
              </h2>
              <ul className="mt-3 space-y-2.5">
                {missions.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-[11px]',
                        m.status === 'completed'
                          ? 'border-status-success/40 bg-status-success/15 text-status-success'
                          : m.id === current?.id
                            ? 'border-accent-blue bg-accent-blue/15 text-accent-blue'
                            : 'border-border-prominent text-text-muted'
                      )}
                    >
                      {m.status === 'completed' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{m.name}</span>
                      <span className="block font-mono text-[10.5px] text-text-muted">{m.destination}</span>
                    </span>
                    <span className={cn('font-mono text-[10.5px] font-semibold', STATUS[m.status].tone)}>{STATUS[m.status].label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-[var(--nasa-blue)]/40 bg-[var(--nasa-blue)]/15 p-5" aria-live="polite" aria-labelledby="fact-title">
              <Satellite className="absolute -right-3 -top-3 h-20 w-20 text-text-primary/[0.05]" aria-hidden />
              <h2 id="fact-title" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-accent-cyan">
                Space fact · {fact.k}
              </h2>
              <motion.div key={factIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <p className="mt-2 font-mono text-3xl font-semibold text-text-primary">{fact.v}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{fact.d}</p>
              </motion.div>
            </section>
          </motion.aside>
        </div>
      </motion.div>
    </PageContainer>
  )
}
