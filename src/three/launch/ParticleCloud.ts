import * as THREE from 'three'
import { LOGDEPTH_FRAGMENT, LOGDEPTH_FRAGMENT_PARS, LOGDEPTH_VERTEX, LOGDEPTH_VERTEX_PARS, getPuffTexture } from './launchFrame'

export interface ParticleSpawn {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number // seconds
  size0: number
  size1: number
  alpha: number
  shade?: number // 0 dark grey .. 1 bright white
  warm?: number // 0..1 orange tint (flame-lit)
}

/**
 * Billboarded soft particles rendered with one instanced draw call.
 * Used for the deluge steam cloud at the pad and the ascent smoke trail.
 */
export class ParticleCloud {
  readonly mesh: THREE.Mesh
  private readonly capacity: number
  private next = 0
  private readonly pos: Float32Array
  private readonly vel: Float32Array
  private readonly age: Float32Array
  private readonly life: Float32Array
  private readonly size0: Float32Array
  private readonly size1: Float32Array
  private readonly alpha0: Float32Array
  private readonly aOffset: THREE.InstancedBufferAttribute
  private readonly aSize: THREE.InstancedBufferAttribute
  private readonly aAlpha: THREE.InstancedBufferAttribute
  private readonly aTint: THREE.InstancedBufferAttribute
  private readonly material: THREE.ShaderMaterial
  drag = 0.35 // per-second velocity damping
  buoyancy = 0 // upward drift (units/s²) along `up`
  up = new THREE.Vector3(0, 1, 0)

  constructor(capacity: number) {
    this.capacity = capacity
    this.pos = new Float32Array(capacity * 3)
    this.vel = new Float32Array(capacity * 3)
    this.age = new Float32Array(capacity).fill(1e9)
    this.life = new Float32Array(capacity).fill(1)
    this.size0 = new Float32Array(capacity)
    this.size1 = new Float32Array(capacity)
    this.alpha0 = new Float32Array(capacity)

    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.attributes.position)
    geo.setAttribute('uv', quad.attributes.uv)
    this.aOffset = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
    this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2)
    for (const a of [this.aOffset, this.aSize, this.aAlpha, this.aTint]) a.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aOffset', this.aOffset)
    geo.setAttribute('aSize', this.aSize)
    geo.setAttribute('aAlpha', this.aAlpha)
    geo.setAttribute('aTint', this.aTint)
    geo.instanceCount = capacity

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uMap: { value: getPuffTexture() },
          uSunColor: { value: new THREE.Color('#fff4e6') },
          uShadowColor: { value: new THREE.Color('#8c97a6') },
        },
      ]),
      vertexShader: /* glsl */ `
        ${LOGDEPTH_VERTEX_PARS}
        #include <fog_pars_vertex>
        attribute vec3 aOffset;
        attribute float aSize;
        attribute float aAlpha;
        attribute vec2 aTint;
        varying vec2 vUv;
        varying float vAlpha;
        varying vec2 vTint;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          vTint = aTint;
          vec4 mvPosition = viewMatrix * vec4(aOffset, 1.0);
          mvPosition.xy += position.xy * aSize;
          gl_Position = projectionMatrix * mvPosition;
          ${LOGDEPTH_VERTEX}
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        ${LOGDEPTH_FRAGMENT_PARS}
        #include <fog_pars_fragment>
        uniform sampler2D uMap;
        uniform vec3 uSunColor;
        uniform vec3 uShadowColor;
        varying vec2 vUv;
        varying float vAlpha;
        varying vec2 vTint;
        void main() {
          ${LOGDEPTH_FRAGMENT}
          vec4 tex = texture2D(uMap, vUv);
          // Fake self-shadowing: lit from above, darker underneath
          float lit = mix(0.55, 1.0, smoothstep(0.1, 0.9, vUv.y));
          vec3 col = mix(uShadowColor, uSunColor, lit * vTint.x);
          col = mix(col, vec3(1.0, 0.55, 0.2), vTint.y);
          gl_FragColor = vec4(col, tex.a * vAlpha);
          if (gl_FragColor.a < 0.004) discard;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.frustumCulled = false
  }

  spawn(p: ParticleSpawn) {
    const i = this.next
    this.next = (this.next + 1) % this.capacity
    this.pos[i * 3] = p.position.x
    this.pos[i * 3 + 1] = p.position.y
    this.pos[i * 3 + 2] = p.position.z
    this.vel[i * 3] = p.velocity.x
    this.vel[i * 3 + 1] = p.velocity.y
    this.vel[i * 3 + 2] = p.velocity.z
    this.age[i] = 0
    this.life[i] = p.life
    this.size0[i] = p.size0
    this.size1[i] = p.size1
    this.alpha0[i] = p.alpha
    this.aTint.setXY(i, p.shade ?? 1, p.warm ?? 0)
  }

  update(dt: number) {
    const damp = Math.exp(-this.drag * dt)
    const ux = this.up.x * this.buoyancy * dt
    const uy = this.up.y * this.buoyancy * dt
    const uz = this.up.z * this.buoyancy * dt
    for (let i = 0; i < this.capacity; i++) {
      const age = (this.age[i] += dt)
      const t = age / this.life[i]
      if (t >= 1) {
        this.aAlpha.setX(i, 0)
        this.aSize.setX(i, 0)
        continue
      }
      const j = i * 3
      this.vel[j] = this.vel[j] * damp + ux
      this.vel[j + 1] = this.vel[j + 1] * damp + uy
      this.vel[j + 2] = this.vel[j + 2] * damp + uz
      this.pos[j] += this.vel[j] * dt
      this.pos[j + 1] += this.vel[j + 1] * dt
      this.pos[j + 2] += this.vel[j + 2] * dt
      this.aOffset.setXYZ(i, this.pos[j], this.pos[j + 1], this.pos[j + 2])
      // Grow quickly at first, then slowly billow out
      const grow = 1 - Math.pow(1 - t, 3)
      this.aSize.setX(i, this.size0[i] + (this.size1[i] - this.size0[i]) * grow)
      // Fade in over the first 5% and out over the last 60%
      const fade = Math.min(1, t / 0.05) * (t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6)
      this.aAlpha.setX(i, this.alpha0[i] * fade)
    }
    this.aOffset.needsUpdate = true
    this.aSize.needsUpdate = true
    this.aAlpha.needsUpdate = true
    this.aTint.needsUpdate = true
  }

  reset() {
    this.age.fill(1e9)
    this.update(0)
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
