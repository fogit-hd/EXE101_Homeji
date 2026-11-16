/*
 * Moves the camera between two rendered frames. Each frame comes with a coarse depth map
 * (tmp/blender/s79_story.py, mode "depth"): the frame is rebuilt as a sheet of triangles in 3D,
 * seen from the camera in between, so the picture moves continuously with the scroll instead of
 * stepping from one frame to the next. Both neighbours are rebuilt and blended; where one of them
 * tears (an edge in depth, something it could not see), the other fills in.
 */

import camera from './camera.json'

type Cam = { m: number[]; lens: number }
const CAMS = camera.frames as unknown as Record<string, Cam>
const SENSOR = camera.sensor
const ASPECT = camera.res[0] / camera.res[1]

/** Depth grid size (cells); the PNG holds (GW+1)×(GH+1) samples. Matches HJ_DEPTH_W/H. */
const GW = 320
const GH = 180
/** Tiles per atlas row (keeps the atlas under 4096 px each way). */
const COLS = 12
/** Inverse depth is stored in 16 bits over 0..INV_MAX (1/m), red high byte, green low byte. */
const INV_MAX = 4
const NEAR = 0.05
const FAR = 200

/** Frames with depth, in atlas order (tmp/depth-png.py): one (GW+1)×(GH+1) tile each, COLS tiles a row. */
// The whole film (film.ts ALL_FRAMES): the street every 2nd frame, inside every frame.
const DEPTH_RANGES: [number, number, number][] = [[1, 129, 2], [201, 339, 1], [401, 419, 1]]
const DEPTH_ORDER = DEPTH_RANGES.flatMap(([a, z, step]) => Array.from({ length: Math.floor((z - a) / step) + 1 }, (_, i) => a + i * step))
/**
 * Frames where something passes within reach of the camera (the post by the steps, 47–55): between two
 * of them the camera moves further than the nearest thing is far, more than a rebuild can bridge, so
 * those steps play as a plain crossfade. Found by camera step ÷ nearest depth > 0.4 (tmp/depth-png.py data).
 */
const TOO_CLOSE = new Set([47, 49, 51, 53, 55])
const TILE = new Map(DEPTH_ORDER.map((frame, n) => [frame, [(n % COLS) * (GW + 1), Math.floor(n / COLS) * (GH + 1)] as const]))
export const DEPTH_URL = '/landing/story/depth.png'

/* ---------- Camera maths (row-major 4×4, as Blender writes them) ---------- */

type Quat = [number, number, number, number]

function quatOf(m: number[]): Quat {
  const [a, b, c, , d, e, f, , g, h, i] = m
  const trace = a + e + i
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return [(h - f) / s, (c - g) / s, (d - b) / s, s / 4]
  }
  if (a > e && a > i) {
    const s = Math.sqrt(1 + a - e - i) * 2
    return [s / 4, (b + d) / s, (c + g) / s, (h - f) / s]
  }
  if (e > i) {
    const s = Math.sqrt(1 + e - a - i) * 2
    return [(b + d) / s, s / 4, (f + h) / s, (c - g) / s]
  }
  const s = Math.sqrt(1 + i - a - e) * 2
  return [(c + g) / s, (f + h) / s, s / 4, (d - b) / s]
}

function slerp(p: Quat, q: Quat, t: number): Quat {
  let dot = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]
  const r = [...q] as Quat
  if (dot < 0) {
    dot = -dot
    for (let k = 0; k < 4; k += 1) r[k] = -r[k]
  }
  let wa = 1 - t
  let wb = t
  if (dot < 0.9995) {
    const angle = Math.acos(dot)
    const sin = Math.sin(angle)
    wa = Math.sin((1 - t) * angle) / sin
    wb = Math.sin(t * angle) / sin
  }
  const out = p.map((v, k) => v * wa + r[k] * wb) as Quat
  const len = Math.hypot(...out)
  return out.map(v => v / len) as Quat
}

function matOf(q: Quat, pos: [number, number, number]): number[] {
  const [x, y, z, w] = q
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), pos[0],
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), pos[1],
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), pos[2],
    0, 0, 0, 1,
  ]
}

