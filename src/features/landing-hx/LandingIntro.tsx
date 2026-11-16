import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { hasSessionHint, readAuthTokenState } from '../../api/authSession'
import { whenLandingReady } from './introGate'
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from './ui/BrandMark'
import './landing-intro.css'

const WORD = [...'Homeji']
/** The inside of the house, under the logo: where the light comes on (logo canvas units). */
const ROOM = 'M330 430 L630 282 L930 474 L930 910 L330 910 Z'

/** The whole intro plays before the page shows: line, logo drawn and filled, light on, name. */
const INTRO_MS = 2700
const INTRO_MS_REDUCED = 700
/** The logo's flight into the navbar, and the ground fading off the page under it. */
const HANDOFF_MS = 1020
/** Never hold the visitor longer than this, ready or not. */
const MAX_MS = 12000

function hasStoredSession() {
  try { return Boolean(readAuthTokenState().token) || hasSessionHint() } catch { return false }
}

/** Transform that moves and scales `from` onto `to` (both viewport rects, origin top-left). */
function flight(from: DOMRect, to: DOMRect) {
  const scale = to.width / from.width
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`
}

/**
 * Opening a bare "/" as a guest: a ground line, the Homeji logo drawn and filled, a warm light coming
 * on inside the house, then the name. It stays until it has played through and the landing has its
 * first view ready; then the ground fades off the page and the logo and name fly into the navbar's
 * logo, so the two screens are one. Lives outside the route's Suspense, so the page loading
 * underneath never cuts it short. The slogan is left to the page, so it shows once.
 */
export function LandingIntro() {
  const { pathname, search, hash } = useLocation()
  const [phase, setPhase] = useState<'off' | 'on' | 'leaving'>(() =>
    pathname === '/' && !search && !hash && !hasStoredSession() ? 'on' : 'off')
  const markRef = useRef<SVGSVGElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (phase !== 'on') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let played = false
    let landed = false
    const leave = () => { if (played && landed) setPhase('leaving') }
    const timer = window.setTimeout(() => { played = true; leave() }, reduce ? INTRO_MS_REDUCED : INTRO_MS)
    const cap = window.setTimeout(() => setPhase('leaving'), MAX_MS)
    const stop = whenLandingReady(() => { landed = true; leave() })
    return () => { window.clearTimeout(timer); window.clearTimeout(cap); stop() }
  }, [phase])

  // The hand-off: fly the logo and the name onto the navbar's, which wait hidden until they land.
  useLayoutEffect(() => {
    if (phase !== 'leaving') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targetMark = document.querySelector<HTMLElement>('.hx-nav .hx-logo__mark')
    const targetWord = document.querySelector<HTMLElement>('.hx-nav .hx-logo__word')
    const pairs: [HTMLElement | SVGSVGElement | null, HTMLElement | null][] = [[markRef.current, targetMark], [wordRef.current, targetWord]]
    const flying = !reduce && pairs.every(([from, to]) => from && to && to.getBoundingClientRect().height > 0)
    if (flying) {
      for (const [from, to] of pairs) {
        from!.style.transform = flight(from!.getBoundingClientRect(), to!.getBoundingClientRect())
        to!.style.visibility = 'hidden'
      }
    }
    const timer = window.setTimeout(() => {
      for (const [, to] of pairs) if (to) to.style.visibility = ''
      setPhase('off')
    }, flying ? HANDOFF_MS : 300)
    return () => {
      window.clearTimeout(timer)
      for (const [, to] of pairs) if (to) to.style.visibility = ''
    }
  }, [phase])

  // Left "/" before the landing showed (a link, a sign-in): drop the intro at once.
  if (phase === 'off' || pathname !== '/') return null
  return createPortal(
    <div className={`hx-intro${phase === 'leaving' ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <span className="hx-intro__sr">Đang mở trang chủ Homeji…</span>
      <span className="hx-intro__ground" aria-hidden="true" />
      <div className="hx-intro__stage" aria-hidden="true">
        <span className="hx-intro__glow" />
        <span className="hx-intro__line" />
        {/* The project logo (ui/BrandMark): drawn, filled from the ground up, then lit from inside. */}
        <svg ref={markRef} className="hx-intro__mark" viewBox={BRAND_MARK_VIEWBOX}>
          <defs>
            <clipPath id="hx-intro-rise">
              <rect className="hx-intro__level" x="0" y="0" width="1256" height="1264" />
            </clipPath>
            <radialGradient id="hx-intro-lamp" cx="0.62" cy="0.45" r="0.75">
              <stop offset="0" stopColor="var(--in-lamp)" />
              <stop offset="1" stopColor="var(--in-lamp-edge)" />
            </radialGradient>
          </defs>
          <path className="hx-intro__room" d={ROOM} fill="url(#hx-intro-lamp)" />
          <path className="hx-intro__fill" d={BRAND_MARK_PATH} clipPath="url(#hx-intro-rise)" />
          <path className="hx-intro__pen" d={BRAND_MARK_PATH} pathLength={1} />
        </svg>
        <span ref={wordRef} className="hx-intro__word">
          {WORD.map((letter, i) => (
            <span key={i} className="hx-intro__letter" style={{ animationDelay: `${1650 + 50 * i}ms` }}>{letter}</span>
          ))}
        </span>
      </div>
    </div>,
    document.body,
  )
}
