import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'

const AI_VOICE_SRC = '/lottie/ai-voice.lottie'
const EYE_SRC = '/lottie/eye01.lottie'

/** Nét hơn khi zoom / Retina — mặc định lib chỉ dùng ~75% DPR. */
function voiceRenderConfig() {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return {
    devicePixelRatio: Math.min(Math.max(dpr * 1.5, 2), 3),
    autoResize: true,
  }
}

function pinFrame(instance: DotLottie | null, frame: number) {
  if (!instance) return
  try {
    instance.setLoop(false)
    instance.pause()
    instance.setFrame(frame)
  } catch {
    /* ignore */
  }
}

type AiVoiceFloatProps = {
  /** Hiện trên UI (giữ khi đang nhập liệu). */
  visible: boolean
  /**
   * Giữ API cũ — Lottie luôn loop khi `visible`.
   * Không dùng để chờ animation dừng; sync text chỉ theo vị trí GSAP.
   */
  playing: boolean
  top: number
  left: number
  /** Tăng khi Sửa / Quay lại — snap tới slot mới thay vì tween từ chỗ cũ. */
  snapKey?: number
  /** Bắt đầu trượt tới slot (vị trí) — text chưa được gõ. */
  onTravelStart?: () => void
  /** Đã đứng đúng slot của câu — typewriter được phép chạy. */
  onTravelEnd?: () => void
}

/** Thời lượng trượt theo khoảng cách (vị trí) — không liên quan vòng Lottie. */
export function voiceTravelDuration(distPx: number) {
  if (distPx < 0.75) return 0
  return Math.min(2.35, Math.max(1.15, distPx / 78))
}

/**
 * Một AI Voice duy nhất — luôn mount.
 * - `AI Voice.lottie` loop liên tục khi hiện; không pause/restart khi đổi chỗ.
 * - GSAP chỉ trượt x/y tới slot; onTravelStart/End = đến nơi so với text.
 * - Hiện/ẩn: fade mượt (trễ pause tới khi fade-out xong — tránh chớp tắt).
 */