/** The camera a fraction `t` of the way from frame `a` to frame `b`. */
export function camBetween(a: number, b: number, t: number): Cam | null {
  const ca = CAMS[a]
  const cb = CAMS[b] ?? ca
  if (!ca) return null
  if (t <= 0 || ca === cb) return ca
  const pa = [ca.m[3], ca.m[7], ca.m[11]]
  const pb = [cb.m[3], cb.m[7], cb.m[11]]
  const pos = pa.map((v, k) => v + (pb[k] - v) * t) as [number, number, number]
  return { m: matOf(slerp(quatOf(ca.m), quatOf(cb.m), t), pos), lens: ca.lens + (cb.lens - ca.lens) * t }
}

function mul(a: number[], b: number[]) {
  const out = new Array<number>(16).fill(0)
  for (let i = 0; i < 4; i += 1)
    for (let j = 0; j < 4; j += 1)
      for (let k = 0; k < 4; k += 1) out[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]
  return out
}

/** World → camera for a rigid camera matrix. */
function viewOf(m: number[]) {
  const [a, b, c, x, d, e, f, y, g, h, i, z] = m
  return [
    a, d, g, -(a * x + d * y + g * z),
    b, e, h, -(b * x + e * y + h * z),
    c, f, i, -(c * x + f * y + i * z),
    0, 0, 0, 1,
  ]
}

function projOf(lens: number) {
  const k = lens / SENSOR
  return [
    2 * k, 0, 0, 0,
    0, 2 * k * ASPECT, 0, 0,
    0, 0, -(FAR + NEAR) / (FAR - NEAR), (-2 * FAR * NEAR) / (FAR - NEAR),
    0, 0, -1, 0,
  ]
}

/* ---------- WebGL ---------- */

const WARP_VS = `#version 300 es
precision highp float;
in vec2 aCell;
uniform sampler2D uDepth;
uniform ivec2 uTile;
uniform mat4 uM;
uniform float uK;
out vec2 vUv;
out float vConf;
float depthAt(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(${GW}, ${GH}));
  vec4 t = texelFetch(uDepth, uTile + c, 0);
  float q = (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0;
  return 1.0 / max(q * ${INV_MAX.toFixed(1)}, 0.004);
}
void main() {
  ivec2 c = ivec2(aCell);
  vec2 uv = aCell / vec2(${GW}.0, ${GH}.0);
  float dz = depthAt(c);
  float lo = dz, hi = dz;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float n = depthAt(c + ivec2(i, j));
    lo = min(lo, n); hi = max(hi, n);
  }
  // A tear in depth (an object's edge): this sheet stretches across it, so trust it little there.
  vConf = 1.0 - smoothstep(1.04, 1.18, hi / lo);
  // The nearest depth around: a thin thing (a window bar, a chair leg) is narrower than a cell, so its
  // own depth must reach past its edges or the sheet bends it toward what lies behind. The stretch
  // then falls on the far side, usually sky or wall, where it does not show.
  dz = lo;
  vec3 p = vec3((uv.x - 0.5) / uK * dz, (0.5 - uv.y) / (uK * ${ASPECT.toFixed(6)}) * dz, -dz);
  vUv = uv;
  gl_Position = uM * vec4(p, 1.0);
}`

