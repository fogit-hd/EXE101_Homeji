import { useCallback, useEffect, useRef, useState } from 'react'

import './HomejiLoader.css'

/** Độ dài intro Blender: 63 frames @ 30fps */
export const HOMEJI_INTRO_MS = 2100

type HomejiLoaderProps = {
  label?: string
  fullPage?: boolean
  className?: string
  /** Thông báo dưới loader (vd. lỗi hệ thống) */
  message?: string
  /** Gọi khi ngôi sao + chữ pop xong (trước phase loop) */
  onIntroComplete?: () => void
}

type Phase = 'intro' | 'loop'
type Mode = 'video' | 'gif'

/**
 * Animation export từ Blender:
 * - intro: ngôi sao pop → chữ HOMEJI pop (1 lần, luôn chạy hết)
 * - loop: chữ pulse + ngôi sao thở (chỉ khi vẫn còn loading sau intro)
 */
export function HomejiLoader({
  label = 'Đang tải...',
  fullPage = false,
  className = '',
  message,
  onIntroComplete,
}: HomejiLoaderProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<Mode>('video')
  const introRef = useRef<HTMLVideoElement>(null)
  const loopRef = useRef<HTMLVideoElement>(null)
  const introNotified = useRef(false)

  const finishIntro = useCallback(() => {
    setPhase('loop')
    if (!introNotified.current) {
      introNotified.current = true
      onIntroComplete?.()
    }
  }, [onIntroComplete])

  useEffect(() => {
    if (mode !== 'video') return
    const intro = introRef.current
    if (!intro) return

    const fail = () => setMode('gif')

    intro.addEventListener('ended', finishIntro)
    intro.addEventListener('error', fail)
    void intro.play().catch(fail)

    return () => {
      intro.removeEventListener('ended', finishIntro)
      intro.removeEventListener('error', fail)
    }
  }, [mode, finishIntro])

  useEffect(() => {
    if (mode !== 'video' || phase !== 'loop') return
    const loop = loopRef.current
    if (!loop) return
    void loop.play().catch(() => setMode('gif'))
  }, [mode, phase])

  useEffect(() => {
    if (mode !== 'gif' || phase !== 'intro') return
    const t = window.setTimeout(finishIntro, HOMEJI_INTRO_MS)
    return () => window.clearTimeout(t)
  }, [mode, phase, finishIntro])

  const statusLabel = message || label

  return (
    <div
      className={`homeji-loader ${fullPage ? 'homeji-loader--full' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
    >
      <div className="homeji-loader__mark">
        {mode === 'video' ? (
          <>
            <video
              ref={introRef}
              className={`homeji-loader__media ${phase === 'intro' ? 'is-active' : ''}`}
              src="/loading/homeji_loading_intro.webm"
              muted
              playsInline
              preload="auto"
            />
            <video
              ref={loopRef}
              className={`homeji-loader__media ${phase === 'loop' ? 'is-active' : ''}`}
              src="/loading/homeji_loading_loop.webm"
              muted
              playsInline
              loop
              preload="auto"
            />
          </>
        ) : (
          <img
            className="homeji-loader__media is-active"
            src={
              phase === 'intro'
                ? '/loading/homeji_loading_intro.gif'
                : '/loading/homeji_loading_loop.gif'
            }
            alt=""
            draggable={false}
            decoding="async"
          />
        )}
      </div>
      {label ? <p className="homeji-loader__label">{label}</p> : null}
      {message ? <p className="homeji-loader__message">{message}</p> : null}
    </div>
  )
}
