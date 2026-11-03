/** One WebGL2 context shades small, visible button tiles. Labels/icons stay in
 * the native DOM; neither screenshots nor copies of user text enter a texture.
 * Solid CSS paint is the supported scene. Image/video/complex scenes are not
 * approximated as if they were a captured backdrop. */
export type ButtonGlassPaint = { face: number[]; scene: number[]; radius: number; dark: boolean }
const vertex = `#version 300 es
const vec2 P[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main(){gl_Position=vec4(P[gl_VertexID],0.,1.);}`
const fragment = `#version 300 es
precision highp float;
uniform vec2 resolution,size,light;
uniform vec3 face,scene;
uniform float radius,press,dark;
out vec4 pixel;
float sdf(vec2 p){vec2 q=abs(p)-size*.5+radius;return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
float heightAt(vec2 p){float t=clamp(-sdf(p)/min(8.,size.y*.22),0.,1.);return sqrt(max(0.,1.-(1.-t)*(1.-t)));}
void main(){
  vec2 p=(gl_FragCoord.xy/resolution-.5)*(size+vec2(24.));
  float d=sdf(p),aa=max(fwidth(d),.3);
  if(d>aa){float ds=max(sdf(p-vec2(0.,-2.5)),0.);float shadow=exp(-ds*ds/25.)*mix(.12,.23,dark);pixel=vec4(vec3(0.),shadow);return;}
  float h=heightAt(p),e=.35;
  vec2 grad=vec2(heightAt(p+vec2(e,0.))-heightAt(p-vec2(e,0.)),heightAt(p+vec2(0.,e))-heightAt(p-vec2(0.,e)))/(2.*e);
  vec3 n=normalize(vec3(-grad*6.,1.));
  vec3 ray=refract(vec3(0.,0.,-1.),n,1./1.518);
  // With a solid background the transmitted radiance is constant. Curvature
  // changes environment reflection and Fresnel, not the foreground glyphs.
  vec3 reflection=reflect(vec3(0.,0.,-1.),n);
  float fresnel=.04+.96*pow(1.-n.z,5.);
  vec3 environment=mix(scene,vec3(1.),.24+.24*max(0.,reflection.y));
  vec3 color=mix(face,environment,fresnel*.48);
  float bevel=1.-h;
  float softbox=pow(max(0.,dot(reflection,normalize(vec3(light,1.7)))),14.);
  color+=vec3(softbox*bevel*.17*(1.+press*.2));
  // Finite thickness gives a narrow lip, not a white dot or an opaque halo.
  float lip=exp(-pow((d+.8)/.9,2.));
  float key=.22+.62*max(0.,n.y)+.16*max(0.,-n.x);
  color=mix(color,vec3(1.),lip*key*mix(.63,.32,dark));
  color*=1.-bevel*.045;
  color+=vec3(ray.x*.0003,0.,-ray.x*.0003)*bevel;
  float border=1.-smoothstep(.15,.7,abs(d+.25));
  color=mix(color,mix(vec3(.39,.48,.49),vec3(.7,.83,.85),dark),border*.2);
  pixel=vec4(clamp(color,0.,1.),1.-smoothstep(-aa*.5,aa*.5,d));
}`

export function createButtonGlassRenderer(onLost: () => void) {
  const surface = document.createElement('canvas')
  const gl = surface.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' })
  if (!gl) return null
  const program = gl.createProgram(), vao = gl.createVertexArray()
  if (!program || !vao) { gl.deleteProgram(program); gl.deleteVertexArray(vao); return null }
  const shaders: WebGLShader[] = []
  let lost = false
  const dispose = () => {
    surface.removeEventListener('webglcontextlost', contextLost)
    if (!gl.isContextLost()) { shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); gl.deleteVertexArray(vao) }
  }
  function contextLost(event: Event) { event.preventDefault(); lost = true; onLost() }
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw Error('Button shader unavailable')
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Button shader compilation failed')
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Button shader linking failed')
  } catch { dispose(); return null }
  surface.addEventListener('webglcontextlost', contextLost)
  const u = Object.fromEntries(['resolution', 'size', 'face', 'scene', 'radius', 'press', 'light', 'dark'].map(name => [name, gl.getUniformLocation(program, name)]))
  return {
    draw(target: HTMLCanvasElement, width: number, height: number, paint: ButtonGlassPaint, pressed: number, light: [number, number]) {
      if (lost || gl.isContextLost()) return false
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 1024 / (width + 24), 256 / (height + 24))
      const w = Math.max(1, Math.ceil((width + 24) * ratio)), h = Math.max(1, Math.ceil((height + 24) * ratio))
      if (surface.width !== w || surface.height !== h) { surface.width = w; surface.height = h }
      gl.useProgram(program); gl.bindVertexArray(vao); gl.viewport(0, 0, w, h)
      gl.uniform2f(u.resolution, w, h); gl.uniform2f(u.size, width, height)
      gl.uniform3f(u.face, paint.face[0], paint.face[1], paint.face[2]); gl.uniform3f(u.scene, paint.scene[0], paint.scene[1], paint.scene[2])
      gl.uniform1f(u.radius, paint.radius); gl.uniform1f(u.press, pressed); gl.uniform1f(u.dark, paint.dark ? 1 : 0); gl.uniform2f(u.light, ...light)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (gl.getError() !== gl.NO_ERROR) return false
      const context = target.getContext('2d')
      if (!context) return false
      if (target.width !== w || target.height !== h) { target.width = w; target.height = h }
      context.clearRect(0, 0, w, h); context.drawImage(surface, 0, 0)
      return true
    }, dispose,
  }
}