const WARP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vConf;
uniform sampler2D uImage;
out vec4 outColor;
void main() {
  outColor = vec4(texture(uImage, vUv).rgb, 0.02 + 0.98 * vConf);
  // A torn stretch never hides what this frame really saw behind it.
  gl_FragDepth = gl_FragCoord.z;
}`

const QUAD_VS = `#version 300 es
in vec2 aPos;
out vec2 vSt;
void main() {
  vSt = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const BLEND_FS = `#version 300 es
precision highp float;
in vec2 vSt;
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uRawA;
uniform sampler2D uRawB;
uniform float uT;
uniform int uMode;
// The door flare (0..1) and the stage the canvas covers (CSS px), see flare() below.
uniform float uFlare;
uniform vec2 uStage;
out vec4 outColor;

// A premultiplied colour stop of a CSS gradient: rgb * alpha, alpha.
vec4 stop(vec3 rgb, float a) { return vec4(rgb * a, a); }

/*
 * The door flare, drawn here rather than as a page layer: a bloom from the doorway plus a horizontal
 * streak, screened over the picture. As a 160vmax gradient layer blended over the film it cost the
 * compositor every frame of the door; here it is a few lines per pixel of a draw that happens anyway.
 * Same shapes as the CSS version (story.css .hx-film__flare), measured in the stage's CSS pixels.
 */
vec3 flare(vec3 base) {
  if (uFlare <= 0.0) return base;
  vec2 canvas = vec2(textureSize(uRawA, 0));
  // object-fit: cover — stage px per canvas px, then this pixel's place on the stage (y down).
  float k = max(uStage.x / canvas.x, uStage.y / canvas.y);
  vec2 p = vec2(gl_FragCoord.x - canvas.x * 0.5, canvas.y * 0.5 - gl_FragCoord.y) * k + uStage * 0.5;
  vec2 c = vec2(0.5, 0.55) * uStage;
  float vmax = max(uStage.x, uStage.y);
  // Bloom: a circle 160vmax across at scale 0.25 + 0.9 f.
  float d = length(p - c) / (0.8 * vmax * (0.25 + 0.9 * uFlare));
  vec4 bloom = d < 0.14 ? mix(stop(vec3(1.0, 0.980, 0.941), 1.0), stop(vec3(1.0, 0.945, 0.839), 1.0), d / 0.14)
    : d < 0.32 ? mix(stop(vec3(1.0, 0.945, 0.839), 1.0), stop(vec3(1.0, 0.804, 0.549), 0.75), (d - 0.14) / 0.18)
    : d < 0.58 ? mix(stop(vec3(1.0, 0.804, 0.549), 0.75), stop(vec3(1.0, 0.667, 0.353), 0.25), (d - 0.32) / 0.26)
    : d < 0.75 ? mix(stop(vec3(1.0, 0.667, 0.353), 0.25), vec4(0.0), (d - 0.58) / 0.17)
    : vec4(0.0);
  // Streak: an ellipse 1.2 stage widths long and 3.2vh tall at scale 0.4 + f.
  vec2 q = (p - c) / vec2(0.6 * uStage.x, 0.016 * uStage.y * (0.4 + uFlare));
  float e = length(q);
  vec4 streak = e < 0.4 ? mix(stop(vec3(1.0), 1.0), stop(vec3(1.0, 0.925, 0.784), 0.85), e / 0.4)
    : e < 1.0 ? mix(stop(vec3(1.0, 0.925, 0.784), 0.85), vec4(0.0), (e - 0.4) / 0.6)
    : vec4(0.0);
  vec4 layer = (streak + bloom * (1.0 - streak.a)) * uFlare;
  // Screen: base + source * (1 - base), with the source premultiplied.
  return base + layer.rgb * (1.0 - base);
}

void main() {
  vec2 uv = vec2(vSt.x, 1.0 - vSt.y);
  vec3 rawA = texture(uRawA, uv).rgb;
  vec3 rawB = texture(uRawB, uv).rgb;
  vec3 plain = mix(rawA, rawB, uT);
  if (uMode == 0) { outColor = vec4(flare(plain), 1.0); return; }
  vec4 a = texture(uA, vSt);
  vec4 b = texture(uB, vSt);
  // Show one frame at a time (the nearer), not a half-and-half mix: two rebuilds never line up to the
  // pixel, and a mix of both shows every edge twice. The other frame only fills what this one could not
  // see, and the hand-over is a short blend around the middle.
  float s = smoothstep(0.4, 0.6, uT);
  // How much each rebuild can be trusted here (0 where it tore across an edge or saw nothing).
  float ca = a.a > 0.0 ? (a.a - 0.02) / 0.98 : 0.0;
  float cb = b.a > 0.0 ? (b.a - 0.02) / 0.98 : 0.0;
  // A frame's own sheet, stretched across its edges, matches the picture exactly at that frame and
  // drifts only gradually away from it; the other frame lines up there only to within its own
  // stretch, so it fills an edge only as the camera nears it (and where this frame saw nothing).
  float far = smoothstep(0.0, 0.5, uT), farB = smoothstep(0.0, 0.5, 1.0 - uT);
  float ha = a.a > 0.0 ? 1.0 : 0.0, hb = b.a > 0.0 ? 1.0 : 0.0;
  float wa = ha * ((1.0 - s) * max(ca, 1.0 - far) + s * (1.0 - cb) * ca * farB);
  float wb = hb * (s * max(cb, 1.0 - farB) + (1.0 - s) * (1.0 - ca) * cb * far);
  if (a.a == 0.0 && b.a == 0.0) { outColor = vec4(flare(plain), 1.0); return; }
  if (wa + wb < 1e-4) { outColor = vec4(flare(s < 0.5 ? a.rgb : b.rgb), 1.0); return; }
  outColor = vec4(flare((a.rgb * wa + b.rgb * wb) / (wa + wb)), 1.0);
}`

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const program = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
  return program
}

