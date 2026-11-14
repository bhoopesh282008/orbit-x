import { useId } from 'react'

/**
 * Embroidered-style mission patch drawn in SVG: outer ring with the mission
 * name and codename set on a circular path, a stylised target world with an
 * orbit and spacecraft, and a field of stars. Original artwork per mission.
 */
export function MissionPatch({
  name,
  codename,
  destination,
  color,
  size = 132,
}: {
  name: string
  codename: string
  destination: string
  color: string
  size?: number
}) {
  const id = useId().replace(/:/g, '')
  const top = name.toUpperCase()
  const bottom = `${codename.toUpperCase()} · ${destination.toUpperCase()}`
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${name} mission patch`}>
      <defs>
        <path id={`top-${id}`} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={`bot-${id}`} d="M 26 100 A 74 74 0 0 0 174 100" />
        <radialGradient id={`world-${id}`} cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor="#05070d" />
        </radialGradient>
        <clipPath id={`field-${id}`}>
          <circle cx="100" cy="100" r="58" />
        </clipPath>
      </defs>

      {/* Border and ring */}
      <circle cx="100" cy="100" r="97" fill="#0b1428" stroke="#c9d3e6" strokeWidth="3" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="60" fill="#05070d" stroke="#c9d3e6" strokeWidth="2" />

      <text fill="#f1f4f9" fontSize="14" fontWeight="700" letterSpacing="3" fontFamily="Inter, sans-serif">
        <textPath href={`#top-${id}`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text fill="#a3adbd" fontSize="9.5" fontWeight="600" letterSpacing="2" fontFamily="Inter, sans-serif">
        <textPath href={`#bot-${id}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
          {bottom}
        </textPath>
      </text>
      {[20, 180].map((x) => (
        <circle key={x} cx={x} cy="100" r="2.5" fill="var(--accent-blue)" />
      ))}

      {/* Field: stars, world, orbit, spacecraft */}
      <g clipPath={`url(#field-${id})`}>
        <rect x="40" y="40" width="120" height="120" fill="#060b18" />
        {[
          [62, 64],
          [140, 70],
          [128, 130],
          [70, 138],
          [100, 54],
          [150, 104],
          [56, 110],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#ffffff" opacity="0.8" />
        ))}
        <circle cx="104" cy="112" r="30" fill={`url(#world-${id})`} />
        <ellipse cx="100" cy="102" rx="50" ry="16" fill="none" stroke="#7fb2ff" strokeWidth="1.4" transform="rotate(-18 100 102)" opacity="0.9" />
        <g transform="translate(140 84) rotate(-18)">
          <rect x="-4" y="-3" width="8" height="6" fill="#f1f4f9" />
          <rect x="-13" y="-1.5" width="8" height="3" fill="#7fb2ff" />
          <rect x="5" y="-1.5" width="8" height="3" fill="#7fb2ff" />
        </g>
        <path d="M 46 150 L 154 150" stroke="var(--accent-blue)" strokeWidth="2" opacity="0.6" />
      </g>
    </svg>
  )
}
