import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isGuestCoastPaused, pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import { isMobileLandingViewport } from './mobileLanding'
import { RocketCtaSequence } from './RocketCtaSequence'
import { WindJumpOverlay, type WindDirection } from './WindJumpOverlay'
import './GuestChrome.css'

const NAV = [
  { id: 'mission', label: 'Sứ mệnh' },
  { id: 'journey', label: 'Hành trình' },
  /** Scrolls to #how; stays active through #for (cách hoạt động + dành cho ai) */
  { id: 'how', label: 'Cơ chế' },
  { id: 'start', label: 'Cam kết' },
] as const

type NavId = (typeof NAV)[number]['id']
type SectionId = NavId | 'hero'

/** Sections with light paper backgrounds — dark text shows here */
const LIGHT_SECTION_IDS = ['mission', 'how', 'for', 'start'] as const

/** Above the horizontal journey sticky */
const ABOVE_JOURNEY: SectionId[] = ['hero', 'mission']
/** Below the horizontal journey sticky */
const BELOW_JOURNEY: SectionId[] = ['how', 'start']

/** First ~12% of journey sticky = start edge / first panel — short hop, no wind */
const JOURNEY_START_EDGE = 0.12

type JourneyDepth = 'outside' | 'start' | 'mid' | 'end'

function isAboveJourney(id: SectionId) {
  return ABOVE_JOURNEY.includes(id)
}

function isBelowJourney(id: SectionId) {
  return BELOW_JOURNEY.includes(id)
}

/** Document Y of an element. Prefer at navigate-time (before wind transforms). */
function elementDocTop(el: HTMLElement) {
  return Math.round(window.scrollY + el.getBoundingClientRect().top)
}

function getJourneyDepth(): JourneyDepth {
  const el = document.getElementById('journey')
  if (!el) return 'outside'
  const top = elementDocTop(el)
  const span = Math.max(1, el.offsetHeight - window.innerHeight)
  const y = window.scrollY
  if (y < top - 8 || y > top + span + 8) return 'outside'
  const t = gsap.utils.clamp(0, 1, (y - top) / span)
  if (t < JOURNEY_START_EDGE) return 'start'
  if (t > 0.82) return 'end'
  return 'mid'
}

/**
 * Wind when a tab jump would scrub a long sticky horizontal track.
 * - Above → journey: smooth scroll
 * - Journey start edge → mission (near): smooth scroll
 * - Journey mid/end → out, or below → journey / above: wind
 */
function needsWindJump(from: SectionId, to: NavId) {
  const depth = getJourneyDepth()

  // Physically inside the sticky journey span
  if (depth !== 'outside') {
    if (to === 'journey') return depth !== 'start'
    if (depth === 'start' && isAboveJourney(to)) return false
    return true
  }

  if (isAboveJourney(from) && to === 'journey') return false
  if (isAboveJourney(from) && isBelowJourney(to)) return true
  if (isBelowJourney(from) && isAboveJourney(to)) return true
  if (isBelowJourney(from) && to === 'journey') return true

  return false
}

function buildLightMask(navEl: HTMLElement): string {
  const nr = navEl.getBoundingClientRect()
  const h = nr.height
  if (h <= 0) return 'linear-gradient(#000, #000)'

  type Band = { top: number; bottom: number }
  const bands: Band[] = []

  for (const id of LIGHT_SECTION_IDS) {
    const el = document.getElementById(id)
    if (!el) continue
    const r = el.getBoundingClientRect()
    const top = Math.max(0, r.top - nr.top)
    const bottom = Math.min(h, r.bottom - nr.top)
    if (bottom > top + 0.5) bands.push({ top, bottom })
  }

  if (bands.length === 0) {
    return 'linear-gradient(#000 0%, #000 100%)'
  }

  bands.sort((a, b) => a.top - b.top)

  const merged: Band[] = []
  for (const b of bands) {
    const last = merged[merged.length - 1]
    if (last && b.top <= last.bottom + 1) {
      last.bottom = Math.max(last.bottom, b.bottom)
    } else {
      merged.push({ ...b })
    }
  }

  const stops: string[] = []
  let cursor = 0
  for (const b of merged) {
    const t = (b.top / h) * 100
    const bot = (b.bottom / h) * 100
    if (t > cursor) {
      stops.push(`#000 ${cursor}%`, `#000 ${t}%`)
    }
    stops.push(`#fff ${t}%`, `#fff ${bot}%`)
    cursor = bot
  }
  if (cursor < 100) {
    stops.push(`#000 ${cursor}%`, `#000 100%`)
  }

  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

function NavLinks({
  active,
  onNavigate,
}: {
  active: string
  onNavigate: (id: string) => void
}) {
  return (
    <>
      {NAV.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={active === item.id ? 'is-active' : undefined}
          onClick={(e) => {
            e.preventDefault()
            onNavigate(item.id)
          }}
        >
          {item.label}
        </a>
      ))}
    </>
  )
}

