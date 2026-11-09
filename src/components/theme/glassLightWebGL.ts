import { clamp, GLASS_BLEED, GLASS_TRACK, paintGlassIcon } from './glassLightArtwork'

const iconSize = 128
const surfaceWidth = GLASS_TRACK.width + 2 * GLASS_BLEED
const surfaceHeight = GLASS_TRACK.height + 2 * GLASS_BLEED

const vertex = `#version 300 es
out vec2 uv;
void main() {
  // One oversized triangle covers the viewport without a seam.
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = vec2(corner.x, 1.0 - corner.y);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`

const fragment = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 pixel;
uniform vec3 motion;
uniform sampler2D icon;
const vec2 trackHalf = vec2(${GLASS_TRACK.width}.0, ${GLASS_TRACK.height}.0) * 0.5;
const float lensHalf = ${GLASS_TRACK.lens}.0 * 0.5;

float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float lensDistance(vec2 p) {
  return roundedBox(p, vec2(lensHalf), 58.0);
}

float stripDistance(vec2 p) {
  float angle = atan(p.y, p.x) - motion.y;
  float arc = abs(atan(sin(angle), cos(angle)));
  return length(vec2(lensDistance(p) - 5.5, max(arc - 0.98, 0.0) * 104.0));
}

vec4 over(vec4 under, vec3 tint, float opacity) {
  float a = clamp(opacity, 0.0, 1.0);
  return vec4(tint * a, a) + under * (1.0 - a);
}

float iconAt(vec2 p) {
  return texture(icon, p / ${iconSize}.0 + 0.5).a;
}

vec3 trackColor(vec2 p, vec2 lensPoint, float day, vec3 led) {
  float d = roundedBox(p, trackHalf, 72.0);
  float upperLip = exp(min(d, 0.0) / 9.0) * (0.5 - 0.5 * smoothstep(-70.0, 80.0, p.y));
  vec3 base = mix(vec3(0.041, 0.043, 0.054), vec3(0.889, 0.886, 0.867), day);
  float pool = exp(-stripDistance(lensPoint) / 43.0);
  return base * (1.0 - upperLip * mix(0.61, 0.17, day))
    + led * pool * mix(0.23, 0.10, day);
}