export function AiVoiceFloat({
  visible,
  playing: _playing,
  top,
  left,
  snapKey = 0,
  onTravelStart,
  onTravelEnd,
}: AiVoiceFloatProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const playerRef = useRef<DotLottie | null>(null)
  const renderConfig = useRef(voiceRenderConfig()).current
  /** Lần đặt vị trí đầu (hoặc sau khi ẩn): snap, các lần sau mới tween chậm. */
  const snapNextRef = useRef(true)
  const placedRef = useRef(false)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const lastSnapKeyRef = useRef(snapKey)
  const loopOnRef = useRef(false)
  const onTravelStartRef = useRef(onTravelStart)
  const onTravelEndRef = useRef(onTravelEnd)
  onTravelStartRef.current = onTravelStart
  onTravelEndRef.current = onTravelEnd

  /** Class is-on/is-off theo visible; giữ mount để CSS fade chạy hết. */
  const [fadeOn, setFadeOn] = useState(visible)
  /** Sau fade-out mới pause Lottie. */
  const [engineOn, setEngineOn] = useState(visible)

  useEffect(() => {
    if (visible) {
      setFadeOn(true)
      setEngineOn(true)
      return
    }
    setFadeOn(false)
    const id = window.setTimeout(() => setEngineOn(false), 780)
    return () => window.clearTimeout(id)
  }, [visible])

  useEffect(() => {
    if (snapKey !== lastSnapKeyRef.current) {
      lastSnapKeyRef.current = snapKey
      snapNextRef.current = true
    }
  }, [snapKey])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    if (!placedRef.current && !visible) return

    if (snapNextRef.current || !placedRef.current) {
      tweenRef.current?.kill()
      tweenRef.current = null
      gsap.set(el, { x: left, y: top, force3D: true })
      snapNextRef.current = false
      placedRef.current = true
      onTravelEndRef.current?.()
      return
    }

    const curX = Number(gsap.getProperty(el, 'x')) || 0
    const curY = Number(gsap.getProperty(el, 'y')) || 0
    const dist = Math.hypot(left - curX, top - curY)
    if (dist < 0.75) {
      onTravelEndRef.current?.()
      return
    }

    const duration = voiceTravelDuration(dist)
    onTravelStartRef.current?.()
    tweenRef.current?.kill()
    tweenRef.current = gsap.to(el, {
      x: left,
      y: top,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
      force3D: true,
      onComplete: () => {
        tweenRef.current = null
        onTravelEndRef.current?.()
      },
    })
  }, [top, left, visible, snapKey])

  useEffect(() => {
    if (!visible) snapNextRef.current = true
  }, [visible])

  useEffect(() => {
    return () => {
      tweenRef.current?.kill()
    }
  }, [])

  /** Loop khi engineOn — không restart khi chỉ đổi vị trí. */
  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    try {
      if (engineOn) {
        p.setLoop(true)
        if (!loopOnRef.current) {
          p.setSpeed(1.05)
          p.play()
          loopOnRef.current = true
        }
      } else {
        loopOnRef.current = false
        p.setLoop(false)
        p.pause()
      }
    } catch {
      /* ignore */
    }
  }, [engineOn])

  useEffect(() => {
    const syncDpr = () => {
      const p = playerRef.current
      if (!p || typeof p.setRenderConfig !== 'function') return
      try {
        p.setRenderConfig(voiceRenderConfig())
        if (typeof p.resize === 'function') p.resize()
        if (engineOn) p.setLoop(true)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('resize', syncDpr)
    return () => window.removeEventListener('resize', syncDpr)
  }, [engineOn])

  const engineOnRef = useRef(engineOn)
  engineOnRef.current = engineOn

  return (
    <span
      ref={rootRef}
      className={`auth-cinema__ai-voice-float${fadeOn ? ' is-on' : ' is-off'}`}
      aria-hidden="true"
    >
      <span className="auth-cinema__ai-voice-inner">
        <DotLottieReact
          src={AI_VOICE_SRC}
          loop
          autoplay
          renderConfig={renderConfig}
          style={{ width: '100%', height: '100%' }}
          dotLottieRefCallback={(instance) => {
            playerRef.current = instance
            if (!instance) return
            const sync = () => {
              try {
                if (typeof instance.setRenderConfig === 'function') {
                  instance.setRenderConfig(voiceRenderConfig())
                }
                if (engineOnRef.current) {
                  instance.setLoop(true)
                  instance.setSpeed(1.05)
                  instance.play()
                  loopOnRef.current = true
                } else {
                  instance.setLoop(false)
                  instance.pause()
                  loopOnRef.current = false
                }
              } catch {
                /* ignore */
              }
            }
            instance.addEventListener('load', sync)
            instance.addEventListener('ready', sync)
            if (instance.isLoaded || instance.totalFrames > 0) sync()
          }}
        />
      </span>
    </span>
  )
}

/**
 * Eye01 — bật/tắt hiện mật khẩu.
 * Frame 0 = mắt mở (hiện chữ); frame 20 = mắt nhắm (*).
 * visible=true → mở; false → nhắm. Click chạy animation 0↔20.
 */
const EYE_OPEN_FRAME = 0
const EYE_CLOSED_FRAME = 20

export function PasswordEyeToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  const playerRef = useRef<DotLottie | null>(null)
  const readyRef = useRef(false)
  const animatingRef = useRef(false)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  const pinEye = (open: boolean) => {
    const p = playerRef.current
    if (!p) return
    pinFrame(p, open ? EYE_OPEN_FRAME : EYE_CLOSED_FRAME)
  }

  useEffect(() => {
    if (!readyRef.current || animatingRef.current) return
    pinEye(visible)
  }, [visible])

  const handleClick = () => {
    const next = !visible
    const p = playerRef.current
    onToggle()

    if (!p || !readyRef.current) return

    animatingRef.current = true
    try {
      p.setLoop(false)
      if (typeof p.setSpeed === 'function') p.setSpeed(1.25)
      if (typeof p.setSegment === 'function') {
        p.setSegment(EYE_OPEN_FRAME, EYE_CLOSED_FRAME)
      }

      const onComplete = () => {
        p.removeEventListener('complete', onComplete)
        animatingRef.current = false
        pinEye(visibleRef.current)
      }
      p.addEventListener('complete', onComplete)

      if (next) {
        // Nhắm → mở: chạy ngược 20 → 0
        if (typeof p.setMode === 'function') p.setMode('reverse')
        p.setFrame(EYE_CLOSED_FRAME)
      } else {
        // Mở → nhắm: chạy xuôi 0 → 20
        if (typeof p.setMode === 'function') p.setMode('forward')
        p.setFrame(EYE_OPEN_FRAME)
      }
      p.play()
    } catch {
      animatingRef.current = false
      pinEye(next)
    }
  }

  return (
    <button
      type="button"
      className={`auth-cinema__eye-btn${visible ? ' is-visible' : ''}`}
      onClick={handleClick}
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      aria-pressed={visible}
    >
      <DotLottieReact
        src={EYE_SRC}
        loop={false}
        autoplay={false}
        style={{ width: '100%', height: '100%' }}
        dotLottieRefCallback={(instance) => {
          playerRef.current = instance
          if (!instance) return
          const sync = () => {
            readyRef.current = instance.totalFrames > 0 || instance.isLoaded
            if (!readyRef.current) return
            try {
              instance.setLoop(false)
              if (typeof instance.setSegment === 'function') {
                instance.setSegment(EYE_OPEN_FRAME, EYE_CLOSED_FRAME)
              }
            } catch {
              /* ignore */
            }
            if (!animatingRef.current) pinEye(visibleRef.current)
          }
          instance.addEventListener('load', sync)
          instance.addEventListener('ready', sync)
          if (instance.isLoaded || instance.totalFrames > 0) sync()
        }}
      />
    </button>
  )
}
