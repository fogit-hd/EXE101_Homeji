import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { INTRO_SESSION_KEY, introRequested, whenHomeReady } from '../../lib/introGate'
import './BrandIntro.css'

const SLOGAN = 'Trọ an tâm · Nâng tầm cuộc sống'
/** Earliest moment the hand-off may start (the reveal itself needs ~2.2s). */
const MIN_HOLD_MS = 2150
/** Never hold the user longer than this; home shows its own skeleton if still loading. */
const MAX_HOLD_MS = 6000
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
  const jobs: Promise<unknown>[] = []
  // Fonts and the guest hero image download in parallel with the intro; the
  // page itself (data + Maps script) is already mounting underneath.
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
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

    const ctx = gsap.context(() => {
      const chars = q('.hj-intro__char')
      gsap.set(q('.hj-intro__logo'), { scale: 0.35, opacity: 0, filter: 'blur(6px)' })
      gsap.set(q('.hj-intro__ring'), { scale: 0.2, opacity: 0 })
      gsap.set(q('.hj-intro__disc'), { scale: 0.1, opacity: 0 })
      gsap.set(chars, {
        opacity: 0, yPercent: 110, rotateX: -95, scale: 0.86, filter: 'blur(10px)', transformOrigin: '50% 100% -0.4em',
      })
      gsap.set(q('.hj-intro__slogan'), { letterSpacing: '0.22em', '--sweep': '-60%' })

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      // 1 — the pin drops in.
      tl.fromTo(q('.hj-intro__dot'), { scale: 0, y: -26 }, { scale: 1, y: 0, duration: 0.34, ease: 'back.out(2.4)' })
      // 2 — soft bounce, then it blooms into the logo with a location-ping wave.
        .to(q('.hj-intro__dot'), { y: -16, scaleY: 1.08, scaleX: 0.94, duration: 0.18, ease: 'power2.out' })
        .to(q('.hj-intro__dot'), { y: 0, scaleY: 0.86, scaleX: 1.12, duration: 0.16, ease: 'power2.in' })
        .to(q('.hj-intro__dot'), { scaleX: 1, scaleY: 1, duration: 0.12, ease: 'power1.out' })
        .addLabel('bloom')
        .to(q('.hj-intro__dot'), { scale: 9, opacity: 0, duration: 0.42, ease: 'power2.in' }, 'bloom')
        .to(q('.hj-intro__disc'), { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' }, 'bloom+=0.1')
        .to(q('.hj-intro__logo'), { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.62, ease: 'back.out(1.7)' }, 'bloom+=0.16')
        .to(q('.hj-intro__ring'), {
          keyframes: [{ opacity: 0.7, duration: 0.06 }, { opacity: 0, duration: 0.9 }],
          scale: 3.4, duration: 0.96, ease: 'power2.out', stagger: 0.2,
        }, 'bloom+=0.2')
      // 3 — slogan: per-grapheme 3D flip + blur→sharp + overshoot, tracking settles, light sweep.
        .addLabel('text', 'bloom+=0.5')
        .to(chars, {
          opacity: 1, yPercent: 0, rotateX: 0, scale: 1, filter: 'blur(0px)',
          duration: 0.7, ease: 'back.out(2)', stagger: { each: 0.026, from: 'start' },
        }, 'text')
        .to(q('.hj-intro__slogan'), { letterSpacing: '0.02em', duration: 1.1, ease: 'expo.out' }, 'text')
        .to(q('.hj-intro__slogan'), { '--sweep': '160%', duration: 1.0, ease: 'power2.inOut' }, 'text+=0.55')
        .fromTo(q('.hj-intro__accent'), { scale: 0.2 }, { scale: 1, duration: 0.5, ease: 'back.out(4)' }, 'text+=0.3')

      const leave = () => {
        if (leaving) return
        leaving = true
        tl.progress(1)
        const logo = q('.hj-intro__logo')[0] as HTMLElement | undefined
        const target = findLogoTarget()
        const out = gsap.timeline({ onComplete: finish, defaults: { ease: 'power3.inOut' } })
        out.to(q('.hj-intro__status, .hj-intro__skip'), { opacity: 0, duration: 0.2 }, 0)
          .to(q('.hj-intro__disc'), { scale: 0.6, opacity: 0, duration: 0.34, ease: 'power2.in' }, 0.08)
          .to(q('.hj-intro__char'), {
            opacity: 0, yPercent: -60, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in', stagger: { each: 0.008, from: 'center' },
          }, 0)
        if (logo && target) {
          // 4 — FLIP: fly the mark onto the real header logo, then hand the pixel over.
          const a = logo.getBoundingClientRect()
          const b = target.getBoundingClientRect()
          hiddenTarget = target
          target.style.visibility = 'hidden'
          out.to(logo, {
            x: b.left + b.width / 2 - (a.left + a.width / 2),
            y: b.top + b.height / 2 - (a.top + a.height / 2),
            scale: Math.min(b.width / a.width, b.height / a.height),
            duration: 0.72,
          }, 0.12)
        } else if (logo) {
          out.to(logo, { scale: 0.6, opacity: 0, duration: 0.5 }, 0.12)
        }
        out.to(q('.hj-intro__backdrop'), { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, 0.22)
        if (logo && target) out.add(() => target.style.removeProperty('visibility'), '>-0.02')
          .to(logo, { opacity: 0, duration: 0.12 })
      }

      skipRef.current = () => {
        // Skip still lands smoothly, just without waiting for the reveal or the data.
        if (!leaving) leave()
      }

      if (reduced.matches) { finish(); return }

      let minDone = false
      let ready = false
      const tryLeave = () => { if (minDone && ready) leave() }
      const minTimer = window.setTimeout(() => {
        minDone = true
        if (!ready) node.classList.add('hj-intro--waiting')
        tryLeave()
      }, MIN_HOLD_MS)
      const maxTimer = window.setTimeout(() => leave(), MAX_HOLD_MS)
      let alive = true
      const stopReady = whenHomeReady(() => {
        void assets.then(() => { if (!alive) return; ready = true; tryLeave() })
      })
      return () => { alive = false; window.clearTimeout(minTimer); window.clearTimeout(maxTimer); stopReady() }
    }, node)

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skipRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      ctx.revert()
      if (hiddenTarget) hiddenTarget.style.removeProperty('visibility')
    }
  }, [active])

  if (!active) return null

  return createPortal(
    <div ref={root} className="hj-intro" role="dialog" aria-modal="true" aria-label="Homeji — giới thiệu">
      <div className="hj-intro__backdrop" />
      <div className="hj-intro__stage">
        <div className="hj-intro__mark">
          <span className="hj-intro__ring" aria-hidden="true" />
          <span className="hj-intro__ring" aria-hidden="true" />
          <span className="hj-intro__disc" aria-hidden="true" />
          <span className="hj-intro__dot" aria-hidden="true" />
          <img className="hj-intro__logo" src="/brand/homeji-logo2.png" alt="Homeji" width={112} height={113} decoding="sync" />
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
