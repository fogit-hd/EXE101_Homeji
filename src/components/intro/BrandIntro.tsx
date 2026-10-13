import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { INTRO_SESSION_KEY, introRequested, whenHomeReady } from '../../lib/introGate'
import { HomejiMark } from './HomejiMark'
import './BrandIntro.css'

const SLOGAN = 'Trọ an tâm · Nâng tầm cuộc sống'
/** Never hold the user longer than this; home shows its own skeleton if still loading. */
const MAX_HOLD_MS = 7000
/** Visible header logos the intro mark lands on (FLIP target), in priority order. */
const LOGO_TARGETS = ['.hj-logo__mark', '.guest-hero__corner-logo', '.navbar img[src*="homeji-logo"]']

type Word = { key: string; graphemes: string[]; accent: boolean }
type Phrase = { key: string; words: Word[] }

/**
 * Split into phrases → words → grapheme clusters (Intl.Segmenter), so Vietnamese
 * stacked diacritics (ộ, ầ, ố) never break apart and phrases wrap as whole units.
 */
function splitSlogan(text: string): Phrase[] {
  const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('vi', { granularity: 'grapheme' })
    : null
  const graphemes = (word: string) => seg
    ? Array.from(seg.segment(word.normalize('NFC')), s => s.segment)
    : Array.from(word.normalize('NFC'))
  const parts = text.split(' · ')
  return parts.map((phrase, p) => ({
    key: `p${p}`,
    words: [
      ...phrase.split(' ').map((word, i) => ({ key: `${p}-${i}`, accent: false, graphemes: graphemes(word) })),
      ...(p < parts.length - 1 ? [{ key: `${p}-dot`, accent: true, graphemes: ['·'] }] : []),
    ],
  }))
}

