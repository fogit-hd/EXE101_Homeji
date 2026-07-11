import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const CONNECTION_SRC = '/lottie/connection.lottie'
const SAD_SRC = '/lottie/sad-animation.lottie'
const ERROR_ICON_SRC = '/lottie/error.lottie'

let warmStarted = false
/** Prefetch Connection + Sad + Error icon vào cache. */
export function warmConnectLottie() {
  if (warmStarted || typeof window === 'undefined') return
  warmStarted = true
  for (const href of [CONNECTION_SRC, SAD_SRC, ERROR_ICON_SRC]) {
    void fetch(href, { cache: 'force-cache' }).catch(() => {})
  }
}

/**
 * CTA “Kết nối với Homeji”:
 * - Click → Connection.lottie trong nút
 * - Lỗi API → Sad + mây: mount error.lottie khi mây hiện → play 1 lần → typewriter
 */
export function ConnectHomejiCta({
  label,
  connecting,
  error,
  onConnect,
}: {
  label: string
  connecting: boolean
  error: string
  onConnect: () => void
}) {
  const [typed, setTyped] = useState('')
  const [cloudReady, setCloudReady] = useState(false)
  const [iconDone, setIconDone] = useState(false)
  const [wrap, setWrap] = useState(false)
  const measureRef = useRef<HTMLSpanElement>(null)
  const failRef = useRef<HTMLDivElement>(null)
  const iconDoneRef = useRef(false)
  const playedRef = useRef(false)
  const showFail = Boolean(error) && !connecting

  useEffect(() => {
    warmConnectLottie()
  }, [])

  const markIconDone = useCallback(() => {
    if (iconDoneRef.current) return
    iconDoneRef.current = true
    setIconDone(true)
  }, [])

  /** Chỉ quyết định wrap — width mây để CSS max-content (tránh border-box cắt chữ). */
  useLayoutEffect(() => {
    if (!showFail || !error || !measureRef.current) {
      setWrap(false)
      return
    }
    const sync = () => {
      const measure = measureRef.current
      if (!measure) return
      const mobile = window.matchMedia('(max-width: 900px)').matches
      const natural = Math.ceil(measure.getBoundingClientRect().width)
      const iconPx = mobile ? 36 : 44
      const padX = mobile ? 40 : 56
      const maxW = mobile
        ? Math.min(window.innerWidth - 24, 420)
        : Math.min(window.innerWidth - 120, 820)
      setWrap(natural + iconPx + padX > maxW)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [showFail, error])

  /** Mây fade-in trước — rồi mới mount + play error.lottie (tránh chạy lúc ẩn). */
  useEffect(() => {
    if (!showFail || !error) {
      setTyped('')
      setCloudReady(false)
      setIconDone(false)
      iconDoneRef.current = false
      playedRef.current = false
      return
    }
    setCloudReady(false)
    setIconDone(false)
    iconDoneRef.current = false
    playedRef.current = false
    setTyped('')

    const cloudInId = window.setTimeout(() => setCloudReady(true), 280)
    return () => window.clearTimeout(cloudInId)
  }, [showFail, error])

  useEffect(() => {
    if (!showFail || !error || !iconDone) return
    let i = 0
    const intervalId = window.setInterval(() => {
      i += 1
      setTyped(error.slice(0, i))
      if (i >= error.length) window.clearInterval(intervalId)
    }, 18)
    return () => window.clearInterval(intervalId)
  }, [showFail, error, iconDone])

  useEffect(() => {
    if (!showFail || !failRef.current) return
    const id = window.setTimeout(() => {
      failRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 120)
    return () => window.clearTimeout(id)
  }, [showFail])

  /** Failsafe nếu complete không fire (~ duration lottie + buffer). */
  useEffect(() => {
    if (!showFail || !cloudReady || iconDone) return
    const id = window.setTimeout(markIconDone, 3200)
    return () => window.clearTimeout(id)
  }, [showFail, cloudReady, iconDone, error, markIconDone])

  const bindErrorPlayer = useCallback(
    (instance: DotLottie | null) => {
      if (!instance) return

      const finish = () => {
        try {
          if (instance.totalFrames > 0) {
            instance.setFrame(instance.totalFrames - 1)
            instance.pause()
          }
        } catch {
          /* ignore */
        }
        markIconDone()
      }

      const kick = () => {
        if (playedRef.current || iconDoneRef.current) return
        if (!instance.isLoaded && instance.totalFrames <= 0) return
        playedRef.current = true
        try {
          instance.setLoop(false)
          if (typeof instance.setMode === 'function') instance.setMode('forward')
          if (typeof instance.setSpeed === 'function') instance.setSpeed(0.9)
          // Chạy full composition — không cắt segment (tránh nhảy frame cuối)
          if (typeof instance.setSegment === 'function' && instance.totalFrames > 1) {
            instance.setSegment(0, instance.totalFrames - 1)
          }
          instance.setFrame(0)
          instance.play()
        } catch {
          finish()
        }
      }

      const onComplete = () => {
        instance.removeEventListener('complete', onComplete)
        finish()
      }

      instance.addEventListener('complete', onComplete)
      instance.addEventListener('load', kick)
      instance.addEventListener('ready', kick)
      kick()
    },
    [markIconDone],
  )

  return (
    <div className={`auth-connect${connecting ? ' is-connecting' : ''}${showFail ? ' is-fail' : ''}`}>
      <div className="auth-connect__stage">
        <button
          type="button"
          className="auth-connect__btn"
          disabled={connecting}
          onClick={onConnect}
          aria-busy={connecting}
        >
          <span className="auth-connect__edge" aria-hidden="true" />
          <span className="auth-connect__fill" aria-hidden="true" />
          <span className="auth-connect__label">{label}</span>
          {connecting ? (
            <span className="auth-connect__spin" aria-hidden="true">
              <DotLottieReact
                src={CONNECTION_SRC}
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </span>
          ) : null}
        </button>

        {showFail ? (
          <div ref={failRef} className="auth-connect__fail" role="alert">
            <div className="auth-connect__sad" aria-hidden="true">
              <DotLottieReact
                src={SAD_SRC}
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className={`auth-connect__cloud${cloudReady ? ' is-on' : ''}${wrap ? ' is-wrap' : ''}`}>
              <div className="auth-connect__cloud-row">
                <span className="auth-connect__cloud-icon" aria-hidden="true">
                  {cloudReady ? (
                    <DotLottieReact
                      key={`err-icon-${error}`}
                      src={ERROR_ICON_SRC}
                      loop={false}
                      autoplay
                      style={{ width: '100%', height: '100%' }}
                      dotLottieRefCallback={bindErrorPlayer}
                    />
                  ) : null}
                </span>
                <p className="auth-connect__cloud-text">
                  {iconDone ? typed || '\u00a0' : '\u00a0'}
                  {iconDone && typed.length < error.length ? (
                    <span className="auth-connect__cloud-caret" aria-hidden="true" />
                  ) : null}
                </p>
              </div>
            </div>
            <span ref={measureRef} className="auth-connect__cloud-measure" aria-hidden="true">
              {error}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
