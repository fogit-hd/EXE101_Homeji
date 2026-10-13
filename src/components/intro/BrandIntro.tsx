import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { INTRO_SESSION_KEY, introRequested, whenHomeReady } from '../../lib/introGate'
import { HOMEJI_MARK_H, HOMEJI_MARK_PATH, HOMEJI_MARK_W, HomejiMark } from './HomejiMark'
import { SLOGAN_BOTTOM, SLOGAN_GLYPHS, SLOGAN_TOP, SLOGAN_WIDTH } from './sloganGlyphs'
import './BrandIntro.css'

const SLOGAN = 'Trọ an tâm · Nâng tầm cuộc sống'
/** Never hold the user longer than this; home shows its own skeleton if still loading. */
const MAX_HOLD_MS = 7000
/** Mask brush width (font units): wide enough to cover a stroke's full thickness from its outline. */
const BRUSH = 150
/** Flat stroke list in writing order: each letter, then its accents as their own short strokes. */
const STROKES = SLOGAN_GLYPHS.flatMap((g, gi) => g.strokes.map((s, si) => ({ ...s, key: `s${gi}-${si}`, glyph: gi })))
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

/** Cumulative path length at every command end — the pen eases into each corner. */
function cornerLengths(path: string): number[] {
  const cmds = path.match(/[MLCZ][^MLCZ]*/g) ?? []
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const out = [0]
  for (let i = 2; i <= cmds.length; i++) {
    probe.setAttribute('d', cmds.slice(0, i).join(''))
    out.push(probe.getTotalLength())
  }
  return out
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
    const pen = q('.hj-intro__pen')[0] as HTMLElement
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
      gsap.set(slogan, { attr: { width: lineW, height: lineH }, left: (vw - lineW) / 2, top: sloganTop })
      const sr = { left: (vw - lineW) / 2, top: sloganTop }
      /** Font-unit point → client px. */
      const sp = (x: number, y: number) => ({ x: sr.left + x * u, y: sr.top + (y - SLOGAN_TOP) * u })

      // ---- Pen path through the mark: slow into corners, fast on straights.
      const length = stroke.getTotalLength()
      const corners = cornerLengths(HOMEJI_MARK_PATH)
      const markPt = (len: number) => {
        const p = stroke.getPointAtLength(Math.max(0, Math.min(length, len)))
        return { x: homeX + p.x * k, y: homeY + p.y * k }
      }
      const movePen = (x: number, y: number) => gsap.set(pen, { x, y })

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

      // 1 — The pen tip appears with a soft pop.
      tl.fromTo(pen, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(3)' }, 0)
        .set(hero, { opacity: 1 }, 0.16)

      // 2 — One continuous line draws the house; each segment eases so the pen
      //     decelerates into corners like a hand would.
      const DRAW = 1.2
      let t = 0.18
      const st = { len: 0 }
      for (let i = 1; i < corners.length; i++) {
        const d = Math.max(0.045, ((corners[i] - corners[i - 1]) / length) * DRAW)
        tl.to(st, {
          len: corners[i], duration: d, ease: 'sine.inOut',
          onUpdate: () => {
            stroke.style.strokeDashoffset = `${length - st.len}`
            const p = markPt(st.len)
            movePen(p.x, p.y)
          },
        }, t)
        t += d
      }
      // The ink floods in behind the thread, which thins and then hands over to the fill.
      tl.to(fill, { opacity: 1, duration: 0.45, ease: 'power1.out' }, t - 0.12)
        .to(stroke, { strokeWidth: 18, duration: 0.45, ease: 'power1.out' }, t - 0.12)

      // 3 — Without lifting, the pen slides to the mark's foot and swoops down to the text.
      tl.to(pen, { x: sx, y: sy, duration: 0.14, ease: 'power1.inOut' }, t)
      t += 0.14
      const tw = { v: 0 }
      tl.set(tail, { opacity: 1 }, t)
        .to(tw, {
        v: 1, duration: 0.3, ease: 'sine.in',
        onUpdate: () => {
          tail.style.strokeDashoffset = `${tailLen * (1 - tw.v)}`
          const p = tail.getPointAtLength(tailLen * tw.v)
          movePen(p.x, p.y)
        },
      }, t)
      t += 0.3

      // 4 — Handwriting: every letter is laid down along its own outline in pen order, the tip
      //     riding the live drawing point; accents follow their letter as short separate strokes.
      tl.to(tail, { opacity: 0, duration: 0.45, ease: 'power1.out' }, t + 0.25)
        .to(stroke, { opacity: 0, duration: 0.4 }, t + 0.1)
      const WRITE = 1.45
      const LIFT = 0.035 // pen-lift hop between strokes
      const weight = lens.map(l => Math.sqrt(l))
      const wsum = weight.reduce((a, b) => a + b, 0)
      const drawTotal = WRITE - LIFT * (brushes.length - 1)
      brushes.forEach((b, i) => {
        const d = (weight[i] / wsum) * drawTotal
        const accent = STROKES[i].accent
        const o = { v: 0 }
        if (i > 0) {
          const p0 = b.getPointAtLength(0)
          const c = sp(p0.x, p0.y)
          tl.to(pen, { x: c.x, y: c.y, duration: LIFT, ease: 'sine.inOut' }, t)
          t += LIFT
        }
        tl.to(o, {
          v: 1, duration: d, ease: accent ? 'power2.out' : 'sine.inOut',
          onUpdate: () => {
            b.style.strokeDashoffset = `${(lens[i] + 1) * (1 - o.v)}`
            const p = b.getPointAtLength(lens[i] * o.v)
            const c = sp(p.x, p.y)
            movePen(c.x, c.y)
          },
        }, t)
        if (accent) {
          // A flicked mark: tiny overshoot as the pen snaps it on.
          tl.fromTo(b.parentElement!.nextElementSibling!, { scale: 1.25, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, t)
        }
        t += d
      })

      tl.to(pen, { scale: 0, opacity: 0, duration: 0.22, ease: 'power2.in' }, t)

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
        gsap.set(q('.hj-intro__pen'), { opacity: 0 })
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
      <span className="hj-intro__pen" aria-hidden="true" />
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
