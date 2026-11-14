import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Planet3DViewer } from '@/three/components/planets/RealisticPlanet'
import { ASCENT_TIMELINE, sampleAscent } from '@/services/ascentTrajectory'
import { runValidation } from '@/services/modelValidation'
import { MISSION_SCIENCE } from '@/data/missionScience'

const ease = [0.16, 1, 0.3, 1] as const

/** The eight steps every mission runs through, set on the flight-plan rule. */
const PHASES = ['Brief', 'Plan', 'Design', 'Rocket', 'Validate', 'Launch', 'Operate', 'Debrief']

const MISSIONS = [
  { id: 'lunar-explorer', demo: 'moon', name: 'Lunar Explorer', target: 'Moon', level: 'Easy', dv: '3,200', budget: '230k', days: '14' },
  { id: 'earth-observer', demo: 'earth', name: 'Earth Observer', target: 'Earth orbit', level: 'Medium', dv: '2,200', budget: '200k', days: '30' },
  { id: 'mars-pathfinder', demo: 'mars', name: 'Mars Pathfinder', target: 'Mars', level: 'Hard', dv: '5,600', budget: '350k', days: '210' },
]

const REAL = [
  {
    title: 'Launch anyway',
    text: 'Fly a flawed design and watch it fail the way physics says: a Max-Q breakup, an upper stage that runs dry short of orbit, a battery that dies after separation. Then read the numbers that decided it.',
    fact: '5 failure modes',
  },
  {
    title: 'Emergencies mid-mission',
    text: 'Solar storms, a shorted battery cell, a Deep Space Network outage. The same call can be right for one spacecraft and wrong for another, because outcomes come from your design.',
    fact: '3 per mission',
  },
  {
    title: 'A crew of up to four',
    text: 'Flight Director, Spacecraft, Power & Comms and Science each own their subsystems and a slice of the budget, negotiate funding, and sign the GO/NO-GO poll.',
    fact: 'Hot-seat co-op',
  },
  {
    title: 'Physics you can check',
    text: 'Orbital periods, transfer times, Max-Q and the 1976 Standard Atmosphere, computed by the game’s own code and compared with published NASA figures.',
    fact: '18 live checks',
  },
]

// ---------------------------------------------------------------------------
// Hero instrument: the game's own ascent model, drawn live
// ---------------------------------------------------------------------------

const PLOT_W = 420
const PLOT_H = 220
const T_MAX = ASCENT_TIMELINE.seco
const ALT_MAX = 240

