import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '@/stores/gameStore'
import { useThemeStore } from '@/stores/themeStore'
import { CURSOR_THEMES } from './cursorConfig'
import { EnergyTrailRenderer } from './EnergyTrail'
import './cursor.css'

interface ClickRipple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
}

export function HolographicCursor() {
  const enabled = useGameStore((s) => s.settings.customCursorEnabled)
  const theme = useThemeStore((s) => s.theme)
  const colors = CURSOR_THEMES[theme] || CURSOR_THEMES.dark

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef({
    // Center Dot coordinates (exact 1:1 mouse pointer tracking)
    dotX: -100,
    dotY: -100,
    prevDotX: -100,
    prevDotY: -100,

    // Motion velocity smoothing for organic trailing response
    smoothedVx: 0,
    smoothedVy: 0,
    currentOffsetX: 0,
    currentOffsetY: 0,

    // Circular Ring coordinates (70-80% tracking alignment with 20-30% trailing separation)
    ringX: -100,
    ringY: -100,
    ringRadius: 16, // Default 16px radius = 32px diameter

    // Interaction states
    hoverType: 'default' as 'default' | 'button' | 'card' | 'link' | 'viewer3d' | 'input',
    clickScale: 1.0,
    ripples: [] as ClickRipple[],
    visible: true,
    hasMoved: false,
  })

  const trailRef = useRef<EnergyTrailRenderer>(new EnergyTrailRenderer())

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!enabled || prefersReducedMotion) {
      document.documentElement.classList.remove('orbit-x-custom-cursor')
      return
    }

    // Suppress native OS cursor inside document
    document.documentElement.classList.add('orbit-x-custom-cursor')

    const state = stateRef.current
    const trail = trailRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const onPointerMove = (e: MouseEvent) => {
      // Center dot follows mouse pointer immediately with zero lag
      state.dotX = e.clientX
      state.dotY = e.clientY

      if (!state.hasMoved) {
        state.ringX = e.clientX
        state.ringY = e.clientY
        state.prevDotX = e.clientX
        state.prevDotY = e.clientY
        state.hasMoved = true
      }
      state.visible = true

      // Detect hover target
      const target = e.target as HTMLElement | null
      if (!target) {
        state.hoverType = 'default'
        return
      }

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        state.hoverType = 'input'
      } else if (target.closest('canvas') && !target.classList.contains('orbit-cursor-canvas')) {
        state.hoverType = 'viewer3d'
      } else if (
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.getAttribute('role') === 'button'
      ) {
        state.hoverType = 'button'
      } else if (target.tagName === 'A' || target.closest('a')) {
        state.hoverType = 'link'
      } else if (target.closest('.card') || target.closest('[data-slot="card"]')) {
        state.hoverType = 'card'
      } else {
        state.hoverType = 'default'
      }
    }

    const onMouseDown = () => {
      state.clickScale = 0.85
      state.ripples.push({
        x: state.dotX,
        y: state.dotY,
        radius: 4,
        maxRadius: 36,
        opacity: 0.9,
      })
    }

    const onMouseUp = () => {
      state.clickScale = 1.0
    }

    const onMouseLeave = () => {
      state.visible = false
      trail.clear()
    }

    const onMouseEnter = (e: MouseEvent) => {
      state.dotX = e.clientX
      state.dotY = e.clientY
      state.prevDotX = e.clientX
      state.prevDotY = e.clientY
      state.ringX = e.clientX
      state.ringY = e.clientY
      state.smoothedVx = 0
      state.smoothedVy = 0
      state.currentOffsetX = 0
      state.currentOffsetY = 0
      state.visible = true
    }

    window.addEventListener('mousemove', onPointerMove, { passive: true, capture: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true })
    window.addEventListener('mousedown', onMouseDown, { passive: true, capture: true })
    window.addEventListener('mouseup', onMouseUp, { passive: true, capture: true })
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)

    let animId: number
    let lastTime = performance.now()

    const render = (time: number) => {
      animId = requestAnimationFrame(render)
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!state.visible || !state.hasMoved || state.hoverType === 'input') {
        return
      }

      // 1. Calculate Dot Velocity & Emit Energy Trail directly from the Center Dot (100% accurate)
      const rawVx = state.dotX - state.prevDotX
      const rawVy = state.dotY - state.prevDotY
      const rawSpeed = Math.hypot(rawVx, rawVy)

      // Smooth the velocity vector to maintain fluid directional arcs and eliminate jitter
      state.smoothedVx += (rawVx - state.smoothedVx) * 0.28
      state.smoothedVy += (rawVy - state.smoothedVy) * 0.28
      const speed = Math.hypot(state.smoothedVx, state.smoothedVy)

      if (rawSpeed > 0.3) {
        const dotAngle = Math.atan2(rawVy, rawVx)
        // Energy originates from and follows the exact center dot
        trail.emit(state.dotX, state.dotY, rawSpeed, dotAngle, colors)
      }
      state.prevDotX = state.dotX
      state.prevDotY = state.dotY

      // 2. Circular Ring — 30% Tracking Response (with 70% Delayed Trailing Movement)
      // Configurable maximum trailing distance of approximately 25–35 pixels
      const maxLagDistance = 30 // Bounded to 30px max separation
      let targetOffsetX = 0
      let targetOffsetY = 0

      if (speed > 0.3) {
        // Dynamic trailing offset opposite to movement direction
        const lagDist = Math.min(speed * 1.25, maxLagDistance)
        const dirX = state.smoothedVx / speed
        const dirY = state.smoothedVy / speed

        targetOffsetX = -dirX * lagDist
        targetOffsetY = -dirY * lagDist
      }

      // Time-based smooth interpolation for directional transitions
      const offsetRate = 1 - Math.exp(-5.0 * dt)
      state.currentOffsetX += (targetOffsetX - state.currentOffsetX) * offsetRate
      state.currentOffsetY += (targetOffsetY - state.currentOffsetY) * offsetRate

      // The trailing target position for the circular ring
      const targetRingX = state.dotX + state.currentOffsetX
      const targetRingY = state.dotY + state.currentOffsetY

      // Time-based smoothing equivalent to approximately 30% immediate tracking response
      const trackingRate = 1 - Math.exp(-6.5 * dt)
      state.ringX += (targetRingX - state.ringX) * trackingRate
      state.ringY += (targetRingY - state.ringY) * trackingRate

      // Strict boundary clamp: Ring separation never exceeds 30px from the center dot
      const curDist = Math.hypot(state.ringX - state.dotX, state.ringY - state.dotY)
      const absoluteMaxOffset = 30
      if (curDist > absoluteMaxOffset) {
        const clampRatio = absoluteMaxOffset / curDist
        state.ringX = state.dotX + (state.ringX - state.dotX) * clampRatio
        state.ringY = state.dotY + (state.ringY - state.dotY) * clampRatio
      }

      // When the mouse stops and trailing movement decays, gradually bring the ring back centered over the dot
      if (speed < 0.2 && Math.hypot(state.ringX - state.dotX, state.ringY - state.dotY) < 0.35) {
        state.ringX = state.dotX
        state.ringY = state.dotY
        state.currentOffsetX = 0
        state.currentOffsetY = 0
      }

      // 3. Smooth Ring Radius & Click Animation
      const isHovering = state.hoverType === 'button' || state.hoverType === 'link'
      const isViewer3D = state.hoverType === 'viewer3d'
      const baseRadius = isHovering ? 19 : isViewer3D ? 18 : 16 // 32px - 38px diameter
      state.ringRadius += (baseRadius - state.ringRadius) * 0.25
      state.clickScale += (1.0 - state.clickScale) * 0.22

      const renderedRadius = state.ringRadius * state.clickScale

      // 4. Draw Energy Trail (behind cursor elements)
      trail.updateAndDraw(ctx, dt, colors)

      // 5. Draw Circular Energy Shockwave Ripples on Click
      for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i]
        r.radius += (r.maxRadius - r.radius) * 0.2 + 0.8
        r.opacity *= 0.91

        ctx.save()
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = colors.accent
        ctx.globalAlpha = r.opacity
        ctx.lineWidth = 1.6
        ctx.shadowColor = colors.accent
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.restore()

        if (r.opacity < 0.02 || r.radius >= r.maxRadius - 1) {
          state.ripples.splice(i, 1)
        }
      }

      // 6. Draw ONLY ONE Clean Circular Holographic Ring
      // No rectangular elements, no corner brackets, no square borders, no bounding boxes
      ctx.save()
      // Outer subtle cyan/blue glow pass
      ctx.beginPath()
      ctx.arc(state.ringX, state.ringY, renderedRadius, 0, Math.PI * 2)
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = 1.4
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 8
      ctx.globalAlpha = isHovering ? 0.95 : 0.82
      ctx.stroke()

      // Faint secondary precision ring line for crisp aerospace holographic depth
      ctx.beginPath()
      ctx.arc(state.ringX, state.ringY, renderedRadius, 0, Math.PI * 2)
      ctx.strokeStyle = colors.primary
      ctx.lineWidth = 0.6
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 3
      ctx.globalAlpha = 0.5
      ctx.stroke()
      ctx.restore()

      // 7. Draw Small Glowing Center Dot (Directly at Actual Mouse Coordinates)
      // Diameter: approximately 4–6 pixels (radius 2.2 - 2.8px)
      ctx.save()
      // Glowing cyan halo
      ctx.beginPath()
      ctx.arc(state.dotX, state.dotY, isHovering ? 3.0 : 2.5, 0, Math.PI * 2)
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 8
      ctx.globalAlpha = 0.95
      ctx.fill()

      // Precision bright white core
      ctx.beginPath()
      ctx.arc(state.dotX, state.dotY, isHovering ? 1.8 : 1.5, 0, Math.PI * 2)
      ctx.fillStyle = colors.core || '#ffffff'
      ctx.globalAlpha = 1.0
      ctx.fill()
      ctx.restore()
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onPointerMove, { capture: true })
      window.removeEventListener('pointermove', onPointerMove, { capture: true })
      window.removeEventListener('mousedown', onMouseDown, { capture: true })
      window.removeEventListener('mouseup', onMouseUp, { capture: true })
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
      document.documentElement.classList.remove('orbit-x-custom-cursor')
      trail.clear()
    }
  }, [enabled, colors])

  if (!enabled || typeof document === 'undefined') return null

  return createPortal(
    <canvas
      ref={canvasRef}
      className="orbit-cursor-canvas"
      aria-hidden="true"
    />,
    document.body
  )
}
