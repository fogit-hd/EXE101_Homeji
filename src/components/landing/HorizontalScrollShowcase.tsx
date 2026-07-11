import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { isMobileLandingViewport } from './mobileLanding'
import './HorizontalScrollShowcase.css'

gsap.registerPlugin(ScrollTrigger)
gsap.config({ reducedMotion: false } as gsap.GSAPConfig)

const LOTTIE = {
  thinking: '/lottie/thinking-boy.lottie',
  mapSearch: '/lottie/map-search.lottie',
  search: '/lottie/search.lottie',
  protection: '/lottie/complete-protection.lottie',
} as const

/**
 * Flow (sticky + tall spacer):
 * 1) Section locks full-viewport (start hold)
 * 2) Further scroll drives horizontal panels
 * 3) End hold keeps last panel on screen before vertical continues
 */
/** Desktop edge buffers — just a nudge to lock/unlock sticky */
const DESKTOP = {
  startHold: 0.12,
  horiz: 12.5,
  endHold: 0.18,
  scrub: 0.9,
} as const

/**
 * Mobile-only: enough distance to read panels via swipe, short exit buffer
 * so the last panel does not feel like a sticky trap into the next section.
 * Desktop constants above stay as-is.
 */
const MOBILE = {
  startHold: 0.45,
  horiz: 22,
  endHold: 0.55,
  scrub: 0.25,
} as const

function journeyTune() {
  return isMobileLandingViewport() ? MOBILE : DESKTOP
}

const PANEL_COUNT = 4
const PROTECTION_FRAME_ASSEMBLED = 31

