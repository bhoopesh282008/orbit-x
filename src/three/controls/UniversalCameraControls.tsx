import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls as DreiOrbitControls } from '@react-three/drei'
import { RotateCcw, ZoomIn, ZoomOut, Compass } from 'lucide-react'

export type CameraPreset = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

export interface UniversalCameraControlsProps {
  defaultPosition?: [number, number, number]
  defaultTarget?: [number, number, number]
  minDistance?: number
  maxDistance?: number
  enablePan?: boolean
  enableZoom?: boolean
  enableRotate?: boolean
  autoRotate?: boolean
  autoRotateSpeed?: number
  minPolarAngle?: number
  maxPolarAngle?: number
}

// Global dispatcher to allow UI buttons outside Canvas to trigger camera preset transitions
type CameraPresetListener = (preset: CameraPreset) => void
type CameraResetListener = () => void
type CameraZoomListener = (delta: number) => void

const presetListeners = new Set<CameraPresetListener>()
const resetListeners = new Set<CameraResetListener>()
const zoomListeners = new Set<CameraZoomListener>()

export function triggerCameraPreset(preset: CameraPreset) {
  presetListeners.forEach((fn) => fn(preset))
}

export function triggerCameraReset() {
  resetListeners.forEach((fn) => fn())
}

export function triggerCameraZoom(factor: number) {
  zoomListeners.forEach((fn) => fn(factor))
}

export function UniversalCameraControls({
  defaultPosition = [3, 2, 4],
  defaultTarget = [0, 0, 0],
  minDistance = 1.2,
  maxDistance = 25,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  autoRotate = false,
  autoRotateSpeed = 0.8,
  minPolarAngle = 0.02,
  maxPolarAngle = Math.PI - 0.02,
}: UniversalCameraControlsProps) {
  const controlsRef = useRef<any>(null)
  const { camera, gl } = useThree()

  // Prevent browser context menu on right click inside 3D canvas so right-drag panning is seamless
  useEffect(() => {
    const dom = gl.domElement
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    dom.addEventListener('contextmenu', preventContextMenu)
    return () => {
      dom.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [gl])

  // Initialize camera position & target
  useEffect(() => {
    camera.position.set(...defaultPosition)
    if (controlsRef.current) {
      controlsRef.current.target.set(...defaultTarget)
      controlsRef.current.update()
    }
  }, [defaultPosition, defaultTarget, camera])

  // Preset execution helper
  const applyPreset = (preset: CameraPreset) => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const target = ctrl.target
    const dist = Math.max(camera.position.distanceTo(target), minDistance + 0.5)

    switch (preset) {
      case 'front':
        camera.position.set(target.x, target.y, target.z + dist)
        break
      case 'rear':
        camera.position.set(target.x, target.y, target.z - dist)
        break
      case 'right':
        camera.position.set(target.x + dist, target.y, target.z)
        break
      case 'left':
        camera.position.set(target.x - dist, target.y, target.z)
        break
      case 'top':
        camera.position.set(target.x, target.y + dist, target.z + 0.001)
        break
      case 'bottom':
        camera.position.set(target.x, target.y - dist, target.z + 0.001)
        break
      case 'iso':
        const isoDist = dist / Math.sqrt(3)
        camera.position.set(target.x + isoDist, target.y + isoDist, target.z + isoDist)
        break
    }
    ctrl.update()
  }

  // Subscribe to external UI trigger events
  useEffect(() => {
    const handlePreset: CameraPresetListener = (preset) => {
      applyPreset(preset)
    }

    const handleReset: CameraResetListener = () => {
      camera.position.set(...defaultPosition)
      if (controlsRef.current) {
        controlsRef.current.target.set(...defaultTarget)
        controlsRef.current.update()
      }
    }

    const handleZoom: CameraZoomListener = (factor) => {
      const ctrl = controlsRef.current
      if (!ctrl) return
      const target = ctrl.target
      const dir = camera.position.clone().sub(target)
      const currentDist = dir.length()
      const newDist = Math.max(minDistance, Math.min(maxDistance, currentDist * factor))
      dir.setLength(newDist)
      camera.position.copy(target).add(dir)
      ctrl.update()
    }

    presetListeners.add(handlePreset)
    resetListeners.add(handleReset)
    zoomListeners.add(handleZoom)

    return () => {
      presetListeners.delete(handlePreset)
      resetListeners.delete(handleReset)
      zoomListeners.delete(handleZoom)
    }
  }, [camera, defaultPosition, defaultTarget, minDistance, maxDistance])

  // Keyboard shortcut listener (R = reset, 1 = front, 2 = rear, 3 = side, 4 = top, 5 = bottom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          triggerCameraReset()
          break
        case '1':
          applyPreset('front')
          break
        case '2':
          applyPreset('rear')
          break
        case '3':
          applyPreset('right')
          break
        case '4':
          applyPreset('top')
          break
        case '5':
          applyPreset('bottom')
          break
        case '+':
        case '=':
          triggerCameraZoom(0.85) // Zoom in
          break
        case '-':
        case '_':
          triggerCameraZoom(1.15) // Zoom out
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [defaultPosition, defaultTarget, minDistance, maxDistance])

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enableRotate={enableRotate}
      enablePan={enablePan}
      enableZoom={enableZoom}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      rotateSpeed={0.9}
      zoomSpeed={1.0}
      panSpeed={0.8}
      dampingFactor={0.08}
      enableDamping
      makeDefault
    />
  )
}

