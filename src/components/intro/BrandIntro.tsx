import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { INTRO_SESSION_KEY, introRequested, whenHomeReady } from '../../lib/introGate'
import { HomejiMark } from './HomejiMark'
import './BrandIntro.css'

const SLOGAN = 'Trọ an tâm · Nâng tầm cuộc sống'
/** Never hold the user longer than this; home shows its own skeleton if still loading. */
const MAX_HOLD_MS = 7000
/** Logo size while it is the hopping character, relative to its drawn size. */
const HOP_SCALE = 0.42
/** Visible header logos the intro mark lands on (FLIP target), in priority order. */
const LOGO_TARGETS = ['.hj-logo__mark', '.guest-hero__corner-logo', '.navbar img[src*="homeji-logo"]']
const SPARK_COLORS = ['#00b14f', '#2fd27a', '#9be7bd', '#18343f']

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

/** A little dust/spark burst where the character lands; nodes remove themselves. */
function burst(stage: HTMLElement, x: number, y: number, count = 9) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    s.className = 'hj-intro__spark'
    s.style.background = SPARK_COLORS[i % SPARK_COLORS.length]
    stage.appendChild(s)
    const angle = Math.PI + (Math.PI * (i + 0.5)) / count + gsap.utils.random(-0.15, 0.15)
    const dist = gsap.utils.random(22, 46)
    gsap.fromTo(s, { x, y, scale: gsap.utils.random(0.6, 1.1), opacity: 1 }, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist * 0.7,
      scale: 0, opacity: 0, duration: gsap.utils.random(0.36, 0.52), ease: 'power2.out',
      onComplete: () => s.remove(),
    })
  }
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
    // mobile and would send the hopping logo to stale word positions.
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
      const words = q('.hj-intro__word') as HTMLElement[]
      const homeX = stageBox.width / 2 - size / 2
      const sloganTop = (q('.hj-intro__slogan')[0] as HTMLElement).offsetTop
      const homeY = sloganTop - size - 28
      /** Character mode: scaled from the bottom centre, so (x,y) = where its feet touch. */
      const feet = (w: HTMLElement) => {
        const r = w.getBoundingClientRect()
        return { x: r.left - stageBox.left + r.width / 2 - size / 2, y: r.top - stageBox.top - size + 6 }
      }
      const length = stroke.getTotalLength()
      const dot = q('.hj-intro__dot')[0] as HTMLElement

      gsap.set(hero, { x: homeX, y: homeY, transformOrigin: '50% 100%' })
      gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 })
      gsap.set(q('.hj-mark__fill'), { opacity: 0 })
      gsap.set(q('.hj-intro__char'), { opacity: 0, yPercent: 90, scale: 0.4, rotate: () => gsap.utils.random(-14, 14) })
      // The pin lands exactly where the pen stroke begins (path start: 184,396 in mark units).
      gsap.set(q('.hj-intro__dot'), { left: homeX + 184 * (size / 1256), top: homeY + 396 * (size / 1256) })
      gsap.set(q('.hj-intro__ring'), { left: homeX + 184 * (size / 1256), top: homeY + 396 * (size / 1256), scale: 0.2, opacity: 0 })

      let minDone = false
      let ready = false
      let alive = true
      const tryLeave = () => { if (minDone && ready) leave() }
      // The hand-off waits for the whole performance (and the data), never cuts it mid-hop.
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          minDone = true
          if (!ready) node.classList.add('hj-intro--waiting')
          tryLeave()
        },
      })
      // 1 — the green pin drops in and pings.
      tl.fromTo(q('.hj-intro__dot'), { scale: 0, yPercent: -260 }, { scale: 1, yPercent: 0, duration: 0.32, ease: 'back.out(2.6)' })
        .to(q('.hj-intro__ring'), {
          keyframes: [{ opacity: 0.6, duration: 0.05 }, { opacity: 0, duration: 0.7 }],
          scale: 2.2, duration: 0.75, ease: 'power2.out', stagger: 0.16,
        }, 0.22)
      // 2 — the pin becomes the pen: the house mark is traced in one continuous stroke, then ink floods in.
        .set(hero, { opacity: 1 }, 0.44)
        .to(q('.hj-intro__dot'), { scale: 0.62, duration: 0.16, ease: 'power2.out' }, 0.44)
        .to(stroke, {
          strokeDashoffset: 0, duration: 0.82, ease: 'power1.inOut',
          // The pin rides the tip of the line like a pen nib.
          onUpdate: () => {
            const at = length - Number(gsap.getProperty(stroke, 'strokeDashoffset'))
            const pt = stroke.getPointAtLength(Math.max(0, Math.min(length, at)))
            const k = size / 1256
            gsap.set(dot, { left: homeX + pt.x * k, top: homeY + pt.y * k })
          },
        }, 0.44)
        .to(dot, { scale: 0, duration: 0.18, ease: 'power2.in' }, 1.2)
        .to(q('.hj-mark__fill'), { opacity: 1, duration: 0.3, ease: 'power1.out' }, 1.12)
        .to(stroke, { opacity: 0, duration: 0.3 }, 1.2)
      // 3 — it comes alive: squash, spring up, jelly wobble on landing.
        .to(body, { scaleY: 0.78, scaleX: 1.16, duration: 0.14, ease: 'power2.out', transformOrigin: '50% 100%' }, 1.3)
        .to(body, { scaleY: 1.12, scaleX: 0.9, duration: 0.14, ease: 'power2.out' })
        .to(hero, { y: homeY - 34, duration: 0.2, ease: 'power2.out' }, '<')
        .to(hero, { y: homeY, duration: 0.18, ease: 'power2.in' })
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.18, ease: 'power2.in' }, '<')
        .to(body, { keyframes: { scaleX: [1, 1.14, 0.94, 1.04, 1], scaleY: [1, 0.86, 1.06, 0.98, 1] }, duration: 0.42, ease: 'none' })
        .addLabel('hop', '-=0.3')

      // 4 — hop-and-stamp: shrink into a character and bounce word to word; each landing stamps its letters out.
      let prev = { x: homeX, y: homeY }
      words.forEach((word, i) => {
        const to = feet(word)
        const peak = Math.min(prev.y, to.y) - (i === 0 ? 70 : 34)
        const t = i === 0 ? 'hop' : `land${i - 1}+=0.08`
        const dur = i === 0 ? 0.32 : 0.17
        if (i === 0) tl.to(hero, { scale: HOP_SCALE, duration: dur, ease: 'power2.inOut' }, t)
        // Arc: x travels linearly while y goes up then down (two eased halves).
        tl.to(hero, { x: to.x, duration: dur, ease: 'none' }, i === 0 ? 'hop' : t)
          .to(hero, { y: peak, duration: dur / 2, ease: 'power2.out' }, t)
          .to(body, { scaleY: 1.1, scaleX: 0.92, duration: dur / 2, ease: 'power1.out' }, t)
          .to(hero, { y: to.y, duration: dur / 2, ease: 'power2.in' }, `${t}+=${dur / 2}`)
          .to(body, { scaleY: 1, scaleX: 1, duration: dur / 2, ease: 'power1.in' }, `${t}+=${dur / 2}`)
          .addLabel(`land${i}`, `${t}+=${dur}`)
          .to(body, { keyframes: { scaleY: [1, 0.72, 1], scaleX: [1, 1.2, 1] }, duration: 0.14, ease: 'power1.out' }, `land${i}`)
          .add(() => {
            const r = word.getBoundingClientRect()
            burst(stage, r.left - stageBox.left + r.width / 2, r.top - stageBox.top + 4)
          }, `land${i}`)
          .to(word.querySelectorAll('.hj-intro__char'), {
            opacity: 1, yPercent: 0, scale: 1, rotate: 0,
            duration: 0.5, ease: 'back.out(3)', stagger: 0.03,
          }, `land${i}`)
        prev = to
      })

      // 5 — leap back to centre stage and breathe while the page finishes loading.
      tl.addLabel('home', `land${words.length - 1}+=0.12`)
        .to(hero, { x: homeX, duration: 0.4, ease: 'power1.inOut' }, 'home')
        .to(hero, { y: Math.min(prev.y, homeY) - 60, duration: 0.2, ease: 'power2.out' }, 'home')
        .to(hero, { y: homeY, duration: 0.2, ease: 'power2.in' }, '>')
        .to(hero, { scale: 0.78, duration: 0.4, ease: 'back.out(1.6)' }, '<-0.2')
        .to(body, { rotate: 360, duration: 0.4, ease: 'power2.inOut', transformOrigin: '50% 55%' }, '<-0.2')
        .to(body, { keyframes: { scaleY: [1, 0.8, 1.06, 1], scaleX: [1, 1.14, 0.96, 1] }, duration: 0.34, ease: 'none', transformOrigin: '50% 100%' })
        .add(() => {
          gsap.to(body, { scaleY: 1.04, scaleX: 0.975, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 100%' })
        })

      const leave = () => {
        if (leaving) return
        leaving = true
        tl.progress(1)
        gsap.killTweensOf(body)
        gsap.set(body, { scaleX: 1, scaleY: 1, rotate: 0 })
        const target = findLogoTarget()
        const out = gsap.timeline({ onComplete: finish, defaults: { ease: 'power3.inOut' } })
        out.to(q('.hj-intro__status, .hj-intro__skip'), { opacity: 0, duration: 0.2 }, 0)
          .to(q('.hj-intro__char'), {
            opacity: 0, yPercent: -50, duration: 0.3, ease: 'power2.in', stagger: { each: 0.008, from: 'center' },
          }, 0.05)
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
      <div className="hj-intro__backdrop" />
      <div className="hj-intro__stage">
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
