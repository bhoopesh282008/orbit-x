import { ArrowRight, Check } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SpaceScene, type WordsBox } from './SpaceScene'
import { useEarthTextures } from '@/three/utils/useEarthTextures'
import { runValidation } from '@/services/modelValidation'
import { EARTH } from './splashEarth'
import './splash.css'

/** How long the way out takes: words go, the view closes in on the Cape, the screen fades. */
export const LEAVE_MS = 720

type StepId = 'imagery' | 'physics' | 'console'

/**
 * The entry screen (ported from the TAN splash). The checklist is the loading indicator: each
 * line ticks when its work has actually finished, and the button fills as they do.
 */
export function SplashScreen({ onReady, onLeave }: { onReady: () => void; onLeave?: () => void }) {
  const textures = useEarthTextures()
  const [done, setDone] = useState<Record<StepId, boolean>>({ imagery: false, physics: false, console: false })
  const [physics, setPhysics] = useState<{ passed: number; total: number } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const startButton = useRef<HTMLButtonElement>(null)
  const wordsRef = useRef<HTMLElement>(null)
  const [words, setWords] = useState<WordsBox | null>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  // 1. NASA imagery: the splash globe map plus the textures the game scenes use
  useEffect(() => {
    const img = new Image()
    img.src = EARTH.map
    img
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (textures) setDone((d) => ({ ...d, imagery: true }))
      })
  }, [textures])

  // 2. The physics model, checked against published figures
  useEffect(() => {
    const id = window.setTimeout(() => {
      const results = runValidation()
      setPhysics({ passed: results.filter((r) => r.pass).length, total: results.length })
      setDone((d) => ({ ...d, physics: true }))
    }, 350)
    return () => window.clearTimeout(id)
  }, [])

  // 3. Mission control's code, fetched while the visitor is still here
  useEffect(() => {
    let alive = true
    Promise.all([import('@/pages/DashboardPage'), import('@/pages/LaunchOperationsPage'), import('@/pages/CampaignPage')])
      .catch(() => undefined)
      .then(() => alive && setDone((d) => ({ ...d, console: true })))
    return () => {
      alive = false
    }
  }, [])

  const steps: { id: StepId; label: string }[] = [
    { id: 'imagery', label: 'NASA Blue Marble imagery received' },
    { id: 'physics', label: physics ? `Physics checked: ${physics.passed} of ${physics.total} against NASA data` : 'Checking physics against NASA data' },
    { id: 'console', label: 'Mission control loaded' },
  ]
  const progress = steps.filter((s) => done[s.id]).length / steps.length
  const ready = progress === 1

  useEffect(() => {
    if (ready && window.matchMedia?.('(pointer: fine)').matches) startButton.current?.focus()
  }, [ready])

  const launch = () => {
    if (leaving) return
    if (window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
      setLeaving(true)
      onLeave?.()
    } else onReady()
  }
  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => readyRef.current(), LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  // Enter launches from anywhere once ready
  const launchRef = useRef(launch)
  launchRef.current = launch
  useEffect(() => {
    if (!ready) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== 'Enter' || event.repeat || target?.closest?.('button, a, input, select, textarea')) return
      launchRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready])

  useLayoutEffect(() => {
    const element = wordsRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const next = { right: element.offsetLeft + element.offsetWidth, bottom: element.offsetTop + element.offsetHeight }
      setWords((now) => (now && now.right === next.right && now.bottom === next.bottom ? now : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      aria-hidden={leaving || undefined}
      className={`splash relative isolate flex min-h-[100dvh] flex-col px-6 pb-16 pt-20 sm:px-10 lg:justify-center lg:pl-[6vw] lg:pt-16 ${
        leaving ? 'splash--leaving' : ''
      }`}
    >
      <SpaceScene settled={ready} leaving={leaving} words={words} />

      <main ref={wordsRef} className="splash-ui w-full max-w-[36rem]">
        <h1
          className="splash-in whitespace-nowrap text-[clamp(3.75rem,8.6vw,8rem)] font-[900] leading-[0.86] tracking-[-0.045em] text-[#f2f1ed] [font-stretch:88%]"
          style={{ '--i': 0 } as React.CSSProperties}
        >
          ORBIT-X
        </h1>
        <p className="splash-in mt-5 text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a9aba8]" style={{ '--i': 1 } as React.CSSProperties}>
          Space mission design program
        </p>
        <p className="splash-in mt-6 max-w-[22rem] text-[1.25rem] leading-[1.35] text-[#f2f1ed]/90" style={{ '--i': 2 } as React.CSSProperties}>
          Design the spacecraft. Launch it from the Cape. Fly the physics.
        </p>

        <ul className="splash-in mt-10 grid gap-3" style={{ '--i': 3 } as React.CSSProperties}>
          {steps.map((step) => {
            const finished = done[step.id]
            return (
              <li key={step.id} className="flex items-center gap-3 text-[14px] leading-tight">
                <span className={`splash-state ${finished ? 'splash-state--done' : ''}`} aria-hidden>
                  {finished && <Check size={11} strokeWidth={3.5} className="splash-tick" />}
                </span>
                <span className={`font-medium transition-colors duration-300 ${finished ? 'text-[#f2f1ed]' : 'text-[#a9aba8]'}`}>{step.label}</span>
                <span className="sr-only">{finished ? 'done' : 'in progress'}</span>
              </li>
            )
          })}
        </ul>

        <p className="sr-only" role="status">
          {ready ? 'Mission control ready.' : 'Loading mission control…'}
        </p>

        <div className="splash-in mt-10 flex flex-col items-start gap-3" style={{ '--i': 4 } as React.CSSProperties}>
          <button
            ref={startButton}
            type="button"
            disabled={!ready}
            onClick={launch}
            className={`splash-cta inline-flex h-12 w-full min-w-[15rem] items-center justify-center gap-2.5 rounded-[4px] border px-7 text-[15px] font-semibold sm:w-auto ${
              ready ? 'border-[#fc3d21] bg-[#fc3d21] text-white hover:bg-[#ff5a40] active:scale-[0.98]' : 'border-[var(--line)] text-[#f2f1ed]'
            }`}
          >
            {!ready && <span className="splash-cta__fill" style={{ width: `${Math.max(progress, 0.04) * 100}%` }} />}
            {ready ? 'Enter mission control' : 'Preparing mission control…'}
            {ready && <ArrowRight size={17} strokeWidth={2.25} className="splash-cta__arrow" aria-hidden />}
          </button>
          {ready && <p className="text-[12px] text-[#a9aba8]">or press Enter</p>}
        </div>
      </main>

      <p className="splash-ui absolute bottom-4 left-6 text-[11px] leading-relaxed text-[#a9aba8] sm:left-10 lg:left-[6vw]">
        Earth: NASA Blue Marble. Star map and Jason-1 model: NASA. ORBIT-X is an independent Space Apps project, not affiliated with NASA.
      </p>
    </div>
  )
}
