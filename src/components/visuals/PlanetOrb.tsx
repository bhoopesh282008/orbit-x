export interface PlanetVisualizationProps {
  name: string
  color: string
  size?: number
  rings?: boolean
  atmosphere?: string
  textureType?: 'moon' | 'earth' | 'mars'
}

export function PlanetOrb({
  color,
  size = 140,
  rings = false,
  atmosphere = '#38bdf8',
  textureType = 'earth',
}: PlanetVisualizationProps) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer atmospheric haze */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${atmosphere} 0%, transparent 70%)`,
          transform: 'scale(1.25)',
        }}
      />

      {/* Planetary Body with realistic 3D lighting gradient */}
      <div
        className="relative w-full h-full rounded-full shadow-2xl overflow-hidden border border-white/10"
        style={{
          background: getPlanetGradient(textureType, color),
          boxShadow: `inset -25px -25px 40px rgba(0,0,0,0.85), inset 10px 10px 20px rgba(255,255,255,0.25), 0 0 35px ${color}33`,
        }}
      >
        {/* Procedural surface feature overlays */}
        {textureType === 'earth' && (
          <div className="absolute inset-0 opacity-45 mix-blend-overlay bg-[radial-gradient(#10b981_15%,transparent_40%),radial-gradient(#059669_20%,transparent_50%)] bg-[length:60px_60px] animate-[spin_60s_linear_infinite]" />
        )}
        {textureType === 'mars' && (
          <div className="absolute inset-0 opacity-30 mix-blend-multiply bg-[radial-gradient(#7f1d1d_20%,transparent_60%)] bg-[length:40px_40px]" />
        )}
        {textureType === 'moon' && (
          <div className="absolute inset-0 opacity-40 mix-blend-darken bg-[radial-gradient(#334155_10%,transparent_30%),radial-gradient(#1e293b_15%,transparent_40%)] bg-[length:30px_30px]" />
        )}

        {/* Dynamic shadow day/night terminator */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(115deg, rgba(255,255,255,0.15) 0%, transparent 45%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.98) 100%)',
          }}
        />
      </div>

      {/* Planetary Rings if applicable */}
      {rings && (
        <div
          className="absolute border border-cyan-400/40 rounded-[100%] pointer-events-none"
          style={{
            width: size * 1.85,
            height: size * 0.45,
            boxShadow: `0 0 15px ${atmosphere}44, inset 0 0 15px ${atmosphere}44`,
            transform: 'rotate(-25deg)',
          }}
        />
      )}
    </div>
  )
}

function getPlanetGradient(type: string, baseColor: string): string {
  switch (type) {
    case 'moon':
      return 'radial-gradient(circle at 35% 35%, #cbd5e1 0%, #64748b 45%, #1e293b 85%, #0f172a 100%)'
    case 'mars':
      return 'radial-gradient(circle at 35% 35%, #f87171 0%, #dc2626 40%, #991b1b 75%, #450a0a 100%)'
    case 'earth':
    default:
      return `radial-gradient(circle at 35% 35%, #38bdf8 0%, ${baseColor} 45%, #0f172a 85%, #020617 100%)`
  }
}