interface CameraOverlayHUDProps {
  className?: string
  showPresets?: boolean
  hintText?: string
  onReset?: () => void
}

export function CameraOverlayHUD({
  className = '',
  showPresets = true,
  hintText = '360° ORBIT: DRAG • ZOOM: WHEEL/PINCH • PAN: RIGHT-DRAG',
  onReset,
}: CameraOverlayHUDProps) {
  const handleResetClick = () => {
    triggerCameraReset()
    if (onReset) onReset()
  }

  return (
    <div className={`absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none select-none z-10 ${className}`}>
      {/* Telemetry Hint Badge */}
      <div className="bg-bg-panel/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08] text-[10.5px] font-mono text-text-muted flex items-center gap-2 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
        <span className="hidden sm:inline">{hintText}</span>
        <span className="sm:hidden">Drag to orbit</span>
      </div>

      {/* Interactive Quick-Action Presets Toolbar */}
      <div className="flex items-center gap-1 pointer-events-auto">
        {showPresets && (
          <div className="flex items-center bg-bg-panel/90 backdrop-blur-md p-0.5 rounded-lg border border-white/[0.08] text-[10.5px] font-mono shadow-sm">
            <button
              onClick={() => triggerCameraPreset('front')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Front View (Key: 1)"
            >
              FRONT
            </button>
            <button
              onClick={() => triggerCameraPreset('rear')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Rear View (Key: 2)"
            >
              REAR
            </button>
            <button
              onClick={() => triggerCameraPreset('right')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Right Side (Key: 3)"
            >
              RIGHT
            </button>
            <button
              onClick={() => triggerCameraPreset('left')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Left Side"
            >
              LEFT
            </button>
            <button
              onClick={() => triggerCameraPreset('top')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Top View (Key: 4)"
            >
              TOP
            </button>
            <button
              onClick={() => triggerCameraPreset('bottom')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Bottom View (Key: 5)"
            >
              BTM
            </button>
            <button
              onClick={() => triggerCameraPreset('iso')}
              className="px-2 py-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
              title="Isometric 3/4 View"
            >
              <Compass className="h-3 w-3 inline text-accent-cyan" />
            </button>
          </div>
        )}

        {/* Zoom In & Zoom Out Buttons */}
        <div className="flex items-center bg-bg-panel/90 backdrop-blur-md p-0.5 rounded-lg border border-white/[0.08] text-[10.5px] font-mono shadow-sm">
          <button
            onClick={() => triggerCameraZoom(0.85)}
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={() => triggerCameraZoom(1.15)}
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
        </div>

        {/* Camera Reset Button */}
        <button
          onClick={handleResetClick}
          className="bg-bg-panel/90 backdrop-blur-md hover:bg-bg-elevated px-2 py-1 rounded-lg border border-white/[0.08] text-[10.5px] font-mono text-accent-cyan hover:text-white transition flex items-center gap-1 shadow-sm"
          title="Reset Camera (Key: R)"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  )
}