/**
 * One continuous wheel coast for the whole guest page (vertical + journey).
 * Driving scrollY ourselves keeps “lấy đà / dừng xa” through the sticky
 * edges — no dead zone where coast was killed then restarted inside journey.
 */
function useVerticalCoast() {
  useEffect(() => {
    // Touch / phone scroll stays native — this coast is desktop wheel only.
    if (isMobileLandingViewport()) return

    let y = window.scrollY
    let velocity = 0
    let raf = 0
    let running = false

    // Tuned to feel close to horizontal ScrollTrigger scrub (~0.85–1s ease-out)
    const FRICTION = 0.96
    const WHEEL_SCALE = 0.11
    const DIRECT = 0.48
    const MIN_V = 0.05
    const MAX_V = 11

    const maxY = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

    const stop = () => {
      velocity = 0
      running = false
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      y = window.scrollY
    }

    const tick = () => {
      if (isGuestCoastPaused()) {
        velocity = 0
        running = false
        raf = 0
        y = window.scrollY
        return
      }

      y += velocity
      velocity *= FRICTION

      const limit = maxY()
      if (y < 0) {
        y = 0
        velocity = 0
      } else if (y > limit) {
        y = limit
        velocity = 0
      }

      window.scrollTo(0, y)

      if (Math.abs(velocity) > MIN_V) {
        raf = requestAnimationFrame(tick)
      } else {
        stop()
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
      if (isGuestCoastPaused()) return

      y = window.scrollY
      y = Math.max(0, Math.min(maxY(), y + e.deltaY * DIRECT))
      window.scrollTo(0, y)

      velocity = velocity * 0.2 + e.deltaY * WHEEL_SCALE
      velocity = Math.max(-MAX_V, Math.min(MAX_V, velocity))

      if (!running) {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', onWheel)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

export function GuestChrome() {
  const [active, setActive] = useState<SectionId>('hero')
  const [windOpen, setWindOpen] = useState(false)
  const [windDir, setWindDir] = useState<WindDirection>('down')
  const [windDestY, setWindDestY] = useState(0)
  const [rocketOpen, setRocketOpen] = useState(false)
  const [rocketRunId, setRocketRunId] = useState(0)
  const fillRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const darkInkRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const target = useRef(0)
  const ctaShown = useRef(false)
  const activeRef = useRef(active)
  /** Boost catch-up after tab jump / fast flick so % bar doesn’t lag behind */
  const boostUntil = useRef(0)
  const navTween = useRef<gsap.core.Tween | null>(null)
  const windTargetRef = useRef<NavId | null>(null)
  const windBusyRef = useRef(false)

  useVerticalCoast()

  useEffect(() => {
    // Preload Windblow + rocket CTA assets
    void fetch('/lottie/windblow.lottie', { cache: 'force-cache' }).catch(() => {})
    void fetch('/lottie/rocket.lottie', { cache: 'force-cache' }).catch(() => {})
    void fetch('/lottie/text-highlight-blue.lottie', { cache: 'force-cache' }).catch(() => {})
    void fetch('/lottie/click-mouse.lottie', { cache: 'force-cache' }).catch(() => {})
    void fetch('/lottie/exploding-ribbon-confetti.lottie', { cache: 'force-cache' }).catch(() => {})
  }, [])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const cta = ctaRef.current
    if (cta) {
      gsap.set(cta, { yPercent: 120, y: 28, opacity: 0, pointerEvents: 'none' })
    }

    const setCta = (show: boolean) => {
      if (ctaShown.current === show || !cta) return
      ctaShown.current = show
      gsap.killTweensOf(cta)
      if (show) {
        gsap.to(cta, {
          yPercent: 0,
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: 'power3.out',
          overwrite: true,
          onStart: () => {
            cta.style.pointerEvents = 'auto'
            cta.setAttribute('aria-hidden', 'false')
          },
        })
      } else {
        gsap.to(cta, {
          yPercent: 120,
          y: 28,
          opacity: 0,
          duration: 0.45,
          ease: 'power2.in',
          overwrite: true,
          onComplete: () => {
            cta.style.pointerEvents = 'none'
            cta.setAttribute('aria-hidden', 'true')
          },
        })
      }
    }

    const readScrollProgress = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }

    const updateChrome = () => {
      const next = readScrollProgress()
      const jump = Math.abs(next - target.current)
      target.current = next
      // Fast flick or programmatic jump → temporarily snappier bar
      if (jump > 0.04) {
        boostUntil.current = performance.now() + 700
      }

      let current: SectionId = 'hero'
      for (const item of NAV) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) {
          current = item.id
        }
      }
      if (current !== activeRef.current) {
        setActive(current)
      }

      const hero = document.getElementById('hero')
      if (hero) {
        const bottom = hero.getBoundingClientRect().bottom
        const vh = window.innerHeight
        if (!ctaShown.current && bottom < vh * 0.12) {
          setCta(true)
        } else if (ctaShown.current && bottom > vh * 0.55) {
          setCta(false)
        }
      }
    }

    const tick = () => {
      const diff = target.current - progress.current
      const abs = Math.abs(diff)
      const boosted = performance.now() < boostUntil.current
      // Adaptive: soft while fine-scrolling, snappy on big jumps / tab nav
      const alpha = boosted ? (abs > 0.12 ? 0.55 : 0.32) : abs > 0.06 ? 0.22 : abs > 0.015 ? 0.12 : 0.08
      progress.current += diff * alpha
      if (abs < 0.0004) progress.current = target.current

      const p = progress.current
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${p})`
      }
      if (labelRef.current) {
        labelRef.current.textContent = `${String(Math.round(p * 100)).padStart(2, '0')}%`
      }
      const nav = navRef.current
      const darkInk = darkInkRef.current
      if (nav && darkInk) {
        const mask = buildLightMask(nav)
        darkInk.style.webkitMaskImage = mask
        darkInk.style.maskImage = mask
      }
    }

    updateChrome()
    window.addEventListener('scroll', updateChrome, { passive: true })
    window.addEventListener('resize', updateChrome)
    gsap.ticker.add(tick)

    return () => {
      window.removeEventListener('scroll', updateChrome)
      window.removeEventListener('resize', updateChrome)
      gsap.ticker.remove(tick)
      navTween.current?.kill()
      if (cta) gsap.killTweensOf(cta)
    }
  }, [])

  const jumpInstant = useCallback((id: NavId, destY?: number) => {
    const el = document.getElementById(id)
    if (!el) return
    const doc = document.documentElement
    const max = Math.max(0, doc.scrollHeight - window.innerHeight)
    const dest = Math.max(0, Math.min(max, destY ?? elementDocTop(el)))
    window.scrollTo(0, dest)
    const p = max > 0 ? Math.min(1, Math.max(0, dest / max)) : 0
    target.current = p
    progress.current = p
    boostUntil.current = performance.now() + 400
    setActive(id)
  }, [])

  const onWindLand = useCallback(
    (destY: number) => {
      const id = windTargetRef.current
      if (id) jumpInstant(id, destY)
    },
    [jumpInstant],
  )

  const onWindFinished = useCallback(() => {
    windTargetRef.current = null
    setWindOpen(false)
    windBusyRef.current = false
    resumeGuestCoast()
  }, [])

  const scrollSmooth = useCallback((id: NavId) => {
    const el = document.getElementById(id)
    if (!el) return

    navTween.current?.kill()
    boostUntil.current = performance.now() + 1400

    const proxy = { y: window.scrollY }
    const dest = elementDocTop(el)

    navTween.current = gsap.to(proxy, {
      y: dest,
      duration: 1.15,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        window.scrollTo(0, proxy.y)
        const doc = document.documentElement
        const max = doc.scrollHeight - window.innerHeight
        target.current = max > 0 ? Math.min(1, Math.max(0, proxy.y / max)) : 0
      },
      onComplete: () => {
        window.scrollTo(0, dest)
        const doc = document.documentElement
        const max = doc.scrollHeight - window.innerHeight
        target.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
        setActive(id)
      },
    })
  }, [])

  const onNavigate = (id: string) => {
    const to = id as NavId
    if (!document.getElementById(to) || windBusyRef.current) return

    const from = activeRef.current

    if (needsWindJump(from, to)) {
      navTween.current?.kill()
      pauseGuestCoast()
      windBusyRef.current = true
      windTargetRef.current = to
      const destY = elementDocTop(document.getElementById(to)!)
      setWindDestY(destY)
      // Explicit travel direction (page jump), not CSS-class guessing
      const goingDown = destY > window.scrollY + 2
      setWindDir(goingDown ? 'down' : 'up')
      setWindOpen(true)
      return
    }

    scrollSmooth(to)
  }

  return (
    <>
      <nav className="guest-side-nav" ref={navRef} aria-label="Điều hướng landing">
        <div className="guest-side-nav__layer guest-side-nav__layer--light">
          <NavLinks active={active} onNavigate={onNavigate} />
        </div>
        <div
          className="guest-side-nav__layer guest-side-nav__layer--dark"
          ref={darkInkRef}
          aria-hidden="true"
        >
          <NavLinks active={active} onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="guest-progress" aria-hidden="true">
        <span className="guest-progress__label" ref={labelRef}>
          00%
        </span>
        <div className="guest-progress__track">
          <div className="guest-progress__fill" ref={fillRef} />
        </div>
      </div>

      <div className="guest-fixed-cta" ref={ctaRef} aria-hidden="true">
        <span>Miễn phí đăng ký</span>
        <button
          type="button"
          className="guest-fixed-cta__go"
          onClick={() => {
            if (rocketOpen || windBusyRef.current) return
            setRocketRunId((n) => n + 1)
            setRocketOpen(true)
          }}
        >
          Bắt đầu ngay
        </button>
      </div>

      {rocketOpen && (
        <RocketCtaSequence
          key={rocketRunId}
          open
          onFinished={() => setRocketOpen(false)}
        />
      )}

      <WindJumpOverlay
        open={windOpen}
        direction={windDir}
        destY={windDestY}
        onLand={onWindLand}
        onFinished={onWindFinished}
      />
    </>
  )
}
