import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { INTRO_SESSION_KEY, introRequested, whenHomeReady } from '../../lib/introGate'
import { HOMEJI_MARK_H, HOMEJI_MARK_W, HomejiMark } from './HomejiMark'
import { SLOGAN_BOTTOM, SLOGAN_GLYPHS, SLOGAN_TOP, SLOGAN_WIDTH } from './sloganGlyphs'
import './BrandIntro.css'

const SLOGAN = 'Trọ an tâm · Nâng tầm cuộc sống'
/** Never hold the user longer than this; home shows its own skeleton if still loading. */
const MAX_HOLD_MS = 10000
/** Mask brush width (font units): wide enough to cover a stroke's full thickness from its outline. */
const BRUSH = 150
/** Flat stroke list in writing order: each letter, then its accents as their own short strokes. */
const STROKES = SLOGAN_GLYPHS.flatMap((g, gi) => g.strokes.flatMap((s, si) =>
  // One entry per closed contour, so the pen never teleports between sub-paths mid-stroke.
  s.d.split(/(?=M)/).filter(Boolean).map((d, ci) => ({ d, accent: s.accent, key: `s${gi}-${si}-${ci}`, glyph: gi }))))
/** Visible header logos the intro mark lands on (FLIP target), in priority order. */
const LOGO_TARGETS = ['.hj-logo__mark', '.guest-hero__corner-logo', '.navbar img[src*="homeji-logo"]']

function findLogoTarget(): HTMLElement | null {
  for (const selector of LOGO_TARGETS) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      const r = node.getBoundingClientRect()
      // Header only: never land on a floating widget (e.g. the chat bubble) lower down.
      if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < Math.min(160, window.innerHeight * 0.25)) return node
    }
  }
  return null
}

function warmAssets(): Promise<unknown> {
  // Fonts and the guest hero image download in parallel with the intro; the
  // page itself (data + Maps script) is already mounting underneath.
  const jobs: Promise<unknown>[] = []
  const fonts = document.fonts
  if (fonts?.load) {
    for (const f of ['600 1em "Be Vietnam Pro"', '700 1em "Be Vietnam Pro"', '600 1em Manrope', '400 1em Inter']) {
      jobs.push(fonts.load(f).catch(() => {}))
    }
  }
  for (const src of ['/landing/bloom-hero-bg.jpg', '/brand/homeji-logo2.png']) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    if (img.decode) jobs.push(img.decode().catch(() => {}))
  }
  return Promise.all(jobs)
}