/** A decoded frame the renderer draws: an ImageBitmap, or a frame uploaded straight from the decoder (adopt). */
export type Picture = { readonly width: number; readonly height: number; close(): void }

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; depth: WebGLRenderbuffer; w: number; h: number }

export class WarpRenderer {
  private gl: WebGL2RenderingContext
  private warp: WebGLProgram
  private blend: WebGLProgram
  private gridVao: WebGLVertexArrayObject
  private quadVao: WebGLVertexArrayObject
  private count: number
  private targets: Target[] = []
  private images = new Map<Picture, WebGLTexture>()
  /** Uniform locations, looked up once: a lookup on every draw cost a GPU round trip each. */
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>()
  private atlas: WebGLTexture | null = null

  static create(canvas: HTMLCanvasElement) {
    try {
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false })
      return gl ? new WarpRenderer(gl) : null
    } catch {
      return null
    }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.warp = compile(gl, WARP_VS, WARP_FS)
    this.blend = compile(gl, QUAD_VS, BLEND_FS)

    const cells: number[] = []
    for (let j = 0; j <= GH; j += 1) for (let i = 0; i <= GW; i += 1) cells.push(i, j)
    const index: number[] = []
    for (let j = 0; j < GH; j += 1)
      for (let i = 0; i < GW; i += 1) {
        const v = j * (GW + 1) + i
        index.push(v, v + 1, v + GW + 1, v + 1, v + GW + 2, v + GW + 1)
      }
    this.count = index.length
    this.gridVao = gl.createVertexArray()!
    gl.bindVertexArray(this.gridVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cells), gl.STATIC_DRAW)
    const cell = gl.getAttribLocation(this.warp, 'aCell')
    gl.enableVertexAttribArray(cell)
    gl.vertexAttribPointer(cell, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(index), gl.STATIC_DRAW)

    this.quadVao = gl.createVertexArray()!
    gl.bindVertexArray(this.quadVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(this.blend, 'aPos')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
  }

  private u(program: WebGLProgram, name: string) {
    let names = this.uniforms.get(program)
    if (!names) this.uniforms.set(program, (names = new Map<string, WebGLUniformLocation | null>()))
    if (!names.has(name)) names.set(name, this.gl.getUniformLocation(program, name))
    return names.get(name)!
  }

  private texture(source: TexImageSource, nearest: boolean) {
    const gl = this.gl
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    const filter = nearest ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  /** The texture for a decoded frame, uploaded once; frames no longer wanted are let go. */
  private imageTexture(bitmap: Picture) {
    let tex = this.images.get(bitmap)
    if (!tex) {
      tex = this.texture(bitmap, false)
      this.images.set(bitmap, tex)
    }
    return tex
  }

  /** Uploads a decoded frame ahead of the draw that needs it, so the upload never lands mid-scroll. */
  prepare(bitmap: Picture) {
    this.imageTexture(bitmap)
  }

  /**
   * Uploads a decoded video frame straight into a texture and lets the frame go: one copy, instead of
   * copying it into an ImageBitmap on the main thread first and uploading that.
   */
  adopt(frame: VideoFrame): Picture {
    const width = frame.displayWidth
    const height = frame.displayHeight
    const tex = this.texture(frame, false)
    frame.close()
    const picture: Picture = { width, height, close: () => this.forget(picture) }
    this.images.set(picture, tex)
    return picture
  }

  forget(bitmap: Picture) {
    const tex = this.images.get(bitmap)
    if (tex) this.gl.deleteTexture(tex)
    this.images.delete(bitmap)
  }

  setDepth(bitmap: ImageBitmap) {
    if (!this.atlas) this.atlas = this.texture(bitmap, true)
  }

  hasDepth(frame: number) {
    return this.atlas !== null && TILE.has(frame)
  }

  /** Whether the step between these two frames can be rebuilt in 3D. */
  /** Only neighbouring shots (≤ 2 frames apart) are one camera move; across a cut (339 → 401) they cross-fade. */
  canWarp(a: number, b: number) {
    return a !== b && Math.abs(a - b) <= 2 && this.hasDepth(a) && this.hasDepth(b) && !(TOO_CLOSE.has(a) && TOO_CLOSE.has(b))
  }

  private target(index: number, w: number, h: number) {
    const gl = this.gl
    const old = this.targets[index]
    if (old && old.w === w && old.h === h) return old
    if (old) {
      gl.deleteFramebuffer(old.fbo)
      gl.deleteTexture(old.tex)
      gl.deleteRenderbuffer(old.depth)
    }
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    const depth = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth)
    const made = { fbo, tex, depth, w, h }
    this.targets[index] = made
    return made
  }

  /** Rebuilds `frame` in 3D and draws it as seen from `cam` into target `index`. */
  private warpInto(index: number, frame: number, image: Picture, cam: Cam, w: number, h: number) {
    const gl = this.gl
    const target = this.target(index, w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.useProgram(this.warp)
    const source = CAMS[frame]
    // Source camera space → world → target camera → clip.
    const m = mul(projOf(cam.lens), mul(viewOf(cam.m), source.m))
    gl.uniformMatrix4fv(this.u(this.warp, 'uM'), true, m)
    gl.uniform1f(this.u(this.warp, 'uK'), source.lens / SENSOR)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.atlas)
    gl.uniform1i(this.u(this.warp, 'uDepth'), 0)
    const [x, y] = TILE.get(frame)!
    gl.uniform2i(this.u(this.warp, 'uTile'), x, y)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture(image))
    gl.uniform1i(this.u(this.warp, 'uImage'), 1)
    gl.bindVertexArray(this.gridVao)
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0)
    gl.disable(gl.DEPTH_TEST)
    return target.tex
  }

  /**
   * Draws the picture `t` of the way from frame `a` to frame `b`. With depth for both, the camera
   * moves between them; otherwise the two simply cross-fade.
   */
  draw(a: number, imageA: Picture, b: number, imageB: Picture, t: number, flare = 0, stage: readonly [number, number] = [1, 1]) {
    const gl = this.gl
    const { width: w, height: h } = gl.canvas
    const cam = camBetween(a, b, t)
    const moving = cam !== null && CAMS[b] !== undefined && this.canWarp(a, b)
    const texA = moving ? this.warpInto(0, a, imageA, cam, w, h) : null
    const texB = moving ? this.warpInto(1, b, imageB, cam, w, h) : null
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, w, h)
    gl.useProgram(this.blend)
    const bind = (unit: number, name: string, tex: WebGLTexture) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(this.u(this.blend, name), unit)
    }
    const rawA = this.imageTexture(imageA)
    const rawB = this.imageTexture(imageB)
    bind(0, 'uA', texA ?? rawA)
    bind(1, 'uB', texB ?? rawB)
    bind(2, 'uRawA', rawA)
    bind(3, 'uRawB', rawB)
    gl.uniform1f(this.u(this.blend, 'uT'), t)
    gl.uniform1i(this.u(this.blend, 'uMode'), moving ? 1 : 0)
    gl.uniform1f(this.u(this.blend, 'uFlare'), flare)
    gl.uniform2f(this.u(this.blend, 'uStage'), stage[0], stage[1])
    gl.bindVertexArray(this.quadVao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
  }

  dispose() {
    const gl = this.gl
    for (const tex of this.images.values()) gl.deleteTexture(tex)
    if (this.atlas) gl.deleteTexture(this.atlas)
    for (const target of this.targets) {
      gl.deleteFramebuffer(target.fbo)
      gl.deleteTexture(target.tex)
      gl.deleteRenderbuffer(target.depth)
    }
    this.images.clear()
    this.atlas = null
    this.targets = []
  }
}
