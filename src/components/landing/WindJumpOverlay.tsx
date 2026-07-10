import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import './WindJumpOverlay.css'

/** Same file as video-src/Windblow.lottie (copied into public/) */
const WIND_SRC = '/lottie/windblow.lottie'

/**
 * Frame window for ONE gust — edit these to taste.
 *
 * Asset timeline (25fps, total ~0–133):
 *   gust 1 ≈ 0–34   ← use this for a single blow
 *   gust 2 ≈ 28–65  (overlaps gust 1 a bit)
 *   gust 3 ≈ 61–98
 *   gust 4 ≈ 94–133
 *
 * WIND_SEGMENT = [startFrame, endFrame] (inclusive play range)
 * Tip: if you still see 2 blows, lower endFrame (e.g. 28–30).
 *      if the gust feels cut off, raise endFrame (e.g. 36–38).
 */
const WIND_SEGMENT: [number, number] = [0, 28]

/** Playback rate (1 = normal). Higher = shorter jump. */
const WIND_SPEED = 2.1

/** Failsafe close if Lottie `complete` never fires (ms). */
const WIND_SAFETY_MS = 1100

const CONTENT_SEL =
  '.guest-landing > .guest-hero, .guest-landing > section, .guest-landing > .dxh-scroll-outer'

export type WindDirection = 'down' | 'up'

type Props = {
  open: boolean
  direction: WindDirection
  destY: number
  onLand: (destY: number) => void
  onFinished: () => void
}

/**
 * `direction` = travel direction of the page jump.
 * Wind blows against travel (physics):
 * - travel down → wind moves up the screen
 * - travel up   → wind moves down the screen
 *
 * Rotation is applied via GSAP on the spin node (not CSS), so it cannot be
 * clobbered by autoAlpha / force3D on the fade wrapper.
 */
export function WindJumpOverlay({ open, direction, destY, onLand, onFinished }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<DotLottie | null>(null)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const landedRef = useRef(false)
  const safetyRef = useRef(0)
  const destYRef = useRef(destY)
  const onLandRef = useRef(onLand)
  const onFinishedRef = useRef(onFinished)
  destYRef.current = destY
  onLandRef.current = onLand
  onFinishedRef.current = onFinished

  useEffect(() => {
    if (!open) return

    startedRef.current = false
    finishedRef.current = false
    landedRef.current = false

    const root = rootRef.current
    const stage = stageRef.current
    const spin = spinRef.current
    const content = gsap.utils.toArray<HTMLElement>(CONTENT_SEL)
    if (!root || !stage || !spin) return

    gsap.killTweensOf([root, stage, spin, ...content])
    gsap.set(root, { autoAlpha: 1 })
    // opacity only on stage — never touch its transform
    gsap.set(stage, { opacity: 0, visibility: 'visible' })

    // Source Lottie: particles move right → left.
    // CSS/GSAP positive rotation is clockwise:
    //   -90deg → motion goes up the screen
    //   +90deg → motion goes down the screen
    // Travel down → wind against = up → -90
    // Travel up   → wind against = down → +90
    const windRot = direction === 'down' ? -90 : 90
    gsap.set(spin, { rotation: windRot, transformOrigin: '50% 50%', force3D: true })

    // Content blown by the wind (same direction as wind particles)
    const blowY = direction === 'down' ? '-20vh' : '20vh'
    const enterY = direction === 'down' ? '14vh' : '-14vh'

    void fetch(WIND_SRC, { cache: 'force-cache' }).catch(() => {})

    const land = () => {
      if (landedRef.current) return
      landedRef.current = true
      onLandRef.current(destYRef.current)
    }

    const finish = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      window.clearTimeout(safetyRef.current)
      try {
        playerRef.current?.pause()
      } catch {
        /* ignore */
      }
      gsap.set(content, { clearProps: 'transform,filter,opacity' })
      onFinishedRef.current()
    }

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: finish,
    })

    tl.to(stage, { opacity: 1, duration: 0.12, ease: 'power1.out' }, 0)

    tl.to(
      content,
      {
        y: blowY,
        opacity: 0.5,
        filter: 'blur(5px)',
        duration: 0.34,
        ease: 'power2.in',
        stagger: 0.012,
      },
      0,
    )

    tl.add(land, 0.3)

    tl.fromTo(
      content,
      { y: enterY, opacity: 0.4, filter: 'blur(4px)' },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.42,
        ease: 'power2.out',
        stagger: 0.014,
      },
      0.32,
    )

    tl.to(stage, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0.58)
    tl.to(root, { autoAlpha: 0, duration: 0.18, ease: 'power1.out' }, 0.72)

    window.clearTimeout(safetyRef.current)
    safetyRef.current = window.setTimeout(finish, WIND_SAFETY_MS)

    return () => {
      window.clearTimeout(safetyRef.current)
      tl.kill()
      gsap.killTweensOf([root, stage, spin, ...content])
      gsap.set(content, { clearProps: 'transform,filter,opacity' })
    }
  }, [open, direction])

  if (!open) return null

  return (
    <div
      className="wind-jump"
      data-wind-travel={direction}
      ref={rootRef}
      aria-hidden="true"
    >
      <div className="wind-jump__stage" ref={stageRef}>
        <div className="wind-jump__spin" ref={spinRef}>
          <DotLottieReact
            key={`wind-${direction}`}
            src={WIND_SRC}
            loop={false}
            speed={WIND_SPEED}
            segment={WIND_SEGMENT}
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
            dotLottieRefCallback={(instance) => {
              playerRef.current = instance
              if (!instance) return

              const begin = () => {
                if (startedRef.current || finishedRef.current) return
                if (!instance.isLoaded && instance.totalFrames <= 0) return
                startedRef.current = true

                instance.setLoop(false)
                instance.setMode('forward')
                if (typeof instance.setSpeed === 'function') instance.setSpeed(WIND_SPEED)
                if (typeof instance.setSegment === 'function') {
                  instance.setSegment(WIND_SEGMENT[0], WIND_SEGMENT[1])
                }
                try {
                  instance.setFrame(WIND_SEGMENT[0])
                } catch {
                  /* ignore */
                }
                instance.play()
              }

              instance.addEventListener('load', begin)
              instance.addEventListener('ready', begin)
              begin()
            }}
          />
        </div>
      </div>
    </div>
  )
}
