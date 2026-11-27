import { roundedBorderPoint } from './borderPoints'

type Theme = 'light' | 'dark'
type Point = { x: number; y: number; size: number; variant: number; orientation: number; start: number; duration: number }
type Entry = {
  host: HTMLElement; parent: HTMLElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D
  kind: 'cluster' | 'label'; visible: boolean; width: number; height: number; radius: number; diameter: number
  next: number; phase: number; points: Point[]
}
const urls = import.meta.glob<string>('./assets/*.webp', { eager: true, query: '?url', import: 'default' })
const entries = new Map<HTMLElement, Entry>()
const images = new Map<Theme, HTMLImageElement[]>()
const loading = new Map<Theme, Promise<void>>()
let raf = 0, last = 0, time = 0, generation = 0
let intersection: IntersectionObserver | undefined, resize: ResizeObserver | undefined, themeObserver: MutationObserver | undefined
let reduced: MediaQueryList | undefined, forced: MediaQueryList | undefined
const between = (min: number, max: number) => min + Math.random() * (max - min)
const theme = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
const active = () => entries.size > 0 && !document.hidden && !reduced?.matches && !forced?.matches && [...entries.values()].some(e => e.visible)

function loadAssets(selected: Theme) {
  if (loading.has(selected)) return
  const token = generation
  const batch = Array.from({ length: 5 }, (_, i) => {
    const image = new Image()
    image.src = urls[`./assets/jewel-rays-${selected === 'light' ? 'light-' : ''}${i}.webp`]
    return image
  })
  loading.set(selected, Promise.all(batch.map(image => image.decode())).then(() => {
    if (generation !== token) return
    images.set(selected, batch)
    wake()
  }).catch(() => { /* A failed decorative asset never blocks the marker. */ }))
}

function measure(entry: Entry) {
  entry.width = entry.parent.offsetWidth
  entry.height = entry.parent.offsetHeight
  entry.radius = parseFloat(getComputedStyle(entry.parent).borderTopLeftRadius) || 0
  entry.diameter = entry.parent.closest('.map-pin-cluster__lift')?.querySelector<HTMLElement>('.map-pin-cluster__bubble')?.offsetWidth || entry.width
  entry.points = []
  entry.next = 0
}

function spawn(entry: Entry, now: number) {
  const count = entry.kind === 'cluster' ? Math.floor(between(1, 3)) : 1
  const variants = [0, 1, 2, 3, 4]
  for (let j = 4; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1))
    ;[variants[j], variants[k]] = [variants[k], variants[j]]
  }
  let finish = now
  const points = Array.from({ length: count }, (_, i) => {
    // 4.5x was approved in the preview. Ray length is already reduced in the asset.
    const size = entry.diameter * .2 * 4.5 * (entry.kind === 'label' ? .7 : 1)
    const delay = between(0, .22), duration = between(4, 6)
    let x: number, y: number
    if (entry.kind === 'cluster') {
      const angle = (i + between(.05, .9)) / count * Math.PI * 2, radius = entry.width / 2 + 1
      x = 96 + Math.cos(angle) * radius
      y = 96 + Math.sin(angle) * radius
    } else {
      const p = roundedBorderPoint(entry.width - 1, entry.height - 1, Math.max(0, entry.radius - .5), (i + Math.random()) / count)
      x = 96 + p.x
      y = 96 + p.y
    }
    finish = Math.max(finish, now + delay + duration)
    return { x, y, size, variant: variants[i], orientation: Math.random() * Math.PI * 2, start: now + delay, duration }
  })
  entry.next = Math.max(now + .8, finish - 2.2)
  return points
}

function paint(entry: Entry, batch: HTMLImageElement[]) {
  const clock = time + entry.phase, ctx = entry.ctx
  entry.points = entry.points.filter(p => clock < p.start + p.duration)
  if (clock >= entry.next) entry.points.push(...spawn(entry, clock))
  ctx.clearRect(0, 0, 192, 192)
  for (const p of entry.points) {
    const local = (clock - p.start) / p.duration
    if (local < 0 || local >= 1) continue
    const frame = Math.min(359, Math.floor(local * 360)), image = batch[p.variant], tile = image.naturalWidth / 20
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.orientation)
    ctx.drawImage(image, frame % 20 * tile, Math.floor(frame / 20) * tile, tile, tile, -p.size / 2, -p.size / 2, p.size, p.size)
    ctx.restore()
  }
}

function tick(now: number) {
  raf = 0
  if (!active()) { last = 0; return }
  if (last) time += (now - last) / 1000
  last = now
  const selected = theme(), batch = images.get(selected)
  if (!batch) { loadAssets(selected); last = 0; return }
  for (const entry of entries.values()) if (entry.visible) paint(entry, batch)
  raf = requestAnimationFrame(tick)
}
function wake() {
  if (!active()) {
    cancelAnimationFrame(raf); raf = 0; last = 0
    if (reduced?.matches || forced?.matches) for (const e of entries.values()) e.ctx.clearRect(0, 0, 192, 192)
    return
  }
  if (!raf) { last = 0; raf = requestAnimationFrame(tick) }
}
function startObservers() {
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  forced = matchMedia('(forced-colors: active)')
  reduced.addEventListener('change', wake)
  forced.addEventListener('change', wake)
  document.addEventListener('visibilitychange', wake)
  intersection = new IntersectionObserver(changes => {
    for (const change of changes) { const e = entries.get(change.target as HTMLElement); if (e) e.visible = change.isIntersecting }
    wake()
  })
  resize = new ResizeObserver(changes => {
    for (const change of changes) for (const e of entries.values()) if (e.parent === change.target) measure(e)
    wake()
  })
  themeObserver = new MutationObserver(() => { for (const e of entries.values()) e.ctx.clearRect(0, 0, 192, 192); wake() })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

/** All connected markers share one frame loop, decoded atlas set and observers. */
export function registerMapPremiumEffect(host: HTMLElement, kind: 'cluster' | 'label') {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')
  if (!ctx || !host.parentElement) return () => {}
  if (!entries.size) startObservers()
  canvas.width = canvas.height = 384
  canvas.setAttribute('aria-hidden', 'true')
  ctx.setTransform(2, 0, 0, 2, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  host.append(canvas)
  const entry: Entry = { host, parent: host.parentElement, canvas, ctx, kind, visible: false, width: 0, height: 0, radius: 0, diameter: 0, next: 0, phase: Math.random() * 8, points: [] }
  entries.set(host, entry)
  measure(entry)
  intersection?.observe(host)
  resize?.observe(entry.parent)
  return () => {
    intersection?.unobserve(host)
    resize?.unobserve(entry.parent)
    canvas.remove()
    entries.delete(host)
    if (!entries.size) {
      generation++
      cancelAnimationFrame(raf); raf = 0; last = 0; time = 0
      intersection?.disconnect(); resize?.disconnect(); themeObserver?.disconnect()
      reduced?.removeEventListener('change', wake); forced?.removeEventListener('change', wake)
      document.removeEventListener('visibilitychange', wake)
      images.clear(); loading.clear()
    } else wake()
  }
}