void main() {
  vec2 p = (uv - 0.5) * vec2(${surfaceWidth}.0, ${surfaceHeight}.0);
  vec2 lensCenter = vec2((motion.x - 0.5) * ${GLASS_TRACK.travel}.0, 0.0);
  vec2 q = p - lensCenter;
  float day = smoothstep(0.18, 0.82, motion.x);
  vec3 led = mix(vec3(0.36, 0.48, 1.0), vec3(1.0, 0.57, 0.13), day);
  float intensity = 1.0 + 0.17 * motion.z;
  float aa = max(fwidth(p.x), fwidth(p.y)) * 0.63;
  float track = roundedBox(p, trackHalf, 72.0);
  float glass = lensDistance(q);
  float strip = stripDistance(q);
  float fade = 1.0 - smoothstep(120.0, 168.0, max(abs(p.x) - trackHalf.x, abs(p.y) - trackHalf.y));

  vec4 result = vec4(0.0);
  float shadow = roundedBox(p - vec2(0.0, 11.0), trackHalf, 72.0);
  result = over(result, vec3(0.016), exp(-max(shadow, 0.0) / 15.0) * mix(0.54, 0.24, day));
  result = over(result, trackColor(p, q, day, led), 1.0 - smoothstep(-aa, aa, track));
  float halo = exp(-strip / 22.0) * 0.42 + exp(-strip / 59.0) * 0.24;
  result = over(result, led, halo * intensity);
  result = over(result, vec3(0.015), exp(-max(lensDistance(q - vec2(0.0, 9.0)), 0.0) / 11.0) * mix(0.36, 0.22, day));

  if (glass < aa) {
    // Bend the sample through the bevel. Red and blue have separate ray
    // offsets and the rougher glass near the edge broadens each sample.
    vec2 gradient = vec2(lensDistance(q + vec2(1.0, 0.0)) - lensDistance(q - vec2(1.0, 0.0)),
                         lensDistance(q + vec2(0.0, 1.0)) - lensDistance(q - vec2(0.0, 1.0)));
    vec2 normal = gradient / max(length(gradient), 0.001);
    float bevel = 1.0 - smoothstep(0.0, 37.0, -glass);
    vec2 ray = q * 0.94 - normal * bevel * bevel * 37.0;
    vec2 fringe = normal * bevel * 3.0 + q * 0.005;
    vec3 mask = vec3(iconAt(ray - fringe), iconAt(ray), iconAt(ray + fringe));
    vec3 blur = vec3(iconAt(ray + vec2(2.5, 0.0)), iconAt(ray + vec2(0.0, 2.5)), iconAt(ray - vec2(2.5, 2.5)));
    mask = mix(mask, blur, bevel * 0.68);
    vec3 transmitted = trackColor(lensCenter + ray, ray, day, led);
    vec3 body = mix(vec3(0.20, 0.21, 0.24), vec3(1.0, 0.994, 0.968), day);
    vec3 glassColor = mix(transmitted, body, mix(0.72, 0.77, day));
    vec3 ink = mix(vec3(1.0, 0.955, 0.86), vec3(0.145, 0.128, 0.105), smoothstep(0.35, 0.9, motion.x));
    glassColor = mix(glassColor, ink, mask);
    float scatter = exp(-strip / 23.0) * 0.79 + exp(-strip / 52.0) * 0.23;
    glassColor = mix(glassColor, mix(led, vec3(1.0), day * 0.30), scatter * intensity * mix(0.91, 0.69, day));
    float reflection = exp(min(glass, 0.0) / 2.3) * (0.30 - normal.y * 0.11);
    vec3 reflectionTint = mix(vec3(0.60, 0.66, 0.81), vec3(1.0, 0.99, 0.94), day);
    glassColor = mix(glassColor, reflectionTint, reflection);
    result = over(result, glassColor, 1.0 - smoothstep(-aa, aa, glass));
  }

  result = over(result, led, exp(-strip / 8.0) * 0.67 * intensity);
  float filament = 1.0 - smoothstep(max(0.0, 1.45 - aa), 1.45 + aa, strip);
  result = over(result, mix(led, vec3(1.0), 0.88), filament);
  pixel = vec4(result.rgb / max(result.a, 0.001), result.a * fade);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export function createGlassLightWebGL(onLost: () => void) {
  const surface = document.createElement('canvas')
  // Integrated GPUs are sufficient for this tiny surface. Let the Canvas 2D
  // renderer handle devices that would have to emulate WebGL in software.
  const gl = surface.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true,
  })
  if (!gl) return null
  const loseContext = () => gl.getExtension('WEBGL_lose_context')?.loseContext()
  const vertexShader = compile(gl, gl.VERTEX_SHADER, vertex)
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  if (!program || !vertexShader || !fragmentShader) {
    loseContext()
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  const texture = gl.createTexture()
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = iconSize
  const spriteContext = sprite.getContext('2d')
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) || !texture || !spriteContext) {
    loseContext()
    return null
  }
  const motion = gl.getUniformLocation(program, 'motion')
  gl.useProgram(program)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, iconSize, iconSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  surface.addEventListener('webglcontextlost', onLost)
  let lastPosition = -1
  return {
    paint(ctx: CanvasRenderingContext2D, position: number, orbit: number, energy: number) {
      if (gl.isContextLost()) return false
      if (surface.width !== ctx.canvas.width || surface.height !== ctx.canvas.height) {
        surface.width = ctx.canvas.width
        surface.height = ctx.canvas.height
        gl.viewport(0, 0, surface.width, surface.height)
      }
      const phase = clamp(position)
      if (lastPosition !== phase) {
        spriteContext.clearRect(0, 0, iconSize, iconSize)
        paintGlassIcon(spriteContext, iconSize / 2, iconSize / 2, phase, [255, 255, 255])
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, sprite)
        lastPosition = phase
      }
      gl.uniform3f(motion, position, orbit, energy)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      ctx.resetTransform()
      ctx.clearRect(0, 0, surface.width, surface.height)
      ctx.drawImage(surface, 0, 0)
      return true
    },
    dispose() {
      surface.removeEventListener('webglcontextlost', onLost)
      gl.deleteTexture(texture)
      gl.deleteProgram(program)
      if (!gl.isContextLost()) loseContext()
    },
  }
}
