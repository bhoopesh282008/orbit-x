import * as THREE from 'three'

/**
 * Procedural texture generation for planets without external image dependencies.
 * Creates crisp, high-fidelity planetary surface and cloud maps via HTML Canvas.
 */

// Simple pseudo-random hash for procedural noise
function pseudoRandom(x: number, y: number, seed = 1337): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number, seed = 1337): number {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j

  // Cubic Hermite spline smoothing
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)

  const n00 = pseudoRandom(i, j, seed)
  const n10 = pseudoRandom(i + 1, j, seed)
  const n01 = pseudoRandom(i, j + 1, seed)
  const n11 = pseudoRandom(i + 1, j + 1, seed)

  const ix0 = n00 * (1 - sx) + n10 * sx
  const ix1 = n01 * (1 - sx) + n11 * sx
  return ix0 * (1 - sy) + ix1 * sy
}

function fbm(x: number, y: number, octaves = 5, seed = 1337): number {
  let val = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 101) * amp
    freq *= 2.05
    amp *= 0.5
  }
  return val
}

export function createEarthTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    const v = y / height
    const lat = (v - 0.5) * Math.PI // -pi/2 to pi/2
    const isPolar = Math.abs(lat) > 1.25

    for (let x = 0; x < width; x++) {
      const u = x / width
      const lon = u * Math.PI * 2

      // Spherical coords for projection
      const nx = Math.cos(lat) * Math.cos(lon) * 2.5
      const ny = Math.sin(lat) * 2.5
      const nz = Math.cos(lat) * Math.sin(lon) * 2.5

      const elevation = fbm(nx + 10, ny + nz + 10, 6, 42)
      const idx = (y * width + x) * 4

      if (isPolar || (Math.abs(lat) > 1.15 && elevation > 0.42)) {
        // Polar ice caps
        data[idx] = 230 + Math.floor(elevation * 25)
        data[idx + 1] = 240 + Math.floor(elevation * 15)
        data[idx + 2] = 250
        data[idx + 3] = 255
      } else if (elevation > 0.48) {
        // Land / Continents
        const isMountain = elevation > 0.65
        const isDesert = Math.abs(lat) < 0.45 && elevation < 0.58
        if (isMountain) {
          // Rocky highlands & mountain peaks
          data[idx] = 145 + Math.floor(elevation * 40)
          data[idx + 1] = 130 + Math.floor(elevation * 30)
          data[idx + 2] = 110 + Math.floor(elevation * 20)
        } else if (isDesert) {
          // Arid desert sands
          data[idx] = 205 + Math.floor(elevation * 30)
          data[idx + 1] = 175 + Math.floor(elevation * 25)
          data[idx + 2] = 115
        } else {
          // Lush vegetation and coastal plains
          data[idx] = 35 + Math.floor(elevation * 45)
          data[idx + 1] = 120 + Math.floor(elevation * 70)
          data[idx + 2] = 45 + Math.floor(elevation * 30)
        }
        data[idx + 3] = 255
      } else if (elevation > 0.45) {
        // Shallow coastal waters / continental shelf
        data[idx] = 24
        data[idx + 1] = 95
        data[idx + 2] = 150
        data[idx + 3] = 255
      } else {
        // Deep ocean abyss
        data[idx] = 8
        data[idx + 1] = 35
        data[idx + 2] = 92
        data[idx + 3] = 255
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function createEarthCloudTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    const v = y / height
    const lat = (v - 0.5) * Math.PI

    for (let x = 0; x < width; x++) {
      const u = x / width
      const lon = u * Math.PI * 2

      const nx = Math.cos(lat) * Math.cos(lon) * 3
      const ny = Math.sin(lat) * 3
      const nz = Math.cos(lat) * Math.sin(lon) * 3

      // Swirling weather bands
      const weather = fbm(nx + Math.sin(ny * 2) * 0.8, ny * 1.5 + nz * 0.5, 5, 888)
      const idx = (y * width + x) * 4

      if (weather > 0.52) {
        const alpha = Math.min(255, Math.floor((weather - 0.52) * 550))
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
        data[idx + 3] = alpha
      } else {
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
        data[idx + 3] = 0
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function createMoonTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    const v = y / height
    const lat = (v - 0.5) * Math.PI

    for (let x = 0; x < width; x++) {
      const u = x / width
      const lon = u * Math.PI * 2

      const nx = Math.cos(lat) * Math.cos(lon) * 3.5
      const ny = Math.sin(lat) * 3.5
      const nz = Math.cos(lat) * Math.sin(lon) * 3.5

      // Lunar maria vs heavily cratered anorthositic highlands
      const maria = fbm(nx, ny, 4, 102)
      const craterNoise = fbm(nx * 2, ny * 2 + nz * 2, 6, 909)

      let intensity = 135
      if (maria < 0.45) {
        // Basaltic Lunar Maria (darker plains)
        intensity = 65 + Math.floor(craterNoise * 35)
      } else {
        // Lunar Highlands (lighter gray with crater rings)
        intensity = 135 + Math.floor(craterNoise * 75)
      }

      const idx = (y * width + x) * 4
      data[idx] = intensity
      data[idx + 1] = intensity
      data[idx + 2] = intensity + 4
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function createMarsTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    const v = y / height
    const lat = (v - 0.5) * Math.PI
    const isPolar = Math.abs(lat) > 1.32

    for (let x = 0; x < width; x++) {
      const u = x / width
      const lon = u * Math.PI * 2

      const nx = Math.cos(lat) * Math.cos(lon) * 3
      const ny = Math.sin(lat) * 3
      const nz = Math.cos(lat) * Math.sin(lon) * 3

      const elevation = fbm(nx, ny + nz, 6, 555)
      const canyon = Math.sin(nx * 4 + ny * 2) * 0.5 + 0.5
      const idx = (y * width + x) * 4

      if (isPolar) {
        // Carbon dioxide & water ice polar caps
        data[idx] = 240
        data[idx + 1] = 245
        data[idx + 2] = 250
      } else if (elevation < 0.42) {
        // Lowland dark volcanic plains (Syrtis Major, Acidalia Planitia)
        data[idx] = 130 + Math.floor(elevation * 30)
        data[idx + 1] = 55 + Math.floor(elevation * 20)
        data[idx + 2] = 35 + Math.floor(elevation * 15)
      } else if (elevation > 0.68) {
        // Olympus Mons / Tharsis Montes volcanoes
        data[idx] = 215 + Math.floor(elevation * 35)
        data[idx + 1] = 115 + Math.floor(elevation * 25)
        data[idx + 2] = 75
      } else {
        // Red hematite dust oxide regolith
        const dustVariation = (canyon * 20)
        data[idx] = Math.min(255, 185 + Math.floor(elevation * 45) + dustVariation)
        data[idx + 1] = Math.min(255, 80 + Math.floor(elevation * 35))
        data[idx + 2] = Math.min(255, 45 + Math.floor(elevation * 20))
      }
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}
