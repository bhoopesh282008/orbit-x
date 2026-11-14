import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EARTH, LAUNCH_SITE, hasWebGL, locate, splashAsset } from './splashEarth'
import { SpinningEarth } from './SpinningEarth'

// The satellite needs a 3D library and a model, so it loads after the words are on screen.
const SatelliteModel = lazy(() => import('./SatelliteModel'))

// NASA's Tycho star map (github.com/nasa/NASA-3D-Resources): the real sky, Milky Way included.
const STAR_MAP = splashAsset('starmap.webp')

const SPLIT_FROM = 1025
const STACKED_BELOW = 640
const PASS_ENDS_AT = -82

export function satelliteAllowed() {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (connection?.saveData) return false
  if (['slow-2g', '2g'].includes(connection?.effectiveType ?? '')) return false
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

export interface WordsBox {
  right: number
  bottom: number
}

function wordsEstimate(width: number): WordsBox {
  const margin = width >= STACKED_BELOW ? 40 : 24
  const wordmark = Math.min(Math.max(width * 0.086, 60), 128)
  return { right: Math.min(width - margin, margin + 384), bottom: 440 + 0.88 * wordmark }
}

/** Where everything sits, in pixels: the planet rises from the lower edge as a horizon. */
function layout(width: number, height: number, words: WordsBox = wordsEstimate(width)) {
  const wide = width >= SPLIT_FROM
  const diameter = wide ? Math.min(height * 1.5, width * 0.9) : Math.min(width * 1.25, height * 0.72)
  const radius = diameter / 2
  const top = wide ? height * 0.3 : width < STACKED_BELOW ? Math.max(height * 0.6, words.bottom + 28) : height * 0.6
  const centre = { x: wide ? width * 0.74 : width * 0.62, y: top + radius }
  const image = diameter / EARTH.disc

  const orbit = radius * 1.2
  const angle = ((wide ? -128 : -118) * Math.PI) / 180
  const size = wide ? Math.min(width, height) * 0.26 : Math.min(width * 0.34, 150)
  const onOrbit = (x: number) => {
    const across = Math.min(orbit, Math.abs(x - centre.x))
    return Math.max(size / 2 + 16, centre.y - Math.sqrt(orbit * orbit - across * across))
  }
  const wordmark = Math.min(Math.max(width * 0.086, 60), 128)
  let satelliteX = centre.x + orbit * Math.cos(angle)
  if (wide) {
    const wordmarkEnd = width * 0.06 + 4.5 * wordmark + 32
    satelliteX = Math.max(satelliteX, wordmarkEnd + size / 2)
  } else if (onOrbit(satelliteX) - size / 2 < words.bottom + 16) {
    satelliteX = Math.max(satelliteX, words.right + 16 + size / 2)
  }
  const satelliteY = onOrbit(satelliteX)
  const degrees = (r: number) => (r * 180) / Math.PI
  const from = degrees(Math.atan2(satelliteY - centre.y, satelliteX - centre.x))
  const reach = Math.hypot(satelliteX - centre.x, satelliteY - centre.y)
  const rightmost = -degrees(Math.acos(Math.min(1, Math.max(-1, (width - 8 - size / 2 - centre.x) / reach))))
  const sweep = Math.max(0, Math.min(Math.max(PASS_ENDS_AT, from + 10), from + 34, rightmost) - from)
  return {
    planet: { centre, radius, diameter, image, left: centre.x - image / 2, top: centre.y - image / 2 },
    orbit,
    satellite: { x: satelliteX, y: satelliteY, size, sweep, shown: wide || width >= STACKED_BELOW },
  }
}

function useWindowSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

/**
 * The view from space behind the splash words: star map, the turning Blue Marble with the
 * launch site marked, and NASA's Jason-1 making a pass. `leaving` closes in on the launch site.
 */
export function SpaceScene({ settled, leaving = false, words }: { settled: boolean; leaving?: boolean; words: WordsBox | null }) {
  const { width, height } = useWindowSize()
  const [withSatellite] = useState(satelliteAllowed)
  const [live] = useState(hasWebGL)
  const [satelliteShown, setSatelliteShown] = useState(false)
  const [turning, setTurning] = useState(false)
  const { planet, orbit, satellite } = layout(width, height, words ?? undefined)

  // The launch-site mark is moved directly every frame, without re-rendering React
  const markRef = useRef<HTMLDivElement>(null)
  const longitude = useRef(EARTH.longitude0)
  const spotRef = useRef<{ x: number; y: number } | null>(null)

  const place = (turnedTo: number) => {
    longitude.current = turnedTo
    const spot = locate(LAUNCH_SITE.latitude, LAUNCH_SITE.longitude, { ...EARTH, longitude0: turnedTo })
    const x = planet.left + spot.x * planet.image
    const y = planet.top + spot.y * planet.image
    spotRef.current = spot.visible ? { x, y } : null
    if (markRef.current) {
      markRef.current.style.transform = `translate(${x}px, ${y}px)`
      markRef.current.style.opacity = spot.visible && (turning || !live) ? '1' : '0'
    }
  }
  useLayoutEffect(() => place(longitude.current))

  const focus = spotRef.current ?? { x: planet.centre.x, y: Math.min(planet.centre.y, height * 0.8) }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#0b0c0d]" aria-hidden>
      <div
        className={`splash-scene absolute inset-0 ${leaving ? 'splash-scene--leaving' : ''}`}
        style={leaving ? { transformOrigin: `${focus.x}px ${focus.y}px` } : undefined}
      >
        <div
          className="splash-sky absolute -inset-[3%] bg-cover bg-center [filter:brightness(1.5)_contrast(1.1)]"
          style={{ backgroundImage: `url(${STAR_MAP})` }}
        />

        <svg className="absolute inset-0 h-full w-full" width={width} height={height}>
          <circle
            cx={planet.centre.x}
            cy={planet.centre.y}
            r={orbit}
            fill="none"
            stroke="rgba(242,241,237,0.45)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="0.1 8"
          />
        </svg>

        <div className="splash-rise absolute" style={{ left: planet.left, top: planet.top, width: planet.image, height: planet.image }}>
          {live ? (
            <div className={`absolute inset-0 transition-opacity duration-700 ${turning ? 'opacity-100' : 'opacity-0'}`}>
              <SpinningEarth onTurn={place} onShown={() => setTurning(true)} />
            </div>
          ) : (
            <img src={EARTH.still} alt="" width="1800" height="1800" decoding="async" className="relative block h-full w-full select-none" draggable={false} />
          )}
        </div>

        {/* Launch site: a ring and a label, riding on the turning Earth */}
        <div ref={markRef} className="splash-site pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-700">
          <span className="splash-site__ring" />
          <span className="splash-site__label">{LAUNCH_SITE.name}</span>
        </div>

        {withSatellite && settled && satellite.shown && (
          <div
            className="splash-pass absolute"
            style={
              {
                left: satellite.x - satellite.size / 2,
                top: satellite.y - satellite.size / 2,
                width: satellite.size,
                height: satellite.size,
                transformOrigin: `${planet.centre.x - (satellite.x - satellite.size / 2)}px ${planet.centre.y - (satellite.y - satellite.size / 2)}px`,
                '--sweep': `${satellite.sweep}deg`,
                '--pass': `${Math.max(20, Math.round(satellite.sweep * 1.6))}s`,
              } as React.CSSProperties
            }
          >
            <div className={`h-full w-full transition-opacity duration-1000 ${satelliteShown ? 'opacity-100' : 'opacity-0'}`}>
              <Suspense fallback={null}>
                <SatelliteModel onShown={() => setSatelliteShown(true)} />
              </Suspense>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,13,0.6),rgba(11,12,13,0)_55%)]" />
        <div className="splash-vignette absolute inset-0" />
      </div>
    </div>
  )
}
