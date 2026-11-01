const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`

// Analytic 3D capsule surface: volume normals, Fresnel rim and two area-light
// reflections. DOM backdrop refraction stays in the existing CSS/SVG layer.
const fragmentSource = `
precision mediump float;
varying vec2 uv;
uniform vec2 size;
uniform float lightX;
uniform float dark;
uniform float pressed;
void main() {
  vec2 p = (uv - .5) * size;
  float radius = size.y * .5 - 1.;
  vec2 q = p - vec2(clamp(p.x, -size.x*.5+radius+1., size.x*.5-radius-1.), 0.);
  float d = length(q) / radius;
  if (d >= 1.) { gl_FragColor = vec4(0.); return; }
  float z = sqrt(max(0., 1.-d*d));
  vec3 normal = normalize(vec3(q / radius * (.72 + pressed*.08), z));
  vec3 key = normalize(vec3((lightX-.5)*1.8, .85, 1.2));
  vec3 fill = normalize(vec3(.6, -.9, .75));
  float reflection = pow(max(dot(reflect(-key,normal),vec3(0.,0.,1.)),0.),38.);
  float secondary = pow(max(dot(reflect(-fill,normal),vec3(0.,0.,1.)),0.),52.);
  float fresnel = .025 + .975*pow(1.-normal.z,4.);
  float rim = smoothstep(.82,.985,d) * (1.-smoothstep(.985,1.,d));
  float top = smoothstep(-.4,.7,normal.y);
  vec3 tint = mix(vec3(.22,.55,.50),vec3(.30,.68,.62),dark);
  vec3 color = mix(tint,vec3(1.),clamp(top*.65 + reflection + secondary*.5,0.,1.));
  float alpha = .025 + rim*(.12+top*.32) + fresnel*.11 + reflection*.34 + secondary*.13;
  alpha *= 1.-smoothstep(.975,1.,d);
  gl_FragColor = vec4(color, min(alpha,.65));
}
`

/** One small, on-demand canvas on one optical face; never replaces a control. */
export function attachWebglTabGlass(root: HTMLElement, lens: HTMLElement) {
  if (typeof ResizeObserver === 'undefined') return () => {}
  const preferences = window.matchMedia('(prefers-reduced-transparency: reduce), (forced-colors: active)')
  if (preferences.matches) return () => {}
  const canvas = document.createElement('canvas')
  canvas.className = 'liquid-tabs__webgl'
  canvas.setAttribute('aria-hidden', 'true')
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' })
  if (!gl) { root.dataset.glassRenderer = 'fallback'; return () => { delete root.dataset.glassRenderer } }
  let disposed = false, failed = false, visible = true, frame = 0
  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Shader unavailable')
    shaders.push(shader)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  try {
    program = gl.createProgram()
    if (!program) throw new Error('Program unavailable')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader compilation failed')
    buffer = gl.createBuffer()
    if (!buffer) throw new Error('Buffer unavailable')
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    root.dataset.glassRenderer = 'fallback'
    return () => { delete root.dataset.glassRenderer }
  }
  const sizeUniform = gl.getUniformLocation(program, 'size')
  const lightUniform = gl.getUniformLocation(program, 'lightX')
  const darkUniform = gl.getUniformLocation(program, 'dark')
  const pressedUniform = gl.getUniformLocation(program, 'pressed')
  lens.append(canvas)
  root.dataset.glassRenderer = 'webgl'
  const render = () => {
    frame = 0
    if (disposed || failed || !visible || document.hidden || preferences.matches || lens.hidden) return
    const width = lens.clientWidth, height = lens.clientHeight
    if (width < 2 || height < 2) return
    // Cap fill rate and backing-store memory on high-density phones.
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.min(1024, Math.round(width * ratio)), h = Math.min(256, Math.round(height * ratio))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(sizeUniform, width, height)
    const light = parseFloat(lens.style.getPropertyValue('--lens-light-x'))
    gl.uniform1f(lightUniform, Number.isFinite(light) ? light / 100 : .26)
    gl.uniform1f(darkUniform, document.documentElement.dataset.theme === 'dark' ? 1 : 0)
    gl.uniform1f(pressedUniform, root.dataset.lensEngaged ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
  const schedule = () => {
    if (!frame && !disposed && !failed && visible && !document.hidden && !preferences.matches) frame = requestAnimationFrame(render)
  }
  const onPreference = () => { canvas.hidden = preferences.matches; schedule() }
  const onLost = (event: Event) => {
    event.preventDefault()
    failed = true
    canvas.hidden = true
    root.dataset.glassRenderer = 'fallback'
    cancelAnimationFrame(frame); frame = 0
  }
  const resize = new ResizeObserver(schedule)
  resize.observe(lens)
  const changes = new MutationObserver(schedule)
  changes.observe(lens, { attributes: true, attributeFilter: ['style', 'hidden'] })
  changes.observe(root, { attributes: true, attributeFilter: ['data-lens-engaged'] })
  changes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    if (visible) schedule()
    else { cancelAnimationFrame(frame); frame = 0 }
  })
  intersection?.observe(root)
  canvas.addEventListener('webglcontextlost', onLost)
  preferences.addEventListener('change', onPreference)
  document.addEventListener('visibilitychange', schedule)
  schedule()
  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    resize.disconnect(); changes.disconnect(); intersection?.disconnect()
    canvas.removeEventListener('webglcontextlost', onLost)
    preferences.removeEventListener('change', onPreference)
    document.removeEventListener('visibilitychange', schedule)
    if (!gl.isContextLost()) {
      shaders.forEach(shader => gl.deleteShader(shader))
      gl.deleteProgram(program); gl.deleteBuffer(buffer)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    canvas.remove()
    delete root.dataset.glassRenderer
  }
}