function findLogoTarget(): HTMLElement | null {
  for (const selector of LOGO_TARGETS) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      const r = node.getBoundingClientRect()
      if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight) return node
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
  const phrases = useMemo(() => splitSlogan(SLOGAN), [])

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
    const stage = q('.hj-intro__stage')[0] as HTMLElement
    const hero = q('.hj-intro__hero')[0] as HTMLElement
    const body = q('.hj-intro__body')[0] as HTMLElement
    const stroke = node.querySelector<SVGPathElement>('.hj-mark__stroke')!
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

    // Measure only once the slogan face is in: a late font swap re-wraps the text on
    // mobile and would aim the light beam at stale line positions.
    let ctx: gsap.Context | null = null
    let disposed = false
    const fontGate = Promise.race([
      document.fonts?.load ? document.fonts.load('700 1em "Be Vietnam Pro"').catch(() => {}) : Promise.resolve(),
      new Promise(resolve => window.setTimeout(resolve, 700)),
    ])
    const build = () => gsap.context(() => {
      // ---- Layout in stage space (works for one-line desktop and two-line mobile).
      const stageBox = stage.getBoundingClientRect()
      const size = hero.offsetWidth
      const k = size / 1256
      const homeX = stageBox.width / 2 - size / 2
      const sloganTop = (q('.hj-intro__slogan')[0] as HTMLElement).offsetTop
      const homeY = sloganTop - size - 36
      const length = stroke.getTotalLength()
      const dot = q('.hj-intro__dot')[0] as HTMLElement
      const chars = q('.hj-intro__char') as HTMLElement[]
      const conePoly = node.querySelector<SVGPolygonElement>('.hj-intro__cone-shape')!
      const spot = q('.hj-intro__spot')[0] as HTMLElement
      /** Light source: the doorway inside the house mark (mark units 784,880). */
      const door = { x: homeX + 784 * k, y: homeY + 880 * k }

      // Group graphemes into visual lines so the beam sweeps each wrapped line in turn.
      type Glyph = { el: HTMLElement; cx: number; lit: boolean }
      type Line = { top: number; bottom: number; left: number; right: number; glyphs: Glyph[] }
      const lines: Line[] = []
      for (const el of chars) {
        const r = el.getBoundingClientRect()
        const top = r.top - stageBox.top
        let line = lines.find(l => Math.abs(l.top - top) < r.height / 2)
        if (!line) { line = { top, bottom: top + r.height, left: Infinity, right: -Infinity, glyphs: [] }; lines.push(line) }
        line.left = Math.min(line.left, r.left - stageBox.left)
        line.right = Math.max(line.right, r.right - stageBox.left)
        line.glyphs.push({ el, cx: r.left - stageBox.left + r.width / 2, lit: false })
      }
      lines.sort((l1, l2) => l1.top - l2.top)

      gsap.set(hero, { x: homeX, y: homeY, transformOrigin: '50% 100%' })
      gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 })
      gsap.set(q('.hj-mark__fill, .hj-mark__glow, .hj-intro__halo, .hj-intro__cone, .hj-intro__spot'), { opacity: 0 })
      gsap.set(q('.hj-intro__halo'), { left: homeX + size / 2, top: homeY + size * 0.56, scale: 0.6 })
      gsap.set(dot, { left: homeX + 184 * k, top: homeY + 396 * k })
      gsap.set(q('.hj-intro__ring'), { left: homeX + 184 * k, top: homeY + 396 * k, scale: 0.2, opacity: 0 })

      const lightGlyph = (g: Glyph) => {
        if (g.lit) return
        g.lit = true
        g.el.classList.add('is-lit')
        gsap.fromTo(g.el, { y: 2 }, { y: 0, duration: 0.5, ease: 'back.out(3)' })
      }
      /** Aim the cone from the doorway to a pool of light centred at x on a text line. */
      const aim = (line: Line, x: number, spread: number) => {
        const yb = line.bottom + 6
        conePoly.setAttribute('points', `${door.x - 16},${door.y} ${door.x + 16},${door.y} ${x + spread},${yb} ${x - spread},${yb}`)
        gsap.set(spot, { left: x, top: (line.top + line.bottom) / 2, width: spread * 2.4, height: (line.bottom - line.top) * 1.8 })
        for (const g of line.glyphs) if (g.cx <= x + spread * 0.35) lightGlyph(g)
      }

      let minDone = false
      let ready = false
      let alive = true
      const tryLeave = () => { if (minDone && ready) leave() }
      // The hand-off waits for the whole performance (and the data), never cuts it mid-sweep.
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          minDone = true
          if (!ready) node.classList.add('hj-intro--waiting')
          tryLeave()
        },
      })
      // 1 — Dusk settles in while the green pin drops and pings.
      tl.to(q('.hj-intro__dusk'), { opacity: 1, duration: 0.9, ease: 'sine.inOut' }, 0)
        .to(q('.hj-intro__slogan'), { opacity: 1, duration: 0.8, ease: 'sine.inOut' }, 0.3)
        .fromTo(dot, { scale: 0, yPercent: -260 }, { scale: 1, yPercent: 0, duration: 0.32, ease: 'back.out(2.6)' }, 0.05)
        .to(q('.hj-intro__ring'), {
          keyframes: [{ opacity: 0.5, duration: 0.05 }, { opacity: 0, duration: 0.7 }],
          scale: 2.2, duration: 0.75, ease: 'power2.out', stagger: 0.16,
        }, 0.27)
      // 2 — The pin becomes the pen and traces the house; it stays hollow, lights off.
        .set(hero, { opacity: 1 }, 0.46)
        .to(dot, { scale: 0.55, duration: 0.16, ease: 'power2.out' }, 0.46)
        .to(stroke, {
          strokeDashoffset: 0, duration: 0.85, ease: 'power1.inOut',
          onUpdate: () => {
            const at = length - Number(gsap.getProperty(stroke, 'strokeDashoffset'))
            const pt = stroke.getPointAtLength(Math.max(0, Math.min(length, at)))
            gsap.set(dot, { left: homeX + pt.x * k, top: homeY + pt.y * k })
          },
        }, 0.46)
        .to(dot, { scale: 0, duration: 0.18, ease: 'power2.in' }, 1.25)
      // 3 — Lights on: a switch flicker, then a warm gold-to-green glow and a happy little hop.
        .addLabel('lights', 1.42)
        .to(q('.hj-mark__glow'), {
          keyframes: [
            { opacity: 0.9, duration: 0.05 }, { opacity: 0.08, duration: 0.07 },
            { opacity: 0.75, duration: 0.05 }, { opacity: 0.15, duration: 0.11 },
            { opacity: 1, duration: 0.12 },
          ], ease: 'none',
        }, 'lights')
        .to(q('.hj-intro__halo'), { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 'lights+=0.36')
        .to(body, { keyframes: { scaleY: [1, 0.86, 1.08, 0.97, 1], scaleX: [1, 1.1, 0.95, 1.02, 1] }, duration: 0.5, ease: 'none', transformOrigin: '50% 100%' }, 'lights+=0.36')
        .to(hero, { keyframes: [{ y: homeY - 16, duration: 0.17, ease: 'power2.out' }, { y: homeY, duration: 0.17, ease: 'power2.in' }] }, 'lights+=0.42')
        .addLabel('beam', 'lights+=0.6')
        .to(q('.hj-intro__cone, .hj-intro__spot'), { opacity: 1, duration: 0.25, ease: 'power1.out' }, 'beam')

      // 4 — The beam sweeps each line left→right; whatever it touches lights up and stays lit.
      const sweepTotal = 1.25
      const widthSum = lines.reduce((sum, l) => sum + (l.right - l.left), 0) || 1
      let at = 0
      lines.forEach((line, i) => {
        const span = line.right - line.left
        const dur = Math.max(0.45, sweepTotal * (span / widthSum))
        const spread = Math.max(48, Math.min(88, span * 0.13))
        const beamX = { x: line.left - spread }
        tl.to(beamX, {
          x: line.right + spread * 0.6, duration: dur, ease: i === lines.length - 1 ? 'sine.inOut' : 'sine.in',
          onUpdate: () => aim(line, beamX.x, spread),
          onStart: () => aim(line, beamX.x, spread),
        }, `beam+=${at}`)
        at += dur + 0.04
      })
      tl.add(() => lines.forEach(l => l.glyphs.forEach(lightGlyph)), `beam+=${at}`)
        .to(q('.hj-intro__cone, .hj-intro__spot'), { opacity: 0, duration: 0.3, ease: 'power1.in' }, `beam+=${at - 0.1}`)
      // 5 — Dawn: the dusk lifts back to white, the ink floods in so the mark matches the header logo.
        .addLabel('dawn', `beam+=${at + 0.05}`)
        .to(q('.hj-intro__dusk'), { opacity: 0, duration: 0.6, ease: 'sine.inOut' }, 'dawn')
        .to(q('.hj-mark__fill'), { opacity: 1, duration: 0.45, ease: 'power1.out' }, 'dawn+=0.1')
        .to(q('.hj-mark__glow, .hj-intro__halo'), { opacity: 0, duration: 0.5 }, 'dawn+=0.15')
        .to(stroke, { opacity: 0, duration: 0.3 }, 'dawn+=0.2')

      const leave = () => {
        if (leaving) return
        leaving = true
        tl.progress(1)
        gsap.set(body, { scaleX: 1, scaleY: 1, rotate: 0 })
        const target = findLogoTarget()
        const out = gsap.timeline({ onComplete: finish, defaults: { ease: 'power3.inOut' } })
        out.to(q('.hj-intro__status, .hj-intro__skip'), { opacity: 0, duration: 0.2 }, 0)
          .to(q('.hj-intro__slogan'), { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, 0.05)
        if (target) {
          // 6 — FLIP: a little crouch, then it jumps onto the real header logo and hands the pixel over.
          const a = hero.getBoundingClientRect()
          const b = target.getBoundingClientRect()
          const cur = { x: Number(gsap.getProperty(hero, 'x')), y: Number(gsap.getProperty(hero, 'y')), s: Number(gsap.getProperty(hero, 'scale')) }
          const scale = cur.s * Math.min(b.width / a.width, b.height / a.height)
          hiddenTarget = target
          target.style.visibility = 'hidden'
          // With origin 50% 100%, solve x/y so the scaled box lands exactly on the target box.
          const x = cur.x + (b.left + b.width / 2) - (a.left + a.width / 2)
          const y = cur.y + b.bottom - a.bottom
          out.to(body, { keyframes: { scaleY: [1, 0.82, 1.08, 1], scaleX: [1, 1.12, 0.94, 1] }, duration: 0.3, ease: 'none' }, 0)
            .to(hero, { x, duration: 0.6, ease: 'power2.inOut' }, 0.16)
            .to(hero, { scale, duration: 0.6, ease: 'power2.inOut' }, 0.16)
            .to(hero, { keyframes: [{ y: Math.min(cur.y, y) - 50, duration: 0.26, ease: 'power2.out' }, { y, duration: 0.34, ease: 'power2.in' }] }, 0.16)
            .to(q('.hj-intro__backdrop'), { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 0.3)
            .add(() => target.style.removeProperty('visibility'))
            .to(hero, { opacity: 0, duration: 0.1 })
        } else {
          out.to(hero, { scale: 0.2, opacity: 0, duration: 0.45 }, 0.1)
            .to(q('.hj-intro__backdrop'), { opacity: 0, duration: 0.55 }, 0.2)
        }
      }

      skipRef.current = () => { if (!leaving) leave() }

      const maxTimer = window.setTimeout(() => leave(), MAX_HOLD_MS)
      const stopReady = whenHomeReady(() => {
        void assets.then(() => { if (!alive) return; ready = true; tryLeave() })
      })
      return () => { alive = false; window.clearTimeout(maxTimer); stopReady() }
    }, node)
    void fontGate.then(() => { if (!disposed) ctx = build() })

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skipRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      disposed = true
      ctx?.revert()
      if (hiddenTarget) hiddenTarget.style.removeProperty('visibility')
    }
  }, [active])

  if (!active) return null

  return createPortal(
    <div ref={root} className="hj-intro" role="dialog" aria-modal="true" aria-label="Homeji — giới thiệu">
      <div className="hj-intro__backdrop">
        <div className="hj-intro__dusk" />
      </div>
      <div className="hj-intro__stage">
        <span className="hj-intro__halo" aria-hidden="true" />
        <svg className="hj-intro__cone" aria-hidden="true">
          <defs>
            <linearGradient id="hj-cone-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe3a3" stopOpacity="0.95" />
              <stop offset="0.55" stopColor="#ffd27a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff0c8" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <polygon className="hj-intro__cone-shape" points="0,0 0,0 0,0" fill="url(#hj-cone-grad)" />
        </svg>
        <span className="hj-intro__spot" aria-hidden="true" />
        <span className="hj-intro__ring" aria-hidden="true" />
        <span className="hj-intro__ring" aria-hidden="true" />
        <span className="hj-intro__dot" aria-hidden="true" />
        <div className="hj-intro__hero">
          <div className="hj-intro__body"><HomejiMark className="hj-intro__mark" /></div>
        </div>
        <p className="hj-intro__slogan" aria-label={SLOGAN}>
          {phrases.map((phrase) => (
            <span key={phrase.key} className="hj-intro__phrase" aria-hidden="true">
              {phrase.words.map((word) => (
                <span key={word.key} className={word.accent ? 'hj-intro__word hj-intro__accent' : 'hj-intro__word'}>
                  {word.graphemes.map((g, i) => <span key={i} className="hj-intro__char">{g}</span>)}
                </span>
              ))}
            </span>
          ))}
        </p>
        <p className="hj-intro__status" role="status">
          <span className="hj-intro__bar" aria-hidden="true" />
          Đang chuẩn bị trang chủ…
        </p>
      </div>
      <button type="button" className="hj-intro__skip" onClick={() => skipRef.current()}>
        Bỏ qua
      </button>
    </div>,
    document.body,
  )
}
