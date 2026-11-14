import { useEffect, useRef } from 'react'
import { EARTH } from './splashEarth'

/**
 * The Earth, turning (ported from the TAN splash). Each pixel of the disc is traced back to a
 * longitude and latitude and looks up NASA's Blue Marble map there, then lit from the upper left.
 * Draws only while the page is visible, and not at all with reduced motion or without WebGL.
 */

const SWAY_DEGREES = 18
const SWAY_PERIOD_MS = 32000

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT = `
precision highp float;
uniform sampler2D u_map;
uniform float u_lat0;
uniform float u_lon0;
uniform float u_disc;
uniform float u_pixel;
varying vec2 v_uv;
const float PI = 3.14159265358979;
float ease(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
void main() {
  vec3 SUN = normalize(vec3(-0.62, 0.40, 0.68));
  vec2 p = (v_uv - 0.5) / (0.5 * u_disc);
  float nx = p.x;
  float ny = -p.y;
  float r = sqrt(nx * nx + ny * ny);
  if (r > 1.09) { gl_FragColor = vec4(0.0); return; }
  if (r > 1.0 + u_pixel) {
    vec2 edge = vec2(nx, ny) / r;
    float day = ease(-0.15, 0.5, edge.x * SUN.x + edge.y * SUN.y);
    float a = exp(-(r - 1.0) / 0.011) * 0.55 * day;
    gl_FragColor = vec4(vec3(90.0, 150.0, 255.0) / 255.0 * a, a);
    return;
  }
  float z = sqrt(max(0.0, 1.0 - r * r));
  float phi0 = u_lat0;
  float lat = asin(clamp(z * sin(phi0) + ny * cos(phi0), -1.0, 1.0));
  float lon = u_lon0 + atan(nx, z * cos(phi0) - ny * sin(phi0));
  vec3 land = texture2D(u_map, vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 - lat / PI)).rgb;
  float lambert = nx * SUN.x + ny * SUN.y + z * SUN.z;
  float day = ease(-0.10, 0.42, lambert);
  float shade = 0.07 + 0.93 * day;
  float rim = pow(1.0 - z, 2.4) * (0.25 + 0.75 * day);
  vec3 colour = land * shade * vec3(0.94, 0.94, 0.98) + vec3(70.0, 130.0, 235.0) / 255.0 * rim;
  float cover = clamp((1.0 - r) / u_pixel + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(min(colour, 1.0) * cover, cover);
}`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

/** `onTurn(longitude)` fires every frame with the longitude at the centre; `onShown` after the first frame. */
export function SpinningEarth({ onTurn, onShown }: { onTurn?: (longitude: number) => void; onShown?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const turnRef = useRef(onTurn)
  const shownRef = useRef(onShown)
  turnRef.current = onTurn
  shownRef.current = onShown

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
    if (!gl) return

    let frame = 0
    let disposed = false
    let program: WebGLProgram
    let texture: WebGLTexture | null = null
    try {
      program = gl.createProgram()!
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    } catch (error) {
      console.warn('The turning Earth could not start.', error)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const radians = (degrees: number) => (degrees * Math.PI) / 180
    gl.uniform1f(uniform('u_lat0'), radians(EARTH.latitude0))
    gl.uniform1f(uniform('u_disc'), EARTH.disc)
    const lon0 = uniform('u_lon0')
    const pixel = uniform('u_pixel')

    const resize = () => {
      const size = Math.min(2200, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)))
      if (size > 0 && canvas.width !== size) {
        canvas.width = size
        canvas.height = size
        gl.viewport(0, 0, size, size)
        gl.uniform1f(pixel, 1 / (size * 0.5 * EARTH.disc))
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const started = performance.now()
    const draw = (now: number) => {
      const sway = reduce ? 0 : SWAY_DEGREES * Math.sin(((now - started) / SWAY_PERIOD_MS) * 2 * Math.PI)
      const longitude = EARTH.longitude0 + sway
      gl.uniform1f(lon0, radians(longitude))
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      turnRef.current?.(longitude)
    }

    const image = new Image()
    image.decoding = 'async'
    image.src = EARTH.map
    image
      .decode()
      .then(() => {
        if (disposed) return
        texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        if (reduce) {
          draw(performance.now())
          shownRef.current?.()
          return
        }
        const tick = (now: number) => {
          draw(now)
          frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame((now) => {
          tick(now)
          shownRef.current?.()
        })
      })
      .catch(() => {
        /* map unavailable: the still picture stays */
      })

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
}
