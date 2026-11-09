export const GLASS_TRACK = { width: 432, height: 224, lens: 198, travel: 208 }
export const GLASS_BLEED = 168
const BLEED = GLASS_BLEED
const HALF = GLASS_TRACK.lens / 2
const RADIUS = 58
const TAU = Math.PI * 2

type Color = readonly [number, number, number]
type Pixel = { x: number; y: number; opacity: number }

export const clamp = (value: number) => Math.min(1, Math.max(0, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => { const p = clamp(t); return p * p * (3 - 2 * p) }
const color = (a: Color, b: Color, t: number): Color => [
  Math.round(mix(a[0], b[0], t)), Math.round(mix(a[1], b[1], t)), Math.round(mix(a[2], b[2], t)),
]
const rgba = (rgb: Color, opacity = 1) => `rgba(${rgb.join(',')},${opacity})`

// Sample the crescent and its earthshine on a 17 × 17 grid. The day icon
// uses a solid core and eight discrete rays on the same grid.
function makeIcons() {
  const moon: Pixel[] = []
  const sun: Pixel[] = []
  for (let y = -8; y <= 8; y++) {
    for (let x = -8; x <= 8; x++) {
      const radius = Math.hypot(x, y)
      const inShadow = Math.hypot(x - 3.3, y + 2.4) <= 5.4
      if (radius <= 6.6 && (!inShadow || (x + y) % 2 === 0)) {
        moon.push({ x, y, opacity: inShadow ? .18 : 1 })
      }
      if (radius <= 3.7) sun.push({ x, y, opacity: 1 })
    }
  }
  moon.push({ x: 7, y: -7, opacity: .85 }, { x: 6, y: -7, opacity: .36 },
    { x: 8, y: -7, opacity: .36 }, { x: 7, y: -8, opacity: .36 },
    { x: 7, y: -6, opacity: .36 }, { x: 3, y: -8, opacity: .52 }, { x: 8, y: -3, opacity: .42 })
  for (let ray = 0; ray < 8; ray++) {
    const angle = ray * TAU / 8
    for (const distance of ray % 2 ? [5.9, 7.2] : [5.6, 6.6, 7.6]) {
      sun.push({ x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance), opacity: 1 })
    }
  }
  const angleOf = ({ x, y }: Pixel) => (Math.atan2(y, x) + TAU * 1.375) % TAU + Math.hypot(x, y) / 1000
  moon.sort((a, b) => angleOf(a) - angleOf(b))
  sun.sort((a, b) => angleOf(a) - angleOf(b))
  return moon.map((night, i) => {
    const j = Math.floor(i * sun.length / moon.length)
    const day = sun[j]
    const opacity = j === Math.floor((i - 1) * sun.length / moon.length) ? 0 : day.opacity
    return { night, day: { ...day, opacity }, delay: .08 + (8 - night.x) * .015, curl: .48 + (i % 7) * .075 }
  })
}

const pixels = makeIcons()

export function paintGlassIcon(
  ctx: CanvasRenderingContext2D, x: number, y: number, position: number, ink: Color,
) {
  for (const { night, day: sun, delay, curl } of pixels) {
    const stage = smooth((position - delay) / .64)
    const swirl = Math.sin(stage * Math.PI) * curl
    const spring = stage + Math.sin(stage * TAU) * Math.sin(stage * Math.PI) * (curl - .48) * .22
    const px = mix(night.x, sun.x, spring)
    const py = mix(night.y, sun.y, spring)
    const pxX = x + (px * Math.cos(swirl) - py * Math.sin(swirl)) * 6
    const pxY = y + (py * Math.cos(swirl) + px * Math.sin(swirl)) * 6
    ctx.fillStyle = rgba(ink, mix(night.opacity, sun.opacity, stage))
    ctx.fillRect(pxX - 2.3, pxY - 2.3, 4.6, 4.6)
  }
}

// Intersect a light ray with the straight side or the rounded corner of the lens.
function rimPoint(angle: number, half: number, radius: number) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const a = Math.abs(dx)
  const b = Math.abs(dy)
  const shoulder = half - radius
  const side = half / Math.max(a, b)
  const projection = shoulder * (a + b)
  const distance = Math.min(a, b) * side <= shoulder
    ? side
    : projection + Math.sqrt(projection ** 2 - 2 * shoulder ** 2 + radius ** 2)
  return { x: distance * dx, y: distance * dy }
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function resizeGlassCanvas(canvas: HTMLCanvasElement, width: number) {
  const scale = Math.min(2, window.devicePixelRatio || 1) * width / GLASS_TRACK.width
  canvas.width = Math.max(1, Math.round((GLASS_TRACK.width + BLEED * 2) * scale))
  canvas.height = Math.max(1, Math.round((GLASS_TRACK.height + BLEED * 2) * scale))
}

export function paintGlassLight(ctx: CanvasRenderingContext2D, position: number, orbit: number, energy: number) {
  const { width, height, travel } = GLASS_TRACK
  const p = clamp(position)
  const day = smooth((p - .18) / .64)
  const x = width / 2 + travel * (position - .5)
  const y = height / 2
  const light = color([111, 134, 255], [255, 168, 46], day)
  const emission = rimPoint(orbit, HALF + 5, RADIUS + 5)
  const scale = ctx.canvas.width / (width + BLEED * 2)
  ctx.setTransform(scale, 0, 0, scale, BLEED * scale, BLEED * scale)
  ctx.clearRect(-BLEED, -BLEED, width + BLEED * 2, height + BLEED * 2)

  const track = ctx.createLinearGradient(0, 0, 0, height)
  track.addColorStop(0, rgba(color([6, 6, 8], [200, 200, 196], day)))
  track.addColorStop(.10, rgba(color([12, 12, 15], [221, 221, 217], day)))
  track.addColorStop(1, rgba(color([10, 10, 12], [230, 230, 226], day)))
  ctx.shadowColor = rgba([0, 0, 0], mix(.58, .25, day))
  ctx.shadowBlur = 25 * scale
  ctx.shadowOffsetY = 9 * scale
  box(ctx, 1, 1, width - 2, height - 2, 72)
  ctx.fillStyle = track
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  const trackEdge = ctx.createLinearGradient(0, 0, 0, height)
  trackEdge.addColorStop(0, rgba(color([0, 0, 0], [91, 91, 87], day), .23))
  trackEdge.addColorStop(.75, rgba(color([112, 117, 129], [247, 247, 242], day), .08))
  trackEdge.addColorStop(1, rgba(color([112, 117, 129], [255, 255, 252], day), mix(.14, .45, day)))
  ctx.strokeStyle = trackEdge
  ctx.lineWidth = 2
  ctx.stroke()

  const spill = ctx.createRadialGradient(x + emission.x * .66, y + emission.y * .66, 12,
    x + emission.x * .66, y + emission.y * .66, 233)
  spill.addColorStop(0, rgba(light, .56))
  spill.addColorStop(.29, rgba(light, .29))
  spill.addColorStop(.59, rgba(light, .085))
  spill.addColorStop(1, rgba(light, 0))
  ctx.fillStyle = spill
  ctx.fillRect(-BLEED, -BLEED, width + BLEED * 2, height + BLEED * 2)

  // The short-range bloom follows the curved strip, including its shoulders.
  for (const offset of [-.82, -.4, 0, .4, .82]) {
    const rim = rimPoint(orbit + offset, HALF + 5, RADIUS + 5)
    const haloX = x + rim.x
    const haloY = y + rim.y
    const halo = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, 74)
    halo.addColorStop(0, rgba(light, mix(.48, .39, day)))
    halo.addColorStop(.31, rgba(light, mix(.31, .24, day)))
    halo.addColorStop(1, rgba(light, 0))
    ctx.fillStyle = halo
    ctx.fillRect(haloX - 74, haloY - 74, 148, 148)
  }

  const face = ctx.createLinearGradient(x, y - HALF, x, y + HALF)
  face.addColorStop(0, rgba(color([65, 65, 70], [255, 254, 249], day), .95))
  face.addColorStop(.47, rgba(color([40, 42, 49], [249, 248, 242], day), .94))
  face.addColorStop(1, rgba(color([27, 29, 40], [238, 237, 232], day), .94))
  box(ctx, x - HALF, y - HALF, HALF * 2, HALF * 2, RADIUS)
  ctx.shadowColor = rgba([0, 0, 0], mix(.56, .27, day))
  ctx.shadowBlur = 21 * scale
  ctx.shadowOffsetY = 9 * scale
  ctx.fillStyle = face
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  ctx.save()
  ctx.clip()
  const bevel = ctx.createLinearGradient(x - HALF, y, x + HALF, y)
  bevel.addColorStop(0, 'rgba(219,238,255,.20)')
  bevel.addColorStop(.085, 'rgba(255,255,255,.015)')
  bevel.addColorStop(.88, 'rgba(255,255,255,0)')
  bevel.addColorStop(1, 'rgba(204,189,248,.18)')
  ctx.fillStyle = bevel
  ctx.fillRect(x - HALF, 0, HALF * 2, height)

  const ink = color([255, 247, 228], [49, 45, 36], smooth((p - .35) / .55))
  ctx.shadowColor = rgba(color([255, 203, 149], [125, 97, 55], day), mix(.65, .17, day))
  ctx.shadowBlur = 8 * scale
  paintGlassIcon(ctx, x, y, p, ink)
  ctx.shadowBlur = 0

  const scatter = ctx.createLinearGradient(x + emission.x, y + emission.y,
    x - emission.x * .18, y - emission.y * .18)
  scatter.addColorStop(0, rgba(color(light, [255, 255, 255], mix(.63, .2, day)), mix(.92, .78, day)))
  scatter.addColorStop(.23, rgba(light, mix(.58, .46, day)))
  scatter.addColorStop(.63, rgba(light, .12))
  scatter.addColorStop(1, rgba(light, 0))
  ctx.fillStyle = scatter
  ctx.fillRect(x - HALF, 0, HALF * 2, height)
  ctx.restore()

  const edge = ctx.createLinearGradient(x - HALF, y - HALF, x + HALF, y + HALF)
  edge.addColorStop(0, rgba(color([207, 214, 233], [255, 255, 253], day), mix(.35, .87, day)))
  edge.addColorStop(.52, rgba(color([120, 129, 169], [255, 251, 237], day), mix(.19, .53, day)))
  edge.addColorStop(1, rgba(color([137, 159, 255], [255, 250, 218], day), .58))
  ctx.strokeStyle = edge
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  for (let i = 0; i <= 28; i++) {
    const rim = rimPoint(orbit + (i / 28 - .5) * 2.02, HALF + 5, RADIUS + 5)
    ctx.lineTo(x + rim.x, y + rim.y)
  }
  ctx.lineCap = 'round'
  ctx.shadowColor = rgba(light, 1)
  ctx.shadowBlur = (31 + energy * 12) * scale
  ctx.strokeStyle = rgba(light, .30)
  ctx.lineWidth = 7
  ctx.stroke()
  ctx.shadowBlur = 16 * scale
  ctx.strokeStyle = rgba(color(light, [255, 255, 255], .45), .76)
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = rgba(color(light, [255, 255, 255], .94))
  ctx.lineWidth = 2
  ctx.stroke()
}
