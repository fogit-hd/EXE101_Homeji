import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnReconnect } from '../contexts/NetworkStatusContext'
import { getErrorMessage, isServiceDisruption } from '../lib/errors'
import './HomejiLoader.css'

/** Độ dài intro Blender: 63 frames @ 30fps */
export const HOMEJI_INTRO_MS = 2100
/** Khi sự cố hệ thống/mạng — retry nền mỗi 5s */
export const SERVICE_RETRY_MS = 5000

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
 * Giữ loader đến khi data xong VÀ intro (sao + chữ) đã pop xong.
 * Tránh unmount giữa intro → giảm giật khi API trả về quá nhanh.
 *
 * `forceHold`: sự cố hệ thống/mạng — giữ loop vô hạn đến khi hết sự cố.
 */
export function useHomejiLoading(isLoading: boolean, forceHold = false) {
  const [introDone, setIntroDone] = useState(!isLoading && !forceHold)
  const [holding, setHolding] = useState(isLoading || forceHold)

  useEffect(() => {
    if (isLoading && !forceHold) {
      // Load mới: chạy lại intro
      setIntroDone(false)
      setHolding(true)
    } else if (isLoading || forceHold) {
      // Retry khi sự cố: giữ phase loop, không reset intro
      setHolding(true)
    }
  }, [isLoading, forceHold])

  useEffect(() => {
    if (!isLoading && !forceHold && introDone) setHolding(false)
  }, [isLoading, forceHold, introDone])

  const onIntroComplete = useCallback(() => setIntroDone(true), [])

  return {
    showLoader: isLoading || forceHold || holding,
    onIntroComplete,
  }
}

type PersistentLoadResult = {
  showLoader: boolean
  onIntroComplete: () => void
  error: string
  disrupted: boolean
  reload: () => Promise<void>
}

/**
 * Load dữ liệu; nếu mạng/server sự cố → giữ GIF loop + tự retry
 * đến khi thành công rồi mới hiện nội dung (không cần F5).
 */
export function usePersistentLoad(
  loadFn: () => Promise<void>,
  deps: unknown[] = [],
  options?: { enabled?: boolean; retryIntervalMs?: number },
): PersistentLoadResult {
  const enabled = options?.enabled ?? true
  const retryIntervalMs = options?.retryIntervalMs ?? SERVICE_RETRY_MS
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disrupted, setDisrupted] = useState(false)
  const loadFnRef = useRef(loadFn)
  loadFnRef.current = loadFn
  const inFlight = useRef(false)
  const disruptedRef = useRef(false)
  disruptedRef.current = disrupted

  const { showLoader, onIntroComplete } = useHomejiLoading(loading, disrupted)

  const reload = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true
    // Khi sự cố: giữ loop + message, không flip loading (tránh reset intro)
    if (!disruptedRef.current) setLoading(true)
    try {
      await loadFnRef.current()
      setError('')
      setDisrupted(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setDisrupted(isServiceDisruption(err))
    } finally {
      setLoading(false)
      inFlight.current = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setDisrupted(false)
      return
    }
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...deps])

  useOnReconnect(() => {
    if (enabled) void reload()
  })

  useEffect(() => {
    if (!enabled || !disrupted) return
    const t = window.setInterval(() => void reload(), retryIntervalMs)
    return () => window.clearInterval(t)
  }, [enabled, disrupted, reload, retryIntervalMs])

  return { showLoader, onIntroComplete, error, disrupted, reload }
}

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
