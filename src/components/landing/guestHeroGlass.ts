const vertex = `#version 300 es
out vec2 uv;
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = vec2(corner.x, 1.0 - corner.y);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`

const fragment = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 pixel;
uniform sampler2D photo;
uniform vec2 crop;
uniform float aspect;
uniform vec2 cursor;
uniform float influence;

// Five fixed sites produce wide irregular panes without moving seams when
// the pointer passes between panes.
const vec2 sites[5] = vec2[5](
  vec2(.07,.64), vec2(.32,.16), vec2(.62,.24), vec2(.57,.91), vec2(.96,.74)
);

vec3 backgroundAt(vec2 p) {
  return texture(photo, vec2(.5,.4) + (p - vec2(.5,.4)) * crop).rgb;
}

void main() {
  vec2 axes = vec2(aspect, 1.0);
  vec2 p = uv * axes;
  int cell = 0;
  float nearest = 1000.0;
  for (int i = 0; i < 5; i++) {
    vec2 delta = p - sites[i] * axes;
    float distanceSquared = dot(delta, delta);
    if (distanceSquared < nearest) {
      nearest = distanceSquared;
      cell = i;
    }
  }
  vec2 site = sites[cell] * axes;
  vec2 normal = vec2(0.0);
  float edge = 1000.0;
  for (int i = 0; i < 5; i++) {
    if (i == cell) continue;
    vec2 other = sites[i] * axes;
    vec2 direction = normalize(other - site);
    float d = dot((site + other) * 0.5 - p, direction);
    if (d < edge) {
      edge = d;
      normal = direction;
    }
  }

  float gap = .005;
  float bevel = 1.0 - smoothstep(gap, .052, edge);
  float hover = influence * (1.0 - smoothstep(.08, .53, distance(p, cursor * axes)));
  vec2 ray = -normal / axes * bevel * (.023 + hover * .018);
  ray += (cursor - uv) * hover * .016;
  vec2 dispersion = ray * .19;
  vec3 refracted = vec3(backgroundAt(uv + ray + dispersion).r,
                       backgroundAt(uv + ray).g,
                       backgroundAt(uv + ray - dispersion).b);
  float pane = smoothstep(gap, gap + .0025, edge);
  float sheen = exp(-abs(edge - .008) * 270.0);
  float facing = abs(dot(normal, vec2(.52,-.85)));
  vec3 base = backgroundAt(uv);
  vec3 shadow = base * (1.0 - (1.0 - pane) * .25);
  vec3 tint = mix(vec3(.83,.92,1.0), vec3(.89,.79,.98), float(cell) * .25);
  vec3 lens = refracted * mix(vec3(1.0), tint, .20 + bevel * .16);
  lens += sheen * (.045 + facing * .055 + hover * .065) * tint;
  pixel = vec4(mix(shadow, lens, pane), 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export function attachGuestHeroGlass(section: HTMLElement, image: HTMLImageElement, canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', failIfMajorPerformanceCaveat: true,
  })
  if (!gl) return
  const vert = compile(gl, gl.VERTEX_SHADER, vertex)
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  const texture = gl.createTexture()
  const release = () => {
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    gl.deleteProgram(program)
    gl.deleteTexture(texture)
  }
  if (!vert || !frag || !program || !texture) { release(); return }
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { release(); return }
  gl.useProgram(program)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const crop = gl.getUniformLocation(program, 'crop')
  const aspect = gl.getUniformLocation(program, 'aspect')
  const cursor = gl.getUniformLocation(program, 'cursor')
  const influence = gl.getUniformLocation(program, 'influence')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let width = 0
  let height = 0
  let source = ''
  let targetX = .5
  let targetY = .5
  let targetStrength = 0
  let x = targetX
  let y = targetY
  let strength = 0
  let previous = 0
  const draw = (now: number) => {
    frame = 0
    if (!source || !width || !height || gl.isContextLost()) return
    const step = previous ? Math.min(1, (now - previous) / 95) : .18
    previous = now
    x += (targetX - x) * step
    y += (targetY - y) * step
    strength += (targetStrength - strength) * step
    const unsettled = Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(strength - targetStrength) > .002
    if (!unsettled) { x = targetX; y = targetY; strength = targetStrength; previous = 0 }
    gl.uniform2f(cursor, x, y)
    gl.uniform1f(influence, strength)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    canvas.hidden = false
    if (unsettled) schedule()
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw) }
  const resize = () => {
    if (gl.isContextLost() || !image.complete || !image.naturalWidth) return
    width = section.clientWidth
    height = section.clientHeight
    if (!width || !height) return
    if (source !== image.currentSrc) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      source = image.currentSrc
    }
    // Match object-fit: cover and object-position: center 40% on the real image.
    const imageRatio = image.naturalWidth / image.naturalHeight
    const viewRatio = width / height
    gl.uniform2f(crop, Math.min(1, viewRatio / imageRatio), Math.min(1, imageRatio / viewRatio))
    gl.uniform1f(aspect, viewRatio)
    const scale = Math.min(window.devicePixelRatio || 1, 1.25, 1600 / width)
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    gl.viewport(0, 0, canvas.width, canvas.height)
    schedule()
  }
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || reducedMotion.matches) return
    const bounds = section.getBoundingClientRect()
    targetX = (event.clientX - bounds.left) / bounds.width
    targetY = (event.clientY - bounds.top) / bounds.height
    targetStrength = 1
    schedule()
  }
  const reset = () => {
    targetStrength = 0
    if (reducedMotion.matches) strength = 0
    schedule()
  }
  const lost = () => { canvas.hidden = true }
  const observer = new ResizeObserver(resize)
  observer.observe(section)
  image.addEventListener('load', resize)
  canvas.addEventListener('webglcontextlost', lost)
  section.addEventListener('pointermove', move)
  section.addEventListener('pointerleave', reset)
  reducedMotion.addEventListener('change', reset)
  resize()
  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    image.removeEventListener('load', resize)
    canvas.removeEventListener('webglcontextlost', lost)
    section.removeEventListener('pointermove', move)
    section.removeEventListener('pointerleave', reset)
    reducedMotion.removeEventListener('change', reset)
    canvas.hidden = true
    release()
  }
}