function ProtectionPanel({
  panelRef,
  playerRef,
  onReady,
}: {
  panelRef: MutableRefObject<HTMLElement | null>
  playerRef: MutableRefObject<DotLottie | null>
  onReady: (player: DotLottie) => void
}) {
  return (
    <article
      className="dxh-panel dxh-panel--shield"
      ref={(el) => {
        panelRef.current = el
      }}
    >
      <div className="dxh-panel__media" data-reveal="shield-media">
        <div className="dxh-lottie-frame dxh-lottie-frame--shield">
          <DotLottieReact
            src={LOTTIE.protection}
            loop={false}
            autoplay={false}
            dotLottieRefCallback={(instance) => {
              playerRef.current = instance
              if (!instance) return
              const ready = () => {
                instance.setLoop(false)
                instance.setMode('forward')
                instance.pause()
                onReady(instance)
              }
              instance.addEventListener('load', ready)
              instance.addEventListener('ready', ready)
              if (instance.isLoaded || instance.totalFrames > 0) ready()
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      <div className="dxh-panel__copy" data-reveal="shield-copy">
        <span className="dxh-step">04</span>
        <span className="dxh-eyebrow">Giải pháp an toàn</span>
        <h2>Chúng tôi là giải pháp an toàn cho bạn</h2>
        <div className="dxh-hairline" />
        <p>
          Homeji ghép đủ thông tin phòng, bạn cùng phòng và chủ nhà thành một lớp bảo vệ. Thiếu chúng
          tôi — bạn thiếu một mảnh quan trọng cho giải pháp an toàn nhất.
        </p>
      </div>
    </article>
  )
}

export function HorizontalScrollShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const protectionPanelRef = useRef<HTMLElement | null>(null)
  const protectionPlayerRef = useRef<DotLottie | null>(null)
  const lastShieldFrameRef = useRef(-1)
  const syncProtectionRef = useRef<(hp: number) => void>(() => {})
  const [mobileViewport, setMobileViewport] = useState(() => isMobileLandingViewport())

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setMobileViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    const section = sectionRef.current
    const sticky = stickyRef.current
    const inner = innerRef.current
    const progressFill = progressRef.current
    if (!section || !sticky || !inner) return

    const { startHold: START_HOLD_VH, horiz: HORIZ_VH, endHold: END_HOLD_VH, scrub: SCRUB } =
      journeyTune()

    const setSectionHeight = () => {
      const vh = window.innerHeight
      const { startHold, horiz, endHold } = journeyTune()
      const scrollSpan = vh * (startHold + horiz + endHold)
      section.style.height = `${Math.round(vh + scrollSpan)}px`
    }

    /**
     * Enter progress for panel `index` from horizontal scrub hp (0–1).
     * Derived from layout math — same clock as the x tween (no getBoundingClientRect lag).
     */
    const panelEnterFromHp = (index: number, hp: number, panelW: number, travel: number) => {
      if (travel <= 0) return index === 0 ? 1 : 0
      const vw = window.innerWidth
      // left_i = index * panelW - hp * travel
      // start when left ≈ 0.9vw, done when left ≈ 0.05vw
      const start = (index * panelW - vw * 0.9) / travel
      const end = (index * panelW - vw * 0.05) / travel
      return gsap.utils.clamp(0, 1, (hp - start) / Math.max(0.0001, end - start))
    }

    const syncProtection = (hp: number) => {
      const player = protectionPlayerRef.current
      if (!player || player.totalFrames <= 0) return

      const panelW = inner.querySelector('.dxh-panel')?.clientWidth ?? window.innerWidth * 0.88
      const travel = Math.max(1, inner.scrollWidth - window.innerWidth)
      const vw = window.innerWidth
      const i = PANEL_COUNT - 1
      const start = (i * panelW - vw * 0.88) / travel
      const end = (i * panelW - vw * 0.1) / travel
      let t = gsap.utils.clamp(0, 1, (hp - start) / Math.max(0.0001, end - start))
      if (hp >= end) t = 1
      if (hp <= start) t = 0

      const assembled = Math.min(PROTECTION_FRAME_ASSEMBLED, player.totalFrames - 1)
      const frame = t * assembled
      if (Math.abs(frame - lastShieldFrameRef.current) < 0.08) return
      lastShieldFrameRef.current = frame
      if (player.isPlaying) player.pause()
      player.setFrame(frame)
    }
    syncProtectionRef.current = syncProtection

    const totalTune = START_HOLD_VH + HORIZ_VH + END_HOLD_VH
    const startFrac = START_HOLD_VH / totalTune
    const horizFrac = HORIZ_VH / totalTune

    const ctx = gsap.context(() => {
      setSectionHeight()

      const getTravelX = () => -(inner.scrollWidth - window.innerWidth)
      const panels = gsap.utils.toArray<HTMLElement>(inner.querySelectorAll('.dxh-panel'))

      const mapMedia = inner.querySelector('.dxh-panel--map [data-reveal="map-media"]')
      const mapCopy = inner.querySelector('.dxh-panel--map [data-reveal="map-copy"]')
      const searchCopy = inner.querySelector('.dxh-panel--search [data-reveal="search-copy"]')
      const searchMedia = inner.querySelector('.dxh-panel--search [data-reveal="search-media"]')
      const shieldMedia = inner.querySelector('.dxh-panel--shield [data-reveal="shield-media"]')
      const shieldCopy = inner.querySelector('.dxh-panel--shield [data-reveal="shield-copy"]')

      gsap.set(inner, { x: 0, force3D: true })
      if (progressFill) {
        gsap.set(progressFill, { scaleX: 0, transformOrigin: 'left center' })
      }

      // Whole blocks (not per-child) — fewer writes, no stagger flicker
      gsap.set([mapMedia, mapCopy], { opacity: 0, x: 0, y: 0, scale: 1 })
      gsap.set([searchCopy, searchMedia], { opacity: 0, x: 0, y: 0, scale: 1 })
      gsap.set([shieldMedia, shieldCopy], { opacity: 0, x: 0, y: 0 })

      gsap.set(mapMedia, { x: 48, scale: 0.96 })
      gsap.set(mapCopy, { x: -28 })
      gsap.set(searchCopy, { y: 36 })
      gsap.set(searchMedia, { y: 24, scale: 0.96 })
      gsap.set(shieldCopy, { x: 32 })

      const applyReveals = (hp: number) => {
        const panelW = panels[0]?.offsetWidth || window.innerWidth * 0.88
        const travel = Math.max(1, inner.scrollWidth - window.innerWidth)
        const t1 = panelEnterFromHp(1, hp, panelW, travel)
        const t2 = panelEnterFromHp(2, hp, panelW, travel)
        const t3 = panelEnterFromHp(3, hp, panelW, travel)

        // 02 — media from right, copy from left
        gsap.set(mapMedia, {
          opacity: t1,
          x: (1 - t1) * 48,
          scale: 0.96 + t1 * 0.04,
          force3D: true,
        })
        gsap.set(mapCopy, {
          opacity: t1,
          x: (1 - t1) * -28,
          force3D: true,
        })

        // 03 — rise + soft scale
        gsap.set(searchCopy, {
          opacity: t2,
          y: (1 - t2) * 36,
          force3D: true,
        })
        gsap.set(searchMedia, {
          opacity: t2,
          y: (1 - t2) * 24,
          scale: 0.96 + t2 * 0.04,
          force3D: true,
        })

        // 04 — fade only on media (Lottie owns the piece motion); copy from right
        gsap.set(shieldMedia, {
          opacity: gsap.utils.clamp(0, 1, t3 * 1.8),
          force3D: true,
        })
        gsap.set(shieldCopy, {
          opacity: t3,
          x: (1 - t3) * 32,
          force3D: true,
        })
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'dxh-journey',
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onRefresh: setSectionHeight,
          onUpdate: (self) => {
            sticky.style.setProperty('--dxh-progress', String(self.progress))
            const hp = gsap.utils.clamp(0, 1, (self.progress - startFrac) / horizFrac)
            sticky.style.setProperty('--dxh-hp', String(hp))
            if (mobileViewport) {
              const active = Math.round(hp * (PANEL_COUNT - 1))
              sticky.querySelectorAll('.dxh-panel-dot').forEach((dot, i) => {
                dot.classList.toggle('is-on', i === active)
              })
            }
            applyReveals(hp)
            syncProtection(hp)
          },
        },
      })

      tl.to(
        inner,
        {
          x: getTravelX,
          duration: horizFrac,
          force3D: true,
          ease: 'none',
        },
        startFrac,
      )

      if (progressFill) {
        tl.to(progressFill, { scaleX: 1, duration: horizFrac, ease: 'none' }, startFrac)
      }

      tl.to('.dxh-orb--a', { xPercent: 36, yPercent: -16, duration: horizFrac, ease: 'none' }, startFrac)
      tl.to('.dxh-orb--b', { xPercent: -28, yPercent: 20, duration: horizFrac, ease: 'none' }, startFrac)

      tl.set(inner, { x: getTravelX }, 1)
      if (progressFill) {
        tl.set(progressFill, { scaleX: 1 }, 1)
      }

      applyReveals(0)
      syncProtection(0)
      ScrollTrigger.refresh()
    }, section)

    /** Mobile: horizontal swipe drives panels; vertical scroll exits freely at the end. */
    let touchCleanup: (() => void) | undefined
    if (mobileViewport) {
      type Axis = 'none' | 'x' | 'y'
      const LOCK_PX = 10
      let axis: Axis = 'none'
      let startX = 0
      let startY = 0
      let lastX = 0
      let lastT = 0
      /** Horizontal finger velocity (px/ms), positive = finger moving right */
      let velFingerX = 0
      let settleTween: gsap.core.Tween | null = null

      const holdStart = startFrac + horizFrac

      const progressFromY = (st: ScrollTrigger, y: number) => {
        const span = st.end - st.start
        if (span <= 0) return 0
        return gsap.utils.clamp(0, 1, (y - st.start) / span)
      }

      const yFromProgress = (st: ScrollTrigger, p: number) =>
        st.start + (st.end - st.start) * gsap.utils.clamp(0, 1, p)

      /** Snap only while still inside the panel track — never yank back from the exit zone. */
      const nearestPanelProgress = (st: ScrollTrigger, y: number, biasHp = 0) => {
        const p = progressFromY(st, y)
        if (p >= holdStart - 0.005) {
          // Already on / past last panel — keep progress (caller may exit past end)
          return p
        }
        const hp = gsap.utils.clamp(0, 1, (p - startFrac) / Math.max(0.0001, horizFrac) + biasHp)
        const panel = Math.round(hp * (PANEL_COUNT - 1))
        return startFrac + (panel / (PANEL_COUNT - 1)) * horizFrac
      }

      const animateToY = (targetY: number, duration = 0.45) => {
        settleTween?.kill()
        const proxy = { y: window.scrollY }
        settleTween = gsap.to(proxy, {
          y: targetY,
          duration,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: () => window.scrollTo(0, proxy.y),
        })
      }

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return
        settleTween?.kill()
        settleTween = null
        const t = e.touches[0]
        startX = lastX = t.clientX
        startY = t.clientY
        lastT = performance.now()
        velFingerX = 0
        axis = 'none'
        sticky.classList.remove('is-h-dragging')
      }

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return
        const st = ScrollTrigger.getById('dxh-journey')
        if (!st?.isActive) return

        const t = e.touches[0]
        const x = t.clientX
        const y = t.clientY
        const dx = x - lastX
        const now = performance.now()
        const dt = Math.max(8, now - lastT)
        const inExitZone = st.progress >= holdStart - 0.02

        if (axis === 'none') {
          const adx = Math.abs(x - startX)
          const ady = Math.abs(y - startY)
          if (adx < LOCK_PX && ady < LOCK_PX) return
          // At the last panel, prefer vertical so the page can leave the sticky section
          if (inExitZone) {
            axis = adx > ady * 1.75 ? 'x' : 'y'
          } else {
            axis = adx > ady * 1.05 ? 'x' : 'y'
          }
        }

        if (axis === 'y') {
          lastX = x
          lastT = now
          return
        }

        // Horizontal swipe → drive vertical scroll that scrubs the track
        e.preventDefault()
        sticky.classList.add('is-h-dragging')
        sticky.classList.add('has-h-swiped')

        const span = st.end - st.start
        const panelScrollPx = (span * horizFrac) / (PANEL_COUNT - 1)
        // Finger left → next panel; finger right → previous
        const deltaScroll = (-dx / Math.max(1, window.innerWidth)) * panelScrollPx
        // Allow a little past st.end so a final left-swipe can unstick into the next section
        const exitPad = window.innerHeight * 0.35
        const nextY = gsap.utils.clamp(st.start, st.end + exitPad, window.scrollY + deltaScroll)
        window.scrollTo(0, nextY)
        ScrollTrigger.update()

        velFingerX = velFingerX * 0.4 + dx / dt
        lastX = x
        lastT = now
      }

      const onTouchEnd = () => {
        sticky.classList.remove('is-h-dragging')
        const st = ScrollTrigger.getById('dxh-journey')
        if (!st) {
          axis = 'none'
          return
        }

        if (axis === 'x') {
          const span = st.end - st.start
          const panelScrollPx = (span * horizFrac) / (PANEL_COUNT - 1)
          const coastPx = gsap.utils.clamp(
            -panelScrollPx * 1.15,
            panelScrollPx * 1.15,
            -velFingerX * 180,
          )
          const projected = window.scrollY + coastPx
          const pNow = progressFromY(st, window.scrollY)
          const forwardFlick = -velFingerX > 0.35 // finger moved left → advance / exit

          // Last panel + swipe forward: leave the journey instead of snapping back
          if (pNow >= holdStart - 0.02 && forwardFlick) {
            animateToY(st.end + window.innerHeight * 0.08, 0.4)
          } else if (projected > st.end && forwardFlick) {
            animateToY(st.end + window.innerHeight * 0.08, 0.4)
          } else {
            const biasHp = gsap.utils.clamp(-0.2, 0.2, -velFingerX * 0.012)
            const targetP = nearestPanelProgress(st, Math.min(projected, st.end), biasHp)
            // If snap would land in exit zone, park at the start of end-hold (last panel), not mid-trap
            const parkP =
              targetP >= holdStart ? holdStart + Math.min(0.08, (1 - holdStart) * 0.25) : targetP
            animateToY(yFromProgress(st, parkP), Math.abs(velFingerX) > 0.45 ? 0.38 : 0.5)
          }
        }
        // Vertical: never pull scroll back — native momentum continues into the next section

        axis = 'none'
        velFingerX = 0
      }

      // touchmove must be non-passive so horizontal can preventDefault
      section.addEventListener('touchstart', onTouchStart, { passive: true })
      section.addEventListener('touchmove', onTouchMove, { passive: false })
      section.addEventListener('touchend', onTouchEnd, { passive: true })
      section.addEventListener('touchcancel', onTouchEnd, { passive: true })
      touchCleanup = () => {
        settleTween?.kill()
        sticky.classList.remove('is-h-dragging')
        section.removeEventListener('touchstart', onTouchStart)
        section.removeEventListener('touchmove', onTouchMove)
        section.removeEventListener('touchend', onTouchEnd)
        section.removeEventListener('touchcancel', onTouchEnd)
      }
    }

    const onResize = () => {
      setSectionHeight()
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)
    const t1 = window.setTimeout(() => {
      setSectionHeight()
      ScrollTrigger.refresh()
    }, 100)
    const t2 = window.setTimeout(() => ScrollTrigger.refresh(), 400)

    return () => {
      touchCleanup?.()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [mobileViewport])

  return (
    <section
      className="dxh-scroll-outer"
      id="journey"
      ref={sectionRef}
      aria-label="Bạn đang muốn tìm nhà?"
      style={{ ['--dxh-panels' as string]: PANEL_COUNT }}
    >
      <div className="dxh-scroll-sticky" ref={stickyRef}>
        <div className="dxh-ambient" aria-hidden="true">
          <span className="dxh-orb dxh-orb--a" />
          <span className="dxh-orb dxh-orb--b" />
          <div className="dxh-grid-fade" />
        </div>

        <div className="dxh-track-ui" aria-hidden="true">
          {mobileViewport ? (
            <div className="dxh-mobile-chrome">
              <p className="dxh-swipe-hint">Vuốt ngang để xem tiếp</p>
              <div className="dxh-panel-dots">
                {Array.from({ length: PANEL_COUNT }, (_, i) => (
                  <span key={i} className={`dxh-panel-dot${i === 0 ? ' is-on' : ''}`} />
                ))}
              </div>
            </div>
          ) : null}
          <div className="dxh-track-progress">
            <div className="dxh-track-progress__fill" ref={progressRef} />
          </div>
        </div>

        <div className="dxh-scroll-inner" ref={innerRef}>
          <article className="dxh-panel dxh-panel--ask">
            <div className="dxh-panel__copy" data-reveal="ask-copy">
              <span className="dxh-step">01</span>
              <span className="dxh-eyebrow">Câu hỏi mở đầu</span>
              <h2>Bạn đang muốn tìm nhà nhưng chưa biết tìm ở đâu?</h2>
              <div className="dxh-hairline" />
              <p>
                Homeji giúp sinh viên quanh Thủ Đức & Q.9 bắt đầu từ đúng chỗ — rõ khu vực, rõ ngân
                sách, rõ bạn cùng phòng và chủ nhà cho thuê.
              </p>
            </div>
            <div className="dxh-panel__media" data-reveal="ask-media">
              <div className="dxh-lottie-frame dxh-lottie-frame--ask">
                <DotLottieReact
                  src={LOTTIE.thinking}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </article>

          <article className="dxh-panel dxh-panel--map">
            <div className="dxh-panel__media" data-reveal="map-media">
              <div className="dxh-lottie-frame dxh-lottie-frame--map">
                <DotLottieReact
                  src={LOTTIE.mapSearch}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
            <div className="dxh-panel__copy dxh-panel__copy--rail" data-reveal="map-copy">
              <span className="dxh-watermark" aria-hidden="true">
                02
              </span>
              <span className="dxh-eyebrow">Bản đồ đầy đủ</span>
              <h2>Bạn đang muốn tìm nhà ở chỗ nào?</h2>
              <div className="dxh-hairline" />
              <p>
                Homeji hỗ trợ bản đồ đầy đủ quanh Thủ Đức & Q.9 — xem vị trí phòng, khoảng cách tới
                trường và tiện ích xung quanh trước khi quyết định.
              </p>
            </div>
          </article>

          <article className="dxh-panel dxh-panel--search">
            <div className="dxh-panel__copy dxh-panel__copy--quote" data-reveal="search-copy">
              <span className="dxh-step">03</span>
              <span className="dxh-eyebrow">Bạn cùng phòng</span>
              <h2>Đang tra cứu từng người… và còn đầy thắc mắc?</h2>
              <div className="dxh-hairline" />
              <p>
                So sánh hồ sơ, thói quen và kỳ vọng ở chung không phải chuyện dễ. Homeji giúp bạn xem
                thông tin rõ ràng hơn, gửi lời mời và theo dõi phản hồi — bớt đoán mò.
              </p>
            </div>
            <div className="dxh-panel__media" data-reveal="search-media">
              <div className="dxh-lottie-frame dxh-lottie-frame--search">
                <DotLottieReact
                  src={LOTTIE.search}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </article>

          <ProtectionPanel
            panelRef={protectionPanelRef}
            playerRef={protectionPlayerRef}
            onReady={() => {
              const p = Number(
                stickyRef.current?.style.getPropertyValue('--dxh-progress') || 0,
              )
              const { startHold, horiz, endHold } = journeyTune()
              const total = startHold + horiz + endHold
              const hp = gsap.utils.clamp(
                0,
                1,
                (p - startHold / total) / (horiz / total),
              )
              syncProtectionRef.current(hp)
            }}
          />
        </div>
      </div>
    </section>
  )
}