function AscentPlot() {
  const reduce = useReducedMotion()
  const [t, setT] = useState(reduce ? T_MAX : 0)
  const raf = useRef(0)

  // Sweep the cursor along the real profile (12 s per pass), then hold and repeat
  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    const loop = (now: number) => {
      const cycle = ((now - start) / 1000) % 15
      setT(Math.min(T_MAX, (cycle / 12) * T_MAX))
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [reduce])

  const path = useMemo(() => {
    const pts: string[] = []
    for (let s = 0; s <= T_MAX; s += 4) {
      const a = sampleAscent(s)
      pts.push(`${s ? 'L' : 'M'}${((s / T_MAX) * PLOT_W).toFixed(1)} ${(PLOT_H - (a.altitudeKm / ALT_MAX) * PLOT_H).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  const now = sampleAscent(t)
  const cx = (t / T_MAX) * PLOT_W
  const cy = PLOT_H - (now.altitudeKm / ALT_MAX) * PLOT_H
  const events: [number, string][] = [
    [ASCENT_TIMELINE.maxQ, 'Max-Q'],
    [ASCENT_TIMELINE.meco, 'MECO'],
    [ASCENT_TIMELINE.seco, 'SECO'],
  ]
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(Math.floor(t % 60)).padStart(2, '0')

  return (
    <div className="relative">
      <dl className="grid grid-cols-3 gap-px border-b border-border-prominent pb-3 font-mono text-text-primary">
        {[
          ['T+', `${mm}:${ss}`],
          ['Altitude', `${now.altitudeKm.toFixed(1)} km`],
          ['Speed', `${Math.round(now.speed).toLocaleString()} m/s`],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{k}</dt>
            <dd className="mt-1 text-[17px] tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <svg viewBox={`-28 -12 ${PLOT_W + 40} ${PLOT_H + 40}`} className="mt-3 w-full text-text-primary" role="img" aria-label="Ascent profile from liftoff to orbit, computed by the ORBIT-X trajectory model">
        {[0, 80, 160, 240].map((a) => (
          <g key={a}>
            <line x1="0" x2={PLOT_W} y1={PLOT_H - (a / ALT_MAX) * PLOT_H} y2={PLOT_H - (a / ALT_MAX) * PLOT_H} stroke="currentColor" strokeOpacity={0.12} />
            <text x="-6" y={PLOT_H - (a / ALT_MAX) * PLOT_H + 3} textAnchor="end" fill="currentColor" fillOpacity={0.55} fontSize="9" fontFamily="Geist Mono, monospace">
              {a}
            </text>
          </g>
        ))}
        {events.map(([et, label]) => {
          const x = (et / T_MAX) * PLOT_W
          return (
            <g key={label}>
              <line x1={x} x2={x} y1="0" y2={PLOT_H} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="2 3" />
              <text x={x + 3} y="8" fill="currentColor" fillOpacity={t >= et ? 1 : 0.45} fontSize="9" fontFamily="Geist Mono, monospace">
                {label}
              </text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke="currentColor" strokeOpacity={0.22} strokeWidth="1.5" />
        <path
          d={path}
          fill="none"
          stroke="#fc3d21"
          strokeWidth="2.5"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - t / T_MAX}
        />
        <circle cx={cx} cy={cy} r="4.5" fill="#fc3d21" className="stroke-bg-panel" strokeWidth="1.5" />
        <text x={PLOT_W} y={PLOT_H + 18} textAnchor="end" fill="currentColor" fillOpacity={0.55} fontSize="9" fontFamily="Geist Mono, monospace">
          seconds after liftoff → orbit at 215 km
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const dark = useThemeStore((s) => s.theme) === 'dark'
  const primaryTo = isAuthenticated ? '/dashboard' : '/register'
  const checks = useMemo(() => runValidation(), [])
  const passed = checks.filter((c) => c.pass).length
  const showcase = checks.filter((c) => ['iss-period', 'mars-hohmann', 'maxq-time', 'mars-flux'].includes(c.id))

  return (
    <div className="min-h-dvh bg-bg-primary text-text-primary">
      {/* ---------------- Masthead ---------------- */}
      <header className="relative border-b border-border-subtle bg-bg-secondary">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fc3d21]" aria-hidden />
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-baseline gap-3" aria-label="ORBIT-X home">
            <span className="text-[22px] font-[900] tracking-[0.06em] [font-stretch:115%]">ORBIT-X</span>
            <span className="hidden text-xs text-text-muted md:inline">Space mission design program</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-text-secondary md:flex" aria-label="Sections">
            <a href="#missions" className="hover:text-text-primary">Missions</a>
            <a href="#how" className="hover:text-text-primary">How it plays</a>
            <a href="#physics" className="hover:text-text-primary">Physics</a>
          </nav>
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary sm:inline-block">
                Sign in
              </Link>
            )}
            <Link to={primaryTo} className="inline-flex items-center gap-2 rounded-md bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
              {isAuthenticated ? 'Open console' : 'Start a mission'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ---------------- First viewport ---------------- */}
        <section className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-14 pt-12 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pt-16">
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
              className="text-[clamp(3rem,7.4vw,6rem)] font-[850] leading-[0.92] tracking-[-0.04em] [font-stretch:88%]"
            >
              Design the spacecraft.
              <br />
              <span className="text-accent-blue">Fly the physics.</span>
            </motion.h1>
            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-text-secondary">
              ORBIT-X puts you in the mission engineer’s chair. Answer a real science question, budget the mass and power, pick a rocket,
              launch from Cape Canaveral and fly the mission. Every choice has a number behind it, and the debrief tells you why.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={primaryTo} className="inline-flex items-center gap-2 rounded-md bg-accent-blue px-6 py-3.5 text-base font-semibold text-white transition hover:brightness-110">
                Start a mission <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/demo/moon/briefing"
                className="inline-flex items-center gap-2 rounded-md border border-border-prominent bg-bg-secondary px-6 py-3.5 text-base font-semibold text-text-primary transition hover:border-text-primary"
              >
                Try the Moon mission, no sign-up
              </Link>
            </div>
            <p className="mt-6 text-sm text-text-muted">
              Judging? Jump straight in:{' '}
              <Link to="/demo/earth/launch" className="font-medium text-accent-cyan underline underline-offset-4 hover:text-text-primary">launch to orbit</Link>
              {' · '}
              <Link to="/demo/earth/launch?fail=breakup" className="font-medium text-accent-cyan underline underline-offset-4 hover:text-text-primary">a design that fails</Link>
              {' · '}
              <Link to="/demo/earth/physics" className="font-medium text-accent-cyan underline underline-offset-4 hover:text-text-primary">physics check</Link>
            </p>
          </div>

          {/* Space window: the photographic Earth with the live ascent model */}
          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.1 }}
            className={`relative overflow-hidden rounded-md border lg:col-span-5 ${dark ? 'force-dark border-white/[0.06] bg-[#07090d]' : 'border-border-subtle bg-bg-panel shadow-sm'}`}
          >
            {dark && (
              <div className="pointer-events-none absolute -bottom-[78%] left-1/2 w-[150%] -translate-x-1/2" aria-hidden>
                <Planet3DViewer type="earth" size="100%" interactive={false} sunPosition={[-3, 4, 5]} sunIntensity={2.6} className="aspect-square" />
              </div>
            )}
            <div className={`relative p-6 sm:p-7 ${dark ? 'pb-[34%] sm:pb-[36%]' : ''}`}>
              <figcaption className="mb-4 text-sm font-semibold text-text-primary">Ascent to orbit, computed live</figcaption>
              <AscentPlot />
            </div>
          </motion.figure>
        </section>

        {/* ---------------- Flight-plan rule ---------------- */}
        <section id="how" className="scroll-mt-6 border-y border-border-subtle bg-bg-secondary">
          <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8">
            <h2 className="text-2xl font-[800] tracking-[-0.02em]">Every mission, the same eight steps a real one takes</h2>
            <ol className="relative mt-10 grid grid-cols-4 gap-y-10 md:grid-cols-8">
              <span className="absolute left-0 right-0 top-[7px] h-[2px] bg-text-primary" aria-hidden />
              {PHASES.map((p, i) => (
                <li key={p} className="relative pr-3">
                  <span className={`relative block h-4 w-[2px] ${i === 5 ? 'bg-[#fc3d21]' : 'bg-text-primary'}`} aria-hidden />
                  <p className="mt-3 text-[15px] font-semibold">{p}</p>
                  <p className="mt-1 text-[13px] leading-snug text-text-muted">
                    {
                      [
                        'The science question and success criteria',
                        'Transfer window and Δv budget',
                        'Bus, engine, power, comms, instruments',
                        'Payload capacity versus mass',
                        'GO/NO-GO checks, or launch anyway',
                        'Real-time ascent from Cape Canaveral',
                        'Anomalies that need a decision',
                        'A score with the reasons behind it',
                      ][i]
                    }
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Mission spec sheet ---------------- */}
        <section id="missions" className="mx-auto max-w-[1320px] scroll-mt-6 px-5 py-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-[18ch] text-[clamp(2rem,4vw,3.25rem)] font-[850] leading-[0.98] tracking-[-0.035em] [font-stretch:90%]">
              Three missions, each harder than the last.
            </h2>
            <p className="max-w-[40ch] text-text-secondary">Clear one to unlock the next. Each starts from a question scientists are still asking.</p>
          </div>
          <div className="mt-10 border-t-2 border-text-primary">
            {MISSIONS.map((m) => (
              <Link
                key={m.id}
                to={`/demo/${m.demo}/briefing`}
                className="group grid gap-4 border-b border-border-subtle py-7 transition-colors hover:bg-bg-secondary md:grid-cols-12 md:items-center md:px-3"
              >
                <div className="md:col-span-3">
                  <p className="text-2xl font-[800] tracking-[-0.02em]">{m.name}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {m.target} · {m.level}
                  </p>
                </div>
                <p className="text-[17px] leading-snug text-text-primary md:col-span-5">{MISSION_SCIENCE[m.id]?.question}</p>
                <dl className="grid grid-cols-3 gap-4 font-mono text-sm md:col-span-3">
                  {[
                    ['Δv', `${m.dv} m/s`],
                    ['Budget', `${m.budget} cr`],
                    ['Days', m.days],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{k}</dt>
                      <dd className="mt-1 tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <span className="hidden justify-self-end text-accent-blue md:col-span-1 md:inline-flex">
                  <ArrowUpRight className="h-6 w-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------------- What makes it real ---------------- */}
        <section className="border-t border-border-subtle bg-bg-secondary">
          <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8">
            <h2 className="max-w-[22ch] text-[clamp(2rem,4vw,3.25rem)] font-[850] leading-[0.98] tracking-[-0.035em] [font-stretch:90%]">
              Decisions with consequences you can see.
            </h2>
            <div className="mt-12 grid md:grid-cols-2">
              {REAL.map((r, i) => (
                <div
                  key={r.title}
                  className={`border-t border-border-subtle py-8 md:px-8 ${i % 2 === 0 ? 'md:border-r md:pl-0' : 'md:pr-0'}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-blue">{r.fact}</p>
                  <h3 className="mt-2 text-2xl font-[800] tracking-[-0.02em]">{r.title}</h3>
                  <p className="mt-3 max-w-[60ch] leading-relaxed text-text-secondary">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Physics you can check ---------------- */}
        <section id="physics" className="mx-auto max-w-[1320px] scroll-mt-6 px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-[850] leading-[0.98] tracking-[-0.035em] [font-stretch:90%]">
                {passed} of {checks.length} checks pass.
              </h2>
              <p className="mt-4 text-text-secondary">
                These values are computed right now, in your browser, by the same code the game runs. Nothing is typed in to match.
              </p>
              <Link to="/demo/earth/physics" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent-cyan underline underline-offset-4">
                See all {checks.length} checks <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <table className="w-full text-left lg:col-span-8">
              <thead>
                <tr className="border-b-2 border-text-primary text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  <th scope="col" className="py-3 font-semibold">Quantity</th>
                  <th scope="col" className="py-3 text-right font-semibold">ORBIT-X</th>
                  <th scope="col" className="py-3 text-right font-semibold">Published</th>
                </tr>
              </thead>
              <tbody>
                {showcase.map((c) => (
                  <tr key={c.id} className="border-b border-border-subtle align-top">
                    <td className="py-4 pr-4">
                      <p className="font-semibold">{c.quantity}</p>
                      <p className="mt-0.5 text-sm text-text-muted">{c.source}</p>
                    </td>
                    <td className="whitespace-nowrap py-4 text-right font-mono tabular-nums">
                      {c.ours.toFixed(c.digits ?? 1)} <span className="text-text-muted">{c.unit}</span>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-4 text-right font-mono tabular-nums text-text-secondary">
                      {Array.isArray(c.reference) ? `${c.reference[0]}–${c.reference[1]}` : c.reference} <span className="text-text-muted">{c.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Close: the red field ---------------- */}
        <section className="bg-[#fc3d21] text-white">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-8 px-5 py-20 sm:px-8">
            <h2 className="max-w-[16ch] text-[clamp(2.5rem,6vw,5rem)] font-[900] leading-[0.92] tracking-[-0.04em] text-[#121316] [font-stretch:88%]">
              Your launch window is open.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link to={primaryTo} className="inline-flex items-center gap-2 rounded-md bg-[#121316] px-6 py-3.5 font-semibold text-white transition hover:bg-black">
                Start a mission <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/demo/moon/briefing" className="inline-flex items-center gap-2 rounded-md border-2 border-[#121316] px-6 py-3 font-semibold text-[#121316] transition hover:bg-[#121316] hover:text-white">
                Try without an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-bg-secondary">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-text-muted sm:px-8">
          <p>
            <span className="font-[900] tracking-[0.06em] text-text-primary">ORBIT-X</span> · Built for the NASA Space Apps Challenge 2026
          </p>
          <p>Independent student project. Not affiliated with or endorsed by NASA.</p>
        </div>
      </footer>
    </div>
  )
}
