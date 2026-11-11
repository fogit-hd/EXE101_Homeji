import { tabsTrackWidth } from './tabLensMotion'

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`

// Actual scene sampling through a convex capsule, with a plane back surface.
// Each wavelength uses its own index of refraction (Snell's law via refract).
const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D scene;
// The same tabs painted in their selected style: the lens reveals it wherever
// it rests or is dragged, so labels recolour under the glass in real time.
uniform sampler2D activeScene;
uniform vec2 sceneSize;
uniform vec4 lensBox;
uniform float lightX;
uniform float dark;
uniform float strength;
vec2 sceneUv(vec2 pixel) { return clamp(vec2(pixel.x / sceneSize.x, 1. - pixel.y / sceneSize.y), vec2(.001), vec2(.999)); }
vec2 trace(vec2 pixel, vec3 normal, float depth, float ior, float bend) {
  vec3 inside = refract(vec3(0.,0.,-1.), normal, 1. / ior);
  vec3 outside = refract(inside, vec3(0.,0.,1.), ior);
  vec2 travel = inside.xy / max(.12, -inside.z) * depth;
  travel += outside.xy / max(.12, -outside.z) * 8.;
  return sceneUv(pixel + travel * bend);
}
void main() {
  vec2 pixel = vec2(uv.x, 1. - uv.y) * sceneSize;
  vec4 base = texture2D(scene, sceneUv(pixel));
  vec2 center = lensBox.xy + lensBox.zw * .5;
  vec2 p = pixel - center;
  float radius = max(1., lensBox.w * .5 - 1.);
  vec2 q = p - vec2(clamp(p.x, -lensBox.z*.5+radius+1., lensBox.z*.5-radius-1.),0.);
  float d = length(q) / radius;
  if (lensBox.z < 1.) { gl_FragColor = base; return; }
  // A contact shadow is evaluated from the same capsule silhouette. It is not
  // a CSS halo; the light and shadow remain attached to the moving lens.
  if (d >= 1.) {
    float distance = length(q) - radius;
    float shadow = exp(-distance / 4.5) * .16;
    gl_FragColor = vec4(base.rgb * (1. - shadow), base.a);
    return;
  }
  // A flattened optical crown keeps the label readable. Curvature rises only
  // at the bevel, unlike a spherical cylinder which stretches the whole word.
  float crown = sqrt(max(.002, 1. - pow(d, 5.)));
  float slope = min(5., .32 * d + 3.2 * pow(d, 4.) / crown);
  vec2 radial = q / max(length(q), .001);
  vec3 normal = normalize(vec3(radial * slope * .48, 1.));
  float depth = radius * (.16 + crown * .20);
  // Labels crossing the rim would smear into dark slivers at full bend, so the
  // bevel refracts less while keeping its light; the crown stays true.
  float bevel = smoothstep(.6,.98,d);
  float bend = strength * (1. - .6 * bevel);
  // Cauchy-like ordering: violet/blue bends more than red. These are material
  // parameters, not RGB shadows or offset HTML copies.
  vec4 red = texture2D(activeScene, trace(pixel, normal, depth, 1.506, bend));
  vec4 green = texture2D(activeScene, trace(pixel, normal, depth, 1.518, bend));
  vec4 blue = texture2D(activeScene, trace(pixel, normal, depth, 1.532, bend));
  vec3 transmitted = vec3(red.r, green.g, blue.b);
  vec3 key = normalize(vec3((lightX-.5)*.9,-.7,1.8));
  vec3 reflected = reflect(vec3(0.,0.,-1.),normal);
  // Broad studio softboxes produce continuous rim reflections rather than a
  // single point-light dot. Fresnel reveals the thickness along the bevel.
  float softbox = pow(max(0.,dot(reflected,key)),12.);
  float lowerLight = pow(max(0.,dot(reflected,normalize(vec3(.3,.9,1.5)))),24.);
  float fresnel = .04 + .96 * pow(1.-normal.z,5.);
  vec3 environment = mix(vec3(.34,.48,.46),vec3(.73,.89,.88),dark);
  vec3 color = mix(transmitted,environment,fresnel * .55);
  color *= 1. - bevel * .055;
  color += vec3(softbox * .095 + lowerLight * .055) * bevel;
  float topEdge = smoothstep(.93,.985,d) * (1.-smoothstep(.985,1.,d));
  float facingLight = .35 + .65 * max(0.,-radial.y);
  color = mix(color,vec3(1.),topEdge * facingLight * mix(.72,.36,dark));
  float edge = 1.-smoothstep(.985,1.,d);
  gl_FragColor = vec4(mix(base.rgb, color, edge), max(base.a, edge));
}
`

