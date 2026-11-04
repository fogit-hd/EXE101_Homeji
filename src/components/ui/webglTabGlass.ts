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
uniform vec2 sceneSize;
uniform vec4 lensBox;
uniform float lightX;
uniform float dark;
uniform float strength;
vec2 sceneUv(vec2 pixel) { return clamp(vec2(pixel.x / sceneSize.x, 1. - pixel.y / sceneSize.y), vec2(.001), vec2(.999)); }
vec2 trace(vec2 pixel, vec3 normal, float depth, float ior) {
  vec3 inside = refract(vec3(0.,0.,-1.), normal, 1. / ior);
  vec3 outside = refract(inside, vec3(0.,0.,1.), ior);
  vec2 travel = inside.xy / max(.12, -inside.z) * depth;
  travel += outside.xy / max(.12, -outside.z) * 8.;
  return sceneUv(pixel + travel * strength);
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
  // Cauchy-like ordering: violet/blue bends more than red. These are material
  // parameters, not RGB shadows or offset HTML copies.
  vec4 red = texture2D(scene, trace(pixel, normal, depth, 1.506));
  vec4 green = texture2D(scene, trace(pixel, normal, depth, 1.518));
  vec4 blue = texture2D(scene, trace(pixel, normal, depth, 1.532));
  vec3 transmitted = vec3(red.r, green.g, blue.b);
  vec3 key = normalize(vec3((lightX-.5)*.9,-.7,1.8));
  vec3 reflected = reflect(vec3(0.,0.,-1.),normal);
  // Broad studio softboxes produce continuous rim reflections rather than a
  // single point-light dot. Fresnel reveals the thickness along the bevel.
  float softbox = pow(max(0.,dot(reflected,key)),12.);
  float lowerLight = pow(max(0.,dot(reflected,normalize(vec3(.3,.9,1.5)))),24.);
  float fresnel = .04 + .96 * pow(1.-normal.z,5.);
  float bevel = smoothstep(.6,.98,d);
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
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, texture: WebGLTexture | null = null
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
    gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture)
  }
  try {
    program = gl.createProgram(); buffer = gl.createBuffer(); texture = gl.createTexture()
    if (!program || !buffer || !texture) throw new Error('GPU resources unavailable')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Tab shader link failed')
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  } catch {
    releaseGpu(); root.dataset.glassRenderer = 'fallback'
    return () => { delete root.dataset.glassRenderer }
  }
  const uniforms = Object.fromEntries(['sceneSize','lensBox','lightX','dark','strength','scene'].map(name => [name, gl.getUniformLocation(program!, name)]))
  root.append(canvas)
  const tabs = () => [...root.querySelectorAll<HTMLButtonElement>(':scope > button[role="tab"]')]
  const showHtml = () => { delete root.dataset.glassRenderer; canvas.hidden = true }
  const paintScene = (width: number, height: number, ratio: number) => {
    const buttons = tabs()
    // This scene intentionally supports text tabs. Never replace an icon/image
    // tab by an inaccurate flattening; keep its HTML visible instead.
    if (!buttons.length || buttons.some(button => button.querySelector('img,svg,canvas,video'))) return false
    textureScene.width = canvas.width; textureScene.height = canvas.height
    ctx.setTransform(ratio,0,0,ratio,0,0)
    const dark = document.documentElement.dataset.theme === 'dark'
    const surface = ctx.createLinearGradient(0,0,0,height)
    surface.addColorStop(0,dark ? '#243f47' : '#f4faf9')
    surface.addColorStop(.52,dark ? '#20383e' : '#e7f1ef')
    surface.addColorStop(1,dark ? '#1b3038' : '#dcebea')
    ctx.fillStyle = surface
    ctx.fillRect(0,0,width,height)
    const box = root.getBoundingClientRect()
    for (const button of buttons) {
      const range = document.createRange(); range.selectNodeContents(button)
      const rect = range.getBoundingClientRect(), style = getComputedStyle(button)
      const fontSize = parseFloat(style.fontSize)
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ctx.fillStyle = style.color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
      ctx.globalAlpha = button.disabled ? .4 : 1
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
      const text = button.textContent?.trim() ?? ''
      const metrics = ctx.measureText(text)
      const ascent = metrics.actualBoundingBoxAscent, descent = metrics.actualBoundingBoxDescent
      ctx.fillText(text, rect.left-box.left+root.scrollLeft, rect.top-box.top+(rect.height+ascent-descent)*.5 || fontSize)
      ctx.globalAlpha = 1
      if (button.matches(':focus-visible')) {
        const focus = button.getBoundingClientRect(); ctx.strokeStyle = style.color; ctx.lineWidth = 2
        ctx.beginPath(); ctx.roundRect(focus.left-box.left+root.scrollLeft+3,focus.top-box.top+3,focus.width-6,focus.height-6,20); ctx.stroke()
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureScene)
    return true
  }
  const render = (now: number) => {
    frame = 0
    if (disposed || failed || !visible || document.hidden || preferences.matches) return
    const width = root.scrollWidth, height = root.clientHeight
    if (width < 2 || height < 2 || lens.hidden) { showHtml(); return }
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2, 2048/width, 256/height)
    const w = Math.round(width*ratio), h = Math.round(height*ratio)
    if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; canvas.style.width=`${width}px`; canvas.style.height=`${height}px`; dirty=true }
    if (dirty) { if (!paintScene(width,height,ratio)) { showHtml(); return } dirty=false }
    const box=root.getBoundingClientRect(), face=lens.getBoundingClientRect()
    gl.viewport(0,0,w,h); gl.uniform1i(uniforms.scene,0); gl.uniform2f(uniforms.sceneSize,width,height)
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
