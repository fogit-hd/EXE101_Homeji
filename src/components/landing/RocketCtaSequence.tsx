import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './RocketCtaSequence.css'

/** video-src/Rocket.lottie — flies left → top-right with built-in sway */
const ROCKET_SRC = '/lottie/rocket.lottie'
const HIGHLIGHT_SRC = '/lottie/text-highlight-blue.lottie'
const CLICK_SRC = '/lottie/click-mouse.lottie'
const CONFETTI_SRC = '/lottie/exploding-ribbon-confetti.lottie'

/** Asset is 180f @ 30fps ≈ 6s; keep readable */
const ROCKET_SPEED = 0.72
/** Chat-style letter reveal — must finish before rocket ends (~8.3s wall) */
const TEXT_START_DELAY = 0.45
const CHAR_STAGGER = 0.038
const CHAR_DURATION = 0.32
/** Fade copy out so it’s gone when the rocket clip ends */
const TEXT_OUT_BEFORE_END_MS = 900

const MESSAGE_LINES = [
  'Kết nối với Homeji',
  'chỉ cần một lần chạm thôi.',
] as const
const HIGHLIGHT_TO_CLICK_MS = 2600
const CLICK_SAFETY_MS = 2400
const CLICK_Y_OFFSET = 6
const CONFETTI_Y_OFFSET = -148

const HIGHLIGHT_SPEED = 1.55
const CLICK_SPEED = 0.85
const CONFETTI_SPEED = 0.62

type Phase = 'intro' | 'cta'

type Props = {
  open: boolean
  onFinished: () => void
}

type Box = { x: number; y: number; w: number; h: number }

function rectCenter(el: HTMLElement): Box {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
}

function heroReserveBtn() {
  return document.querySelector('#hero-start-cta .guest-hero__reserve') as HTMLElement | null
}

function splitChatChars(text: string) {
  return Array.from(text).map((ch, i) => ({
    key: `${i}-${ch}`,
    ch: ch === ' ' ? '\u00A0' : ch,
    space: ch === ' ',
  }))
}

/**
 * Intro: full-bleed Rocket.lottie (covers BG) + chat-style letter reveal.
 * When rocket ends, copy is already gone → hero CTA beat.
 */
