import { useEffect, useRef } from 'react'
import { AmbientLight, Box3, DirectionalLight, Group, Mesh, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { splashAsset } from './splashEarth'

// NASA's Jason-1 model (github.com/nasa/NASA-3D-Resources), ported from the TAN splash.
const MODEL_URL = splashAsset('jason1.glb')
const DRACO_PATH = splashAsset('draco/')
const POSE = { x: 0.3, y: -1.9, z: 0.1 }
const ROCK_RADIANS = 0.22
const ROCK_PERIOD_MS = 24000

/** Renders the satellite on a transparent canvas that fills its parent. */
export default function SatelliteModel({ onShown }: { onShown?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const shownRef = useRef(onShown)
  shownRef.current = onShown

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    host.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0, 6)
    const sun = new DirectionalLight(0xfff4e0, 3.6)
    sun.position.set(2, 3, 6)
    scene.add(sun, new AmbientLight(0x8fb4ff, 0.6))
    const satellite = new Group()
    scene.add(satellite)

    const resize = () => {
      const { clientWidth, clientHeight } = host
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    resize()
    window.addEventListener('resize', resize)

    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH)
    let disposed = false
    let frame = 0

    new GLTFLoader().setDRACOLoader(draco).load(MODEL_URL, (gltf) => {
      if (disposed) return
      const model = gltf.scene
      const box = new Box3().setFromObject(model)
      const size = box.getSize(new Vector3())
      model.position.sub(box.getCenter(new Vector3()))
      satellite.add(model)
      satellite.scale.setScalar(3 / Math.max(size.x, size.y, size.z))
      satellite.rotation.set(POSE.x, POSE.y, POSE.z)
      renderer.render(scene, camera)
      shownRef.current?.()
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const started = performance.now()
      const tick = (now: number) => {
        satellite.rotation.y = POSE.y + Math.sin(((now - started) / ROCK_PERIOD_MS) * 2 * Math.PI) * ROCK_RADIANS
        renderer.render(scene, camera)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      draco.dispose()
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry?.dispose()
          for (const m of ([] as unknown[]).concat(object.material ?? [])) (m as { dispose?: () => void }).dispose?.()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
}