export function BrandIntro() {
  const [active, setActive] = useState(introRequested)
  const root = useRef<HTMLDivElement>(null)
  const skipRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    // React's overlay paints the identical first frame, so drop the static boot layer.
    document.getElementById('hj-boot')?.remove()
    if (!active) delete document.documentElement.dataset.intro
  }, [active])

  useEffect(() => {
    const node = root.current
    if (!active || !node) return
    const assets = warmAssets()
    const q = gsap.utils.selector(node)
    const html = document.documentElement
    const hero = q('.hj-intro__hero')[0] as HTMLElement
    const body = q('.hj-intro__body')[0] as HTMLElement
    const slogan = node.querySelector<SVGSVGElement>('.hj-intro__slogan')!
    const pen = node.querySelector<SVGPathElement>('.hj-intro__tip')!
    const tail = node.querySelector<SVGPathElement>('.hj-intro__tail')!
    const stroke = node.querySelector<SVGPathElement>('.hj-mark__stroke')!
    const fill = node.querySelector<SVGPathElement>('.hj-mark__fill')!
    let hiddenTarget: HTMLElement | null = null
    let finished = false
    let leaving = false

    const finish = () => {
      if (finished) return
      finished = true
      try { sessionStorage.setItem(INTRO_SESSION_KEY, '1') } catch { /* private mode */ }
      if (hiddenTarget) hiddenTarget.style.removeProperty('visibility')
      delete html.dataset.intro
      setActive(false)
    }

    let ctx: gsap.Context | null = null
    let disposed = false
    const build = () => gsap.context(() => {
      // ---- Layout (client px; the overlay is fixed at 0,0).
      const vw = window.innerWidth
      const vh = window.innerHeight
      const size = Math.round(Math.max(104, Math.min(150, Math.min(vw, vh) * 0.2)))
      const k = size / HOMEJI_MARK_W
      // Fit the slogan on one line: start at the design size and shrink to the viewport.
      const fs = Math.min(64, Math.max(22, vw * 0.064), ((vw - 40) * 1000) / SLOGAN_WIDTH)
      const u = fs / 1000 // px per font unit
      const lineW = SLOGAN_WIDTH * u
      const lineH = (SLOGAN_BOTTOM - SLOGAN_TOP) * u
      const gap = Math.max(18, size * 0.2)
      const top = Math.max(24, (vh - (size * HOMEJI_MARK_H / HOMEJI_MARK_W + gap + lineH)) / 2 - vh * 0.03)
      const homeX = (vw - size) / 2
      const homeY = top
      const sloganTop = homeY + size * HOMEJI_MARK_H / HOMEJI_MARK_W + gap
      gsap.set(hero, { x: homeX, y: homeY, width: size, height: size * HOMEJI_MARK_H / HOMEJI_MARK_W, transformOrigin: '50% 100%' })
      gsap.set(slogan, { width: lineW, height: lineH, left: (vw - lineW) / 2, top: sloganTop })
      const sr = { left: (vw - lineW) / 2, top: sloganTop }
      /** Font-unit point → client px. */
      const sp = (x: number, y: number) => ({ x: sr.left + x * u, y: sr.top + (y - SLOGAN_TOP) * u })

      // ---- Pen path through the mark: slow into corners, fast on straights.
      const length = stroke.getTotalLength()
      const markPt = (len: number) => {
        const p = stroke.getPointAtLength(Math.max(0, Math.min(length, len)))
        return { x: homeX + p.x * k, y: homeY + p.y * k }
      }
      // The tip is set directly every frame — locked to the exact point being drawn, no lag.
      // Thread tip: a short tapered ribbon trailing back from the exact ink frontier along the
      // recent path. Width follows direction (downstrokes thick, upstrokes thin). It is rebuilt
      // from the frontier each frame, so it is rigidly attached — no lag, no sway.
      const tipLen = Math.max(18, fs * 0.55)
      const wDown = Math.max(2.4, fs * 0.056)
      const wUp = Math.max(1.1, fs * 0.022)
      let trail: { x: number; y: number }[] = []
      const movePen = (x: number, y: number) => {
        const last = trail[0]
        if (last && Math.hypot(x - last.x, y - last.y) < 0.4) return
        if (last && Math.hypot(x - last.x, y - last.y) > tipLen * 1.5) trail = []
        trail.unshift({ x, y })
        let acc = 0
        for (let n = 1; n < trail.length; n++) {
          acc += Math.hypot(trail[n].x - trail[n - 1].x, trail[n].y - trail[n - 1].y)
          if (acc > tipLen) { trail.length = n + 1; break }
        }
        if (trail.length < 2) { pen.setAttribute('d', ''); return }
        const left: string[] = []
        const right: string[] = []
        let run = 0
        for (let n = 0; n < trail.length; n++) {
          const a = trail[Math.max(0, n - 1)]
          const b = trail[Math.min(trail.length - 1, n + 1)]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dl = Math.hypot(dx, dy) || 1
          if (n > 0) run += Math.hypot(trail[n].x - trail[n - 1].x, trail[n].y - trail[n - 1].y)
          const down = Math.max(0, Math.min(1, 0.5 + 0.5 * (dy / dl))) // moving down the page → thick
          const taper = Math.pow(Math.max(0, 1 - run / tipLen), 0.8)
          const w = (wUp + (wDown - wUp) * down) * taper / 2
          const nx = -dy / dl
          const ny = dx / dl
          left.push(`${(trail[n].x + nx * w).toFixed(2)} ${(trail[n].y + ny * w).toFixed(2)}`)
          right.push(`${(trail[n].x - nx * w).toFixed(2)} ${(trail[n].y - ny * w).toFixed(2)}`)
        }
        pen.setAttribute('d', `M${left.join(' L')} L${right.reverse().join(' L')} Z`)
      }
      gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length, opacity: 1, strokeWidth: 34 })
      gsap.set(fill, { opacity: 0 })
      const brushes = Array.from(node.querySelectorAll<SVGPathElement>('.hj-intro__brush'))
      const lens = brushes.map(b => b.getTotalLength())
      brushes.forEach((b, i) => gsap.set(b, { strokeDasharray: lens[i] + 1, strokeDashoffset: lens[i] + 1 }))
      const first = brushes[0].getPointAtLength(0)
      const start = markPt(0)
      movePen(start.x, start.y)

      // Tail: the thread leaves the mark's foot and swoops into the first letter.
      const sx = homeX + 250 * k
      const sy = homeY + 1048 * k
      const { x: tx, y: ty } = sp(first.x, first.y)
      tail.setAttribute('d', `M${sx} ${sy} C ${sx - fs * 0.9} ${sy + (ty - sy) * 0.9}, ${tx - fs * 1.2} ${ty - fs * 0.5}, ${tx} ${ty}`)
      tail.style.strokeWidth = `${Math.max(2.5, fs * 0.07)}`
      const tailLen = tail.getTotalLength()
      // Hidden until the swoop: a round cap on a zero-length dash would leave a stray dot.
      gsap.set(tail, { strokeDasharray: tailLen, strokeDashoffset: tailLen, opacity: 0 })

      let minDone = false
      let ready = false
      let alive = true
      const tryLeave = () => { if (minDone && ready) leave() }
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          minDone = true
          if (!ready) node.classList.add('hj-intro--waiting')
          tryLeave()
        },
      })

      // 1 — The thread tip fades in as the first stroke starts.
      let t = 0.16
      tl.fromTo(pen, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, t)
        .set(hero, { opacity: 1 }, t)

      // 2–4 — ONE continuous motion: the house outline, the slide to its foot, the swoop down,
      //        then every glyph loop and accent with short lifted glides in between. All of it
      //        is laid out on a single arc-length chain and played at near-constant speed
      //        (mild global ease-in/out only), so the thread never stops mid-writing.
      type Pt = { x: number; y: number }
      /** Exact ink frontier: the same path and the same length that drive the mask reveal. */
      const frontier = (i: number, f: number) => {
        const p = brushes[i].getPointAtLength(lens[i] * f)
        return sp(p.x, p.y)
      }
      type Seg = { dur: number; t0: number; apply: (f: number) => void; done?: () => void }
      const segs: Seg[] = []
      let clock = 0
      const push = (dur: number, apply: (f: number) => void, done?: () => void) => {
        segs.push({ dur, t0: clock, apply, done })
        clock += dur
      }
      const arcLen = (a: Pt, b: Pt, lift: number) => Math.hypot(b.x - a.x, b.y - a.y) + lift * 1.2
      const glide = (a: Pt, b: Pt, speed: number) => {
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        if (dist < 0.5) return
        const lift = Math.min(fs * 0.3, dist * 0.22)
        const mx = (a.x + b.x) / 2
        const my = Math.min(a.y, b.y) - lift
        push(arcLen(a, b, lift) / speed, f => movePen(
          (1 - f) ** 2 * a.x + 2 * (1 - f) * f * mx + f * f * b.x,
          (1 - f) ** 2 * a.y + 2 * (1 - f) * f * my + f * f * b.y))
      }

      // Phase A: house + slide + swoop (~1.5s).
      const from = markPt(length)
      const logoPx = length * k
      const slidePx = Math.hypot(sx - from.x, sy - from.y)
      const tailPx = tailLen
      const speedA = (logoPx + slidePx + tailPx) / 1.5
      push(logoPx / speedA, f => {
        stroke.style.strokeDashoffset = `${length * (1 - f)}`
        const p = markPt(length * f)
        movePen(p.x, p.y)
      })
      const logoEnd = clock
      push(slidePx / speedA, f => movePen(from.x + (sx - from.x) * f, from.y + (sy - from.y) * f))
      const tailStart = clock
      push(tailPx / speedA, f => {
        tail.style.strokeDashoffset = `${tailLen * (1 - f)}`
        const p = tail.getPointAtLength(tailLen * f)
        movePen(p.x, p.y)
      })
      const writeStart = clock

      // Phase B: the slogan (~3s). Glides run 1.4× faster than ink, never stopping.
      let inkPx = 0
      let gl = 0
      let prev: Pt = { x: tx, y: ty }
      brushes.forEach((_, i) => {
        const e = frontier(i, 0)
        const d = Math.hypot(e.x - prev.x, e.y - prev.y)
        if (d >= 0.5) gl += arcLen(prev, e, Math.min(fs * 0.3, d * 0.22)) / 1.4
        inkPx += lens[i] * u
        prev = frontier(i, 1)
      })
      const speedB = (inkPx + gl) / 3.0
      prev = { x: tx, y: ty }
      const accentDone: { i: number; at: number }[] = []
      brushes.forEach((b, i) => {
        glide(prev, frontier(i, 0), speedB * 1.4)
        push((lens[i] * u) / speedB, f => {
          b.style.strokeDashoffset = `${(lens[i] + 1) * (1 - f)}`
          const p = frontier(i, f)
          movePen(p.x, p.y)
        })
        if (STROKES[i].accent) accentDone.push({ i, at: clock })
        prev = frontier(i, 1)
      })
      const CHAIN = clock

      // Near-linear time map: 80% linear + 20% sine ease → speed never drops below ~0.7×.
      const master = { p: 0 }
      let cursor = 0
      tl.to(master, {
        p: 1, duration: CHAIN, ease: 'none',
        onUpdate: () => {
          const x = master.p
          const now = CHAIN * (0.8 * x + 0.2 * (0.5 - 0.5 * Math.cos(Math.PI * x)))
          while (cursor < segs.length - 1 && now >= segs[cursor].t0 + segs[cursor].dur) {
            segs[cursor].apply(1) // finish any segment skipped within a frame
            cursor++
          }
          const sg = segs[cursor]
          sg.apply(Math.max(0, Math.min(1, (now - sg.t0) / sg.dur)))
        },
      }, t)
      // Real-time positions of chain events (inverse of the time map, numerically).
      const realAt = (chainT: number) => {
        let lo = 0, hi = 1
        for (let n = 0; n < 30; n++) {
          const m = (lo + hi) / 2
          const v = CHAIN * (0.8 * m + 0.2 * (0.5 - 0.5 * Math.cos(Math.PI * m)))
          if (v < chainT) lo = m; else hi = m
        }
        return t + lo * CHAIN
      }
      // The ink floods in behind the thread, which thins and then hands over to the fill.
      tl.to(fill, { opacity: 1, duration: 0.45, ease: 'power1.out' }, realAt(logoEnd) - 0.12)
        .to(stroke, { strokeWidth: 18, duration: 0.45, ease: 'power1.out' }, realAt(logoEnd) - 0.12)
        .set(tail, { opacity: 1 }, realAt(tailStart))
        .to(tail, { opacity: 0, duration: 0.45, ease: 'power1.out' }, realAt(writeStart) + 0.25)
        .to(stroke, { opacity: 0, duration: 0.4 }, realAt(writeStart) + 0.1)
      accentDone.forEach(({ i, at }) => {
        tl.fromTo(brushes[i].parentElement!.nextElementSibling!, { scale: 1.2, transformOrigin: '50% 50%' },
          { scale: 1, duration: 0.45, ease: 'back.out(2.5)' }, realAt(at) - 0.05)
      })
      t += CHAIN

      tl.to(pen, { opacity: 0, duration: 0.22, ease: 'power2.in' }, t)

      // 6 — Squash-and-stretch bounce: the house is alive.
      tl.to(body, { scaleY: 0.84, scaleX: 1.1, duration: 0.14, ease: 'power2.in', transformOrigin: '50% 100%' }, t)
        .to(body, { scaleY: 1.07, scaleX: 0.95, duration: 0.16, ease: 'power2.out' }, t + 0.14)
        .to(hero, { y: homeY - size * 0.14, duration: 0.16, ease: 'power2.out' }, t + 0.14)
        .to(hero, { y: homeY, duration: 0.16, ease: 'power2.in' }, t + 0.3)
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1, 0.45)' }, t + 0.46)

      const leave = () => {
        if (leaving) return
        leaving = true
        tl.progress(1)
        gsap.set(body, { scaleX: 1, scaleY: 1 })
        gsap.set(pen, { opacity: 0 })
        const target = findLogoTarget()
        const out = gsap.timeline({ onComplete: finish, defaults: { ease: 'power3.inOut' } })
        out.to(q('.hj-intro__status, .hj-intro__skip'), { opacity: 0, duration: 0.2 }, 0)
          .to(slogan, { opacity: 0, y: -14, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 0)
        if (target) {
          // 7 — FLIP: the mark flies onto the real header logo and hands the pixel over.
          const a = hero.getBoundingClientRect()
          const b = target.getBoundingClientRect()
          const cur = { x: Number(gsap.getProperty(hero, 'x')), y: Number(gsap.getProperty(hero, 'y')), s: Number(gsap.getProperty(hero, 'scale')) }
          const scale = cur.s * Math.min(b.width / a.width, b.height / a.height)
          hiddenTarget = target
          target.style.visibility = 'hidden'
          // Origin is 50% 100%: solve x/y so the scaled box lands exactly on the target box.
          const x = cur.x + (b.left + b.width / 2) - (a.left + a.width / 2)
          const y = cur.y + b.bottom - a.bottom
          out.to(hero, { x, y, scale, duration: 0.62, ease: 'power3.inOut' }, 0.08)
            .to(q('.hj-intro__backdrop'), { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, 0.24)
            .add(() => target.style.removeProperty('visibility'))
            .to(hero, { opacity: 0, duration: 0.08 })
        } else {
          out.to(hero, { scale: 0.2, opacity: 0, duration: 0.45 }, 0.1)
            .to(q('.hj-intro__backdrop'), { opacity: 0, duration: 0.5 }, 0.2)
        }
      }

      skipRef.current = () => { if (!leaving) leave() }

      const maxTimer = window.setTimeout(() => leave(), MAX_HOLD_MS)
      const stopReady = whenHomeReady(() => {
        void assets.then(() => { if (!alive) return; ready = true; tryLeave() })
      })
      return () => { alive = false; window.clearTimeout(maxTimer); stopReady() }
    }, node)
    // Outlines are inline vectors — no web-font wait needed; start on the next frame.
    const raf = requestAnimationFrame(() => { if (!disposed) ctx = build() })

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skipRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      disposed = true
      cancelAnimationFrame(raf)
      ctx?.revert()
      if (hiddenTarget) hiddenTarget.style.removeProperty('visibility')
    }
  }, [active])

  if (!active) return null

  return createPortal(
    <div ref={root} className="hj-intro" role="dialog" aria-modal="true" aria-label="Homeji — giới thiệu">
      <div className="hj-intro__backdrop" />
      <svg className="hj-intro__ink" aria-hidden="true">
        <path className="hj-intro__tail" fill="none" stroke="#00b14f" strokeLinecap="round" />
        <path className="hj-intro__tip" />
      </svg>
      <div className="hj-intro__hero">
        <div className="hj-intro__body"><HomejiMark className="hj-intro__mark" /></div>
      </div>
      <svg className="hj-intro__slogan" role="img" aria-label={SLOGAN}
        viewBox={`0 ${SLOGAN_TOP} ${SLOGAN_WIDTH} ${SLOGAN_BOTTOM - SLOGAN_TOP}`}>
        {STROKES.map(s => (
          <g key={s.key}>
            <mask id={`hj-${s.key}`} maskUnits="userSpaceOnUse" x={-300} y={SLOGAN_TOP - 300}
              width={SLOGAN_WIDTH + 600} height={SLOGAN_BOTTOM - SLOGAN_TOP + 600}>
              <path className="hj-intro__brush" d={s.d} fill="none" stroke="#fff" strokeWidth={BRUSH}
                strokeLinecap="butt" strokeLinejoin="round" />
            </mask>
            <path className="hj-intro__ink-glyph" d={s.d} mask={`url(#hj-${s.key})`} />
          </g>
        ))}
      </svg>
      <p className="hj-intro__status" role="status">
        <span className="hj-intro__bar" aria-hidden="true" />
        Đang chuẩn bị trang chủ…
      </p>
      <button type="button" className="hj-intro__skip" onClick={() => skipRef.current()}>
        Bỏ qua
      </button>
    </div>,
    document.body,
  )
}