export function RocketCtaSequence({ open, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [heroBox, setHeroBox] = useState<Box | null>(null)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showClick, setShowClick] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [rocketKey, setRocketKey] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const highlightWrapRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const clickDoneRef = useRef(false)
  const introDoneRef = useRef(false)

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  const armTimeout = (fn: () => void, ms: number, session: number) => {
    const id = window.setTimeout(() => {
      if (sessionRef.current !== session) return
      fn()
    }, ms)
    timersRef.current.push(id)
    return id
  }

  useEffect(() => {
    if (!open) return

    const session = ++sessionRef.current
    clickDoneRef.current = false
    introDoneRef.current = false
    clearTimers()

    setPhase('intro')
    setHeroBox(null)
    setShowHighlight(false)
    setShowClick(false)
    setShowConfetti(false)
    setRocketKey((k) => k + 1)
    pauseGuestCoast()

    // Double rAF: wait until intro DOM (chars + rocket mount) is committed
    let boot2 = 0
    const boot1 = window.requestAnimationFrame(() => {
      boot2 = window.requestAnimationFrame(() => {
        if (sessionRef.current !== session) return

        const tagline = taglineRef.current
        const veil = veilRef.current
        const stage = stageRef.current
        const root = rootRef.current
        if (!tagline || !veil || !stage || !root) return

        const cta = document.querySelector('.guest-fixed-cta') as HTMLElement | null
        if (cta) gsap.to(cta, { autoAlpha: 0, duration: 0.2, overwrite: true })

        const hero = document.getElementById('hero')
        if (hero) {
          const y = Math.max(0, Math.round(window.scrollY + hero.getBoundingClientRect().top))
          window.scrollTo(0, y)
        }

        gsap.killTweensOf([tagline, veil, stage])
        gsap.set(root, { autoAlpha: 1 })
        gsap.set(stage, { autoAlpha: 1 })
        gsap.set(veil, { autoAlpha: 1 })
        gsap.set(tagline, { autoAlpha: 1 })

        const chars = tagline.querySelectorAll<HTMLElement>('.rocket-seq__char')
        gsap.set(chars, { y: 18, opacity: 0, rotate: -4 })
        gsap.to(chars, {
          y: 0,
          opacity: 1,
          rotate: 0,
          duration: CHAR_DURATION,
          ease: 'back.out(2.2)',
          stagger: CHAR_STAGGER,
          delay: TEXT_START_DELAY,
          overwrite: true,
        })
      })
    })

    return () => {
      sessionRef.current += 1
      window.cancelAnimationFrame(boot1)
      window.cancelAnimationFrame(boot2)
      clearTimers()
      gsap.killTweensOf([
        taglineRef.current,
        veilRef.current,
        stageRef.current,
        highlightWrapRef.current,
        heroReserveBtn(),
      ].filter(Boolean))
      const btn = heroReserveBtn()
      if (btn) gsap.set(btn, { clearProps: 'transform' })
      const cta = document.querySelector('.guest-fixed-cta') as HTMLElement | null
      if (cta) gsap.set(cta, { clearProps: 'opacity,visibility' })
      resumeGuestCoast()
    }
  }, [open])

  const goToCtaBeat = (session: number) => {
    if (sessionRef.current !== session || introDoneRef.current) return
    introDoneRef.current = true

    const tagline = taglineRef.current
    const veil = veilRef.current
    const stage = stageRef.current

    // Ensure copy is gone, then reveal hero
    if (tagline) gsap.set(tagline, { autoAlpha: 0 })
    gsap.to([veil, stage].filter(Boolean), {
      autoAlpha: 0,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        if (sessionRef.current !== session) return
        const wrap = document.getElementById('hero-start-cta')
        if (wrap) setHeroBox(rectCenter(wrap))
        setPhase('cta')
        setShowHighlight(true)
        // Next paint: ensure highlight wrapper isn’t stuck invisible from a prior GSAP fade
        armTimeout(() => {
          const hl = highlightWrapRef.current
          if (hl) gsap.set(hl, { autoAlpha: 1 })
        }, 0, session)

        armTimeout(() => {
          setShowClick(true)
          setShowConfetti(true)
          const hl = highlightWrapRef.current
          if (hl) {
            gsap.to(hl, { autoAlpha: 0, duration: 0.45, ease: 'power1.out', delay: 0.1 })
          }
          const btn = heroReserveBtn()
          if (btn) {
            gsap.fromTo(
              btn,
              { scale: 1 },
              {
                scale: 0.94,
                duration: 0.14,
                ease: 'power2.in',
                yoyo: true,
                repeat: 1,
                transformOrigin: '50% 50%',
                overwrite: true,
              },
            )
          }
        }, HIGHLIGHT_TO_CLICK_MS, session)
      },
    })
  }

  const onRocketComplete = () => {
    const session = sessionRef.current
    // Text should already be faded; force-clear then hand off
    const tagline = taglineRef.current
    if (tagline) gsap.set(tagline, { autoAlpha: 0 })
    goToCtaBeat(session)
  }

  const finishAll = (session: number) => {
    if (sessionRef.current !== session) return

    const btn = heroReserveBtn()
    if (btn) gsap.set(btn, { clearProps: 'transform' })

    const cta = document.querySelector('.guest-fixed-cta') as HTMLElement | null
    if (cta) gsap.set(cta, { clearProps: 'opacity,visibility' })

    resumeGuestCoast()
    onFinished()
  }

  const onClickDone = () => {
    if (clickDoneRef.current) return
    clickDoneRef.current = true
    const session = sessionRef.current
    armTimeout(() => finishAll(session), 400, session)
  }

  if (!open) return null

  return (
    <div className="rocket-seq" ref={rootRef} aria-hidden="true">
      <div className="rocket-seq__veil" ref={veilRef} />

      <div className="rocket-seq__stage" ref={stageRef}>
        <div className="rocket-seq__rocket">
          {phase === 'intro' && (
            <DotLottieReact
              key={`rocket-${rocketKey}`}
              src={ROCKET_SRC}
              loop={false}
              autoplay
              speed={ROCKET_SPEED}
              style={{ width: '100%', height: '100%' }}
              dotLottieRefCallback={(instance) => {
                if (!instance) return
                const session = sessionRef.current
                const done = () => {
                  instance.removeEventListener('complete', done)
                  if (sessionRef.current !== session) return
                  onRocketComplete()
                }
                instance.addEventListener('complete', done)
                instance.addEventListener('load', () => {
                  instance.setLoop(false)
                  // Fade text out before the clip ends
                  const totalMs =
                    instance.totalFrames > 0 && instance.duration > 0
                      ? (instance.duration * 1000) / ROCKET_SPEED
                      : 6000 / ROCKET_SPEED
                  armTimeout(() => {
                    const el = taglineRef.current
                    if (!el) return
                    const chars = el.querySelectorAll<HTMLElement>('.rocket-seq__char')
                    gsap.to(chars, {
                      y: -8,
                      opacity: 0,
                      duration: 0.28,
                      ease: 'power1.in',
                      stagger: 0.012,
                      overwrite: true,
                    })
                    gsap.to(el, { autoAlpha: 0, duration: 0.35, delay: 0.2 })
                  }, Math.max(800, totalMs - TEXT_OUT_BEFORE_END_MS), session)
                })
                // Safety if complete never fires (~6s / speed + buffer)
                armTimeout(onRocketComplete, 9500, session)
              }}
            />
          )}
        </div>

        <p ref={taglineRef} className="rocket-seq__tagline" aria-label={MESSAGE_LINES.join(' ')}>
          {MESSAGE_LINES.map((line, li) => (
            <span key={line} className={`rocket-seq__line${li > 0 ? ' rocket-seq__line--sub' : ''}`}>
              {splitChatChars(line).map(({ key, ch, space }) => (
                <span
                  key={`${li}-${key}`}
                  className={`rocket-seq__char${space ? ' is-space' : ''}`}
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>

      {phase === 'cta' && heroBox && showHighlight && (
        <div
          className="rocket-seq__highlight"
          ref={highlightWrapRef}
          style={{
            left: heroBox.x,
            top: heroBox.y,
            width: Math.max(heroBox.w * 0.92, 118),
            height: Math.max(heroBox.h * 1.45, 56),
          }}
        >
          <DotLottieReact
            key={`hl-${rocketKey}`}
            src={HIGHLIGHT_SRC}
            loop={false}
            autoplay
            speed={HIGHLIGHT_SPEED}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      {phase === 'cta' && heroBox && showClick && (
        <div
          className="rocket-seq__click"
          style={{ left: heroBox.x, top: heroBox.y + CLICK_Y_OFFSET }}
        >
          <DotLottieReact
            key={`click-${rocketKey}`}
            src={CLICK_SRC}
            loop={false}
            autoplay
            speed={CLICK_SPEED}
            style={{ width: '100%', height: '100%' }}
            dotLottieRefCallback={(instance) => {
              if (!instance) return
              const session = sessionRef.current
              const done = () => {
                instance.removeEventListener('complete', done)
                if (sessionRef.current !== session) return
                onClickDone()
              }
              instance.addEventListener('complete', done)
              armTimeout(onClickDone, CLICK_SAFETY_MS, session)
            }}
          />
        </div>
      )}

      {phase === 'cta' && heroBox && showConfetti && (
        <div
          className="rocket-seq__confetti"
          style={{ left: heroBox.x, top: heroBox.y + CONFETTI_Y_OFFSET }}
        >
          <DotLottieReact
            key={`confetti-${rocketKey}`}
            src={CONFETTI_SRC}
            loop={false}
            autoplay
            speed={CONFETTI_SPEED}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  )
}
