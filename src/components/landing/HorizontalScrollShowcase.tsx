import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
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
/** Tiny edge buffers — just a nudge to lock/unlock sticky, not a long hold */
const START_HOLD_VH = 0.12
/** Longer travel = slower panel-to-panel scrub inside the horizontal section */
const HORIZ_VH = 12.5
const END_HOLD_VH = 0.18
/**
 * Scrub lag ≈ vertical coast ease-out so “dừng xa” feels continuous
 * across vertical ↔ horizontal boundaries.
 */
const SCRUB = 0.9
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

  useLayoutEffect(() => {
    const section = sectionRef.current
    const sticky = stickyRef.current
    const inner = innerRef.current
    const progressFill = progressRef.current
    if (!section || !sticky || !inner) return

    const setSectionHeight = () => {
      const vh = window.innerHeight
      const scrollSpan = vh * (START_HOLD_VH + HORIZ_VH + END_HOLD_VH)
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

    const ctx = gsap.context(() => {
      setSectionHeight()

      const getTravelX = () => -(inner.scrollWidth - window.innerWidth)
      const total = START_HOLD_VH + HORIZ_VH + END_HOLD_VH
      const startFrac = START_HOLD_VH / total
      const horizFrac = HORIZ_VH / total
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
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onRefresh: setSectionHeight,
          onUpdate: (self) => {
            sticky.style.setProperty('--dxh-progress', String(self.progress))
            const hp = gsap.utils.clamp(0, 1, (self.progress - startFrac) / horizFrac)
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
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])

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
              const total = START_HOLD_VH + HORIZ_VH + END_HOLD_VH
              const hp = gsap.utils.clamp(
                0,
                1,
                (p - START_HOLD_VH / total) / (HORIZ_VH / total),
              )
              syncProtectionRef.current(hp)
            }}
          />
        </div>
      </div>
    </section>
  )
}
