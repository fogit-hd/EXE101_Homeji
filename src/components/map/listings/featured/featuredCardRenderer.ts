import { createRimPath, paintRimTrail } from './rimTrail'

type Entry = {
  card: HTMLElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D
  width: number; height: number; radius: number; path: ReturnType<typeof createRimPath>
  visible: boolean; phase: number; dpr: number
}
const entries = new Map<HTMLElement, Entry>()
let raf = 0, last = 0, time = 0, generation = 0
let image: HTMLImageElement | undefined, imageReady = false, loading = false
let intersection: IntersectionObserver | undefined, resize: ResizeObserver | undefined, themeObserver: MutationObserver | undefined
let reduced: MediaQueryList | undefined, forced: MediaQueryList | undefined
const active = () => entries.size > 0 && !document.hidden && !reduced?.matches && !forced?.matches && [...entries.values()].some(e => e.visible)
const ease = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }
const pulse = (t: number, offset: number) => { const age = ((t + offset) % 5.5 + 5.5) % 5.5; return ease(age / .85) * (1 - ease((age - 3.1) / 1.8)) }

function loadImage() {
  if (loading) return
  loading = true
  const token = generation, asset = new Image()
  asset.src = new URL('./featured-card-atlas.webp', import.meta.url).href
  asset.decode().then(() => {
    if (generation !== token) return
    image = asset; imageReady = true; wake()
  }).catch(() => { /* Decoration failure never blocks reading or selecting a room. */ })
}

function measure(entry: Entry) {
  entry.width = entry.card.offsetWidth
  entry.height = entry.card.offsetHeight
  entry.radius = parseFloat(getComputedStyle(entry.card).borderTopLeftRadius) || 14
  entry.path = createRimPath(entry.width, entry.height, entry.radius)
  entry.dpr = Math.min(devicePixelRatio || 1, 2)
  entry.canvas.width = Math.round((entry.width + 6) * entry.dpr)
  entry.canvas.height = Math.round((entry.height + 6) * entry.dpr)
  entry.canvas.style.width = `${entry.width + 6}px`
  entry.canvas.style.height = `${entry.height + 6}px`
}

function paint(entry: Entry) {
  if (!image) return
  const { ctx, width, height, radius, path, dpr } = entry, clock = time + entry.phase
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width + 6, height + 6)
  ctx.translate(3, 3)
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  for (const offset of [0, .53]) paintRimTrail(ctx, path, (clock / 12 + offset) * path.length, 340, theme)
  const ring = new Path2D()
  ring.roundRect(-3, -3, width + 6, height + 6, radius + 3)
  ring.roundRect(3, 3, width - 6, height - 6, Math.max(0, radius - 3))
  ctx.save(); ctx.clip(ring, 'evenodd')
  const tw = image.naturalWidth / 2, th = image.naturalHeight / 2
  ctx.globalAlpha = .3 + .4 * pulse(clock, 0)
  ctx.drawImage(image, 0, 0, tw, th, -22, -30, 160, 160)
  ctx.translate(width, height); ctx.rotate(Math.PI)
  ctx.globalAlpha = .3 + .4 * pulse(clock, 2.5)
  ctx.drawImage(image, 0, 0, tw, th, -22, -30, 160, 160)
  ctx.restore()
}

function syncMotion() {
  for (const entry of entries.values()) entry.card.dataset.featuredMotion = entry.visible && !document.hidden && !reduced?.matches && !forced?.matches ? 'running' : 'paused'
}
function tick(now: number) {
  raf = 0
  if (!active()) { last = 0; return }
  if (!imageReady) { loadImage(); last = 0; return }
  if (last) time += (now - last) / 1000
  last = now
  for (const entry of entries.values()) if (entry.visible) paint(entry)
  raf = requestAnimationFrame(tick)
}
function wake() {
  syncMotion()
  if (!active()) {
    cancelAnimationFrame(raf); raf = 0; last = 0
    if (reduced?.matches || forced?.matches) for (const entry of entries.values()) {
      entry.ctx.setTransform(1, 0, 0, 1, 0, 0)
      entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height)
    }
    return
  }
  if (!raf) { last = 0; raf = requestAnimationFrame(tick) }
}
function startObservers() {
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  forced = matchMedia('(forced-colors: active)')
  reduced.addEventListener('change', wake); forced.addEventListener('change', wake)
  document.addEventListener('visibilitychange', wake)
  intersection = new IntersectionObserver(changes => {
    for (const change of changes) { const entry = entries.get(change.target as HTMLElement); if (entry) entry.visible = change.isIntersecting }
    wake()
  })
  resize = new ResizeObserver(changes => {
    for (const change of changes) { const entry = entries.get(change.target as HTMLElement); if (entry) measure(entry) }
    wake()
  })
  themeObserver = new MutationObserver(wake)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

/** One shared clock and decoded asset, cleaned up when the final featured card unmounts. */
export function registerFeaturedCard(card: HTMLElement) {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  if (!entries.size) startObservers()
  canvas.className = 'featured-card-fx'
  canvas.setAttribute('aria-hidden', 'true')
  card.dataset.featuredMotion = 'paused'
  card.append(canvas)
  const entry: Entry = { card, canvas, ctx, width: 0, height: 0, radius: 14, path: createRimPath(1, 1, 0), visible: false, phase: Math.random() * 12, dpr: 1 }
  entries.set(card, entry)
  measure(entry)
  intersection?.observe(card); resize?.observe(card)
  return () => {
    intersection?.unobserve(card); resize?.unobserve(card)
    entries.delete(card); canvas.remove(); delete card.dataset.featuredMotion
    if (!entries.size) {
      generation++
      cancelAnimationFrame(raf); raf = 0; last = 0; time = 0
      intersection?.disconnect(); resize?.disconnect(); themeObserver?.disconnect()
      reduced?.removeEventListener('change', wake); forced?.removeEventListener('change', wake)
      document.removeEventListener('visibilitychange', wake)
      image = undefined; imageReady = false; loading = false
    } else wake()
  }
}