/** sRGB channels 0..1 and alpha from a computed CSS colour; null when unparseable. */
function parseColor(value: string): [number, number, number, number] | null {
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value)
  if (rgb) {
    const [r, g, b, a = '1'] = rgb[1].split(/[\s,/]+/).filter(Boolean)
    return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)]
  }
  const srgb = /^color\(srgb ([^)]+)\)$/.exec(value)
  if (srgb) {
    const [r, g, b, , a = '1'] = srgb[1].split(/\s+/)
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  return null
}
const hasPaint = (value: string) => (parseColor(value)?.[3] ?? 0) > .05
const luminance = ([r, g, b]: [number, number, number, number]) =>
  [r, g, b].map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0)
/** True when text keeps at least 4.5:1 against the painted glass surface. */
function readableOnScene(color: string, dark: boolean) {
  const parsed = parseColor(color)
  if (!parsed) return true
  const text = luminance(parsed), surface = dark ? .036 : .84
  return (Math.max(text, surface) + .05) / (Math.min(text, surface) + .05) >= 4.5
}

/** Bounded tab scene, not a screenshot of arbitrary page content. HTML remains
 * the interaction/accessibility layer. Unsupported content keeps plain HTML. */
export function attachWebglTabGlass(root: HTMLElement, lens: HTMLElement) {
  if (typeof ResizeObserver === 'undefined') return () => {}
  const preferences = window.matchMedia('(prefers-reduced-transparency: reduce), (forced-colors: active), (prefers-contrast: more)')
  const canvas = document.createElement('canvas')
  canvas.className = 'liquid-tabs__webgl'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.glassExclude = ''
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' })
  const textureScene = document.createElement('canvas'), ctx = textureScene.getContext('2d')
  if (!gl || !ctx) { root.dataset.glassRenderer = 'fallback'; return () => { delete root.dataset.glassRenderer } }
  let disposed = false, failed = false, visible = true, frame = 0, dirty = true, animateUntil = 0
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null
  const textures: (WebGLTexture | null)[] = [null, null]
  const shaders: WebGLShader[] = []
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Shader unavailable')
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Tab shader compilation failed')
    return shader
  }
  const releaseGpu = () => {
    if (gl.isContextLost()) return
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteProgram(program); gl.deleteBuffer(buffer); textures.forEach(texture => gl.deleteTexture(texture))
  }
  try {
    program = gl.createProgram(); buffer = gl.createBuffer(); textures[0] = gl.createTexture(); textures[1] = gl.createTexture()
    if (!program || !buffer || !textures[0] || !textures[1]) throw new Error('GPU resources unavailable')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Tab shader link failed')
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    textures.forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    })
  } catch {
    releaseGpu(); root.dataset.glassRenderer = 'fallback'
    return () => { delete root.dataset.glassRenderer }
  }
  const uniforms = Object.fromEntries(['sceneSize','lensBox','lightX','dark','strength','scene','activeScene'].map(name => [name, gl.getUniformLocation(program!, name)]))
  root.append(canvas)
  const tabs = () => [...root.querySelectorAll<HTMLButtonElement>(':scope > button[role="tab"]')]
  const showHtml = () => { delete root.dataset.glassRenderer; canvas.hidden = true }
  // Icons may declare a per-state source (data-glass-idle-src / data-glass-active-src).
  // Each URL is decoded once; a paint skips an image still loading and repaints on load.
  const images = new Map<string, HTMLImageElement>()
  const imageFor = (url: string) => {
    let image = images.get(url)
    if (!image) {
      image = new Image(); image.decoding = 'async'; image.src = url; images.set(url, image)
      image.addEventListener('load', () => { if (!disposed) invalidate() }, { once: true })
    }
    return image.complete && image.naturalWidth ? image : null
  }
  type Layer = 'idle' | 'active'
  const paintLayer = (layer: Layer, buttons: HTMLButtonElement[], width: number, height: number, ratio: number, dark: boolean) => {
    textureScene.width = canvas.width; textureScene.height = canvas.height
    ctx.setTransform(ratio,0,0,ratio,0,0)
    ctx.imageSmoothingQuality = 'high'
    const surface = ctx.createLinearGradient(0,0,0,height)
    surface.addColorStop(0,dark ? '#243f47' : '#f4faf9')
    surface.addColorStop(.52,dark ? '#20383e' : '#e7f1ef')
    surface.addColorStop(1,dark ? '#1b3038' : '#dcebea')
    ctx.fillStyle = surface
    ctx.fillRect(0,0,width,height)
    const box = root.getBoundingClientRect()
    const offsetX = root.scrollLeft - box.left, offsetY = -box.top
    // Every tab is painted as if selected (active) or not (idle), whatever the DOM
    // state, using the computed style of a real tab in that state.
    const reference = getComputedStyle((layer === 'active'
      ? buttons.find(button => button.getAttribute('aria-selected') === 'true')
      : buttons.find(button => button.getAttribute('aria-selected') !== 'true')) ?? buttons[0])
    // HTML labels are hidden under the scene, so a caller's ink chosen for a
    // solid active pill (e.g. white) must not vanish on the light glass.
    const fallbackInk = getComputedStyle(root).getPropertyValue(layer === 'active' ? '--tabs-ink' : '--tabs-muted-ink').trim() || (dark ? '#f0fdf9' : '#0f2e28')
    const labelInk = readableOnScene(reference.color, dark) ? reference.color : fallbackInk
    for (const button of buttons) {
      ctx.globalAlpha = button.disabled ? .4 : 1
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof HTMLImageElement) {
          const rect = node.getBoundingClientRect()
          if (!rect.width || !rect.height) continue
          const stateSrc = layer === 'active' ? node.dataset.glassActiveSrc : node.dataset.glassIdleSrc
          const image = stateSrc ? imageFor(stateSrc) : node.complete && node.naturalWidth ? node : imageFor(node.currentSrc || node.src)
          if (image) ctx.drawImage(image, rect.left+offsetX, rect.top+offsetY, rect.width, rect.height)
          continue
        }
        if (node instanceof HTMLElement) {
          const style = getComputedStyle(node), rect = node.getBoundingClientRect()
          if (node !== button && rect.width && hasPaint(style.backgroundColor)) {
            ctx.fillStyle = style.backgroundColor
            ctx.beginPath(); ctx.roundRect(rect.left+offsetX, rect.top+offsetY, rect.width, rect.height, Math.min(parseFloat(style.borderTopLeftRadius) || 0, rect.height/2)); ctx.fill()
          }
          continue
        }
        const text = node.textContent?.trim()
        const parent = node.parentElement
        if (!text || !parent) continue
        const range = document.createRange(); range.selectNodeContents(node)
        const rect = range.getBoundingClientRect(), style = getComputedStyle(parent)
        if (!rect.width) continue
        // Badge text keeps its own colours; labels take the layer's state style.
        const badge = parent !== button && hasPaint(style.backgroundColor)
        ctx.font = `${style.fontStyle} ${badge ? style.fontWeight : reference.fontWeight} ${style.fontSize} ${style.fontFamily}`
        ctx.fillStyle = badge ? style.color : labelInk
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
        ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
        const metrics = ctx.measureText(text)
        const ascent = metrics.actualBoundingBoxAscent, descent = metrics.actualBoundingBoxDescent
        // Centre the glyph run in its laid-out box, so a weight change keeps it in place.
        const left = rect.left + (rect.width - metrics.width) / 2
        ctx.fillText(text, left+offsetX, rect.top+offsetY+(rect.height+ascent-descent)*.5 || parseFloat(style.fontSize))
      }
      ctx.globalAlpha = 1
      if (button.matches(':focus-visible')) {
        const focus = button.getBoundingClientRect(); ctx.strokeStyle = labelInk; ctx.lineWidth = 2
        ctx.beginPath(); ctx.roundRect(focus.left+offsetX+3,focus.top+offsetY+3,focus.width-6,focus.height-6,20); ctx.stroke()
      }
    }
    const unit = layer === 'active' ? 1 : 0
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, textures[unit])
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureScene)
  }
  const paintScene = (width: number, height: number, ratio: number) => {
    const buttons = tabs()
    // Text, <img> icons and solid badges are painted faithfully. Inline SVG,
    // canvas and video cannot be flattened accurately, so keep their HTML.
    if (!buttons.length || buttons.some(button => button.querySelector('svg,canvas,video'))) return false
    const dark = document.documentElement.dataset.theme === 'dark'
    paintLayer('idle', buttons, width, height, ratio, dark)
    paintLayer('active', buttons, width, height, ratio, dark)
    return true
  }
  const render = (now: number) => {
    frame = 0
    if (disposed || failed || !visible || document.hidden || preferences.matches) return
    const width = tabsTrackWidth(root, tabs()), height = root.clientHeight
    // A surface whose CSS removes the lens (flat admin/popup tabs) keeps HTML.
    if (width < 2 || height < 2 || lens.hidden || !lens.getClientRects().length) { showHtml(); return }
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2, 2048/width, 256/height)
    const w = Math.round(width*ratio), h = Math.round(height*ratio)
    if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; canvas.style.width=`${width}px`; canvas.style.height=`${height}px`; dirty=true }
    if (dirty) { if (!paintScene(width,height,ratio)) { showHtml(); return } dirty=false }
    const box=root.getBoundingClientRect(), face=lens.getBoundingClientRect()
    gl.viewport(0,0,w,h); gl.uniform1i(uniforms.scene,0); gl.uniform1i(uniforms.activeScene,1); gl.uniform2f(uniforms.sceneSize,width,height)
    gl.uniform4f(uniforms.lensBox,face.left-box.left+root.scrollLeft,face.top-box.top,face.width,face.height)
    const light = parseFloat(lens.style.getPropertyValue('--lens-light-x'))
    gl.uniform1f(uniforms.lightX,Number.isFinite(light)?light/100:.26)
    gl.uniform1f(uniforms.dark,document.documentElement.dataset.theme==='dark'?1:0)
    gl.uniform1f(uniforms.strength,1)
    gl.drawArrays(gl.TRIANGLES,0,6)
    if (gl.getError() !== gl.NO_ERROR) { failed=true; showHtml(); return }
    canvas.hidden=false; root.dataset.glassRenderer='webgl-refraction'
    if (now < animateUntil) frame=requestAnimationFrame(render)
  }
  const schedule = () => { if (!frame && !disposed && !failed && visible && !document.hidden && !preferences.matches) frame=requestAnimationFrame(render) }
  const invalidate = () => { dirty=true; schedule() }
  const animate = () => { animateUntil=performance.now()+750; schedule() }
  const onPreference = () => { if (preferences.matches) showHtml(); else invalidate() }
  const onLost = (event: Event) => { event.preventDefault(); failed=true; cancelAnimationFrame(frame); frame=0; showHtml(); root.dataset.glassRenderer='fallback' }
  const resize=new ResizeObserver(invalidate); resize.observe(root); resize.observe(lens)
  const changes=new MutationObserver(records => {
    for (const record of records) {
      if (record.target===canvas) continue
      if (record.target===lens) animate()
      else if (record.attributeName==='data-lens-engaged' || record.attributeName==='data-lens-travel') animate()
      else if (record.target!==root || record.type==='childList') invalidate()
    }
  })
  changes.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-selected','disabled','style','hidden','data-lens-engaged','data-lens-travel']})
  const theme=new MutationObserver(invalidate); theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class']})
  const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries => { visible=entries[0]?.isIntersecting??false; if(visible) invalidate(); else { cancelAnimationFrame(frame);frame=0 } })
  intersection?.observe(root)
  for (const event of ['focusin','focusout','scroll']) root.addEventListener(event,invalidate)
  root.addEventListener('pointermove',schedule); root.addEventListener('pointerdown',animate); root.addEventListener('pointerup',animate)
  canvas.addEventListener('webglcontextlost',onLost); preferences.addEventListener('change',onPreference); document.addEventListener('visibilitychange',invalidate)
  void document.fonts?.ready.then(() => { if(!disposed) invalidate() })
  schedule()
  return () => {
    disposed=true;cancelAnimationFrame(frame);resize.disconnect();changes.disconnect();theme.disconnect();intersection?.disconnect()
    for (const event of ['focusin','focusout','scroll']) root.removeEventListener(event,invalidate)
    root.removeEventListener('pointermove',schedule);root.removeEventListener('pointerdown',animate);root.removeEventListener('pointerup',animate)
    canvas.removeEventListener('webglcontextlost',onLost);preferences.removeEventListener('change',onPreference);document.removeEventListener('visibilitychange',invalidate)
    releaseGpu();canvas.remove();delete root.dataset.glassRenderer
  }
}
