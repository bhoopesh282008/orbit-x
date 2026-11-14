import * as THREE from 'three'

/**
 * ORBIT-X Unified Aerospace Material & Color Palette
 * Designed for crisp visibility and component separation against dark space environments.
 */
export const AEROSPACE_PALETTE = {
  // A. Spacecraft Bus — Titanium Silver & Brushed Platinum
  busTitanium: '#BFCBD6',
  busSeam: '#64748B',
  busHatch: '#CBD5E1',

  // B. Solar Panels — Photovoltaic Blue with Silver/Titanium Frame
  solarCellBlue: '#234C79',
  solarCellGrid: '#60A5FA',
  solarFrameSilver: '#B8C5D1',
  solarGimbalJoint: '#334155',

  // C. Antenna Dish — Metallic Aluminum / Light Titanium
  antennaDish: '#AAB8C6',
  antennaFeedHorn: '#475569',
  antennaSubreflectorGold: '#C69A45',
  antennaWhip: '#CBD5E1',

  // D. Propulsion Engine — Stainless Steel & Heat Copper/Bronze
  engineSteel: '#8997A5',
  engineCopper: '#B87345',
  engineMountTitanium: '#AAB6C2',
  engineGimbalRing: '#475569',

  // E. Fuel Tanks — Light Metallic Aluminum with Titanium Ribs
  fuelTankAluminum: '#AAB8C5',
  fuelTankSeam: '#64748B',
  fuelFeedLine: '#788896',

  // F. Battery Unit — Deep Radiator Gray with Bright Thermal Fins
  batteryHousing: '#38BDF8',
  batteryHeatSink: '#E2E8F0',

  // G. Scientific Instruments & Optical Sensors
  cameraHousing: '#64748B',
  cameraLensAperture: '#38BDF8',
  cameraTrimSilver: '#E2E8F0',
  spectrometerHousing: '#CA8A04',
  magnetometerBoom: '#475569',
  sensorPodRed: '#EF4444',
  radarDipoleGold: '#F59E0B',

  // H. Thermal Insulation — Gold MLI Radiant Blanket
  goldMLIFoil: '#C69A45',
}

/**
 * Creates procedural texture for high-contrast aerospace titanium panels,
 * panel division seams, access hatches, and micro-fasteners.
 */
export function createTitaniumPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Base titanium tone: clean, bright aerospace silver/platinum (#BFCBD6)
  ctx.fillStyle = AEROSPACE_PALETTE.busTitanium
  ctx.fillRect(0, 0, 1024, 1024)

  // Brushed aluminum fine horizontal micro-grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  for (let i = 0; i < 1024; i += 3) {
    if (Math.random() > 0.35) {
      ctx.fillRect(0, i, 1024, 1.5)
    }
  }

  // Structural panel division lines (darker graphite seams)
  ctx.strokeStyle = AEROSPACE_PALETTE.busSeam
  ctx.lineWidth = 4
  ctx.strokeRect(16, 16, 992, 992)
  ctx.strokeRect(16, 340, 992, 340)

  // Service access hatches
  ctx.fillStyle = AEROSPACE_PALETTE.busHatch
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.fillRect(80, 80, 220, 180)
  ctx.strokeRect(80, 80, 220, 180)

  ctx.fillRect(720, 420, 220, 180)
  ctx.strokeRect(720, 420, 220, 180)

  // Fasteners / structural rivets along seams
  ctx.fillStyle = '#1e293b'
  for (let x = 30; x < 1000; x += 40) {
    ctx.beginPath()
    ctx.arc(x, 24, 3, 0, Math.PI * 2)
    ctx.arc(x, 1000, 3, 0, Math.PI * 2)
    ctx.arc(x, 348, 3, 0, Math.PI * 2)
    ctx.arc(x, 672, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Creates realistic multi-layer insulation (MLI) gold blanket texture
 * with crinkled metallic foil facets and seam stitching.
 */
export function createGoldMLIFoilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Radiant gold reflective foil base (#C69A45)
  const grad = ctx.createLinearGradient(0, 0, 512, 512)
  grad.addColorStop(0, '#C69A45')
  grad.addColorStop(0.3, '#F59E0B')
  grad.addColorStop(0.5, '#D97706')
  grad.addColorStop(0.8, '#FEF08A')
  grad.addColorStop(1, '#92400E')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  // Crinkle foil texture facets
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const w = 15 + Math.random() * 45
    const h = 15 + Math.random() * 45
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 240, 138, 0.35)' : 'rgba(180, 83, 9, 0.4)'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y + Math.random() * 10)
    ctx.lineTo(x + w * 0.8, y + h)
    ctx.lineTo(x, y + h * 0.9)
    ctx.closePath()
    ctx.fill()
  }

  // Quilted MLI stitching dots
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  for (let gx = 16; gx < 512; gx += 32) {
    for (let gy = 16; gy < 512; gy += 32) {
      ctx.beginPath()
      ctx.arc(gx, gy, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

