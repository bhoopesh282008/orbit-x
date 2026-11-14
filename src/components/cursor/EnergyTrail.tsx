import type { CursorThemeColors } from './cursorConfig'

export interface EnergyParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  maxLife: number
  life: number
  color: string
}

export interface EnergyStreak {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  opacity: number
}

export class EnergyTrailRenderer {
  private particles: EnergyParticle[] = []
  private streaks: EnergyStreak[] = []
  private maxParticles = 60

  public emit(
    x: number,
    y: number,
    speed: number,
    angle: number,
    colors: CursorThemeColors
  ) {
    if (speed < 0.25) return

    // Spawn count scales smoothly with speed (1 to 4 particles per step)
    const count = Math.min(Math.floor(speed * 0.4) + 1, 4)

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift()
      }

      const perpAngle = angle + (Math.random() - 0.5) * Math.PI * 0.75
      const jitterDist = (Math.random() - 0.5) * 5
      const px = x + Math.cos(perpAngle) * jitterDist
      const py = y + Math.sin(perpAngle) * jitterDist

      const spread = (Math.random() - 0.5) * 0.8
      const pSpeed = 0.5 + Math.random() * (speed * 0.12)
      const particleAngle = angle + Math.PI + spread

      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(particleAngle) * pSpeed,
        vy: Math.sin(particleAngle) * pSpeed,
        size: 1.2 + Math.random() * (speed > 8 ? 2.5 : 1.8),
        maxLife: 0.35 + Math.random() * 0.25,
        life: 0.35 + Math.random() * 0.25,
        color: Math.random() > 0.4 ? colors.accent : colors.primary,
      })
    }

    // High-speed light streak
    if (speed > 3.0) {
      this.streaks.unshift({
        x1: x,
        y1: y,
        x2: x - Math.cos(angle) * Math.min(speed * 1.6, 20),
        y2: y - Math.sin(angle) * Math.min(speed * 1.6, 20),
        width: Math.min(speed * 0.22, 2.6),
        opacity: Math.min(speed * 0.08, 0.75),
      })

      if (this.streaks.length > 8) {
        this.streaks.pop()
      }
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D, dt: number, colors?: CursorThemeColors) {
    const streakColor = colors?.accent || '#22d3ee'
    const glowColor = colors?.primary || '#38bdf8'

    // 1. Draw glowing energetic streaks
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i]
      s.opacity -= dt * 3.5

      if (s.opacity <= 0.01) {
        this.streaks.splice(i, 1)
        continue
      }

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(s.x1, s.y1)
      ctx.lineTo(s.x2, s.y2)
      ctx.strokeStyle = streakColor
      ctx.globalAlpha = s.opacity
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.shadowColor = glowColor
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.restore()
    }

    // 2. Draw luminous energy particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      p.x += p.vx
      p.y += p.vy

      const progress = p.life / p.maxLife
      const alpha = progress * 0.95
      const currentRadius = p.size * (0.3 + 0.7 * progress)

      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.fill()
      ctx.restore()
    }
  }

  public clear() {
    this.particles = []
    this.streaks = []
  }
}
