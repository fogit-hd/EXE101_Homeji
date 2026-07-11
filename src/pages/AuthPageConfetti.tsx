import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const SUCCESS_SRC = '/lottie/success-confetti.lottie'
const WRONG_SRC = '/lottie/perfect-wrong.lottie'

const ASSETS = [SUCCESS_SRC, WRONG_SRC] as const

/** Prefetch cả 2 lottie vào HTTP cache. */
let warmStarted = false
export function warmConfettiLottie() {
  if (warmStarted || typeof window === 'undefined') return
  warmStarted = true
  for (const href of ASSETS) {
    void fetch(href, { cache: 'force-cache' }).catch(() => {})
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.href = href
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }
}

type Phase = 'idle' | 'checking' | 'wrong' | 'wrong-hold' | 'recovering' | 'playing' | 'done'

type Props = {
  /** Sync hoặc async (vd. check-email API). */
  onValidate: () => boolean | Promise<boolean>
  onSuccess: () => void
  /** Gọi khi validate fail — parent hiện lỗi inline. */
  onInvalid?: () => void
  label?: string
  resetKey?: string | number
}

export type ConfettiConfirmHandle = {
  confirm: () => void
}

function pinLast(instance: DotLottie | null) {
  if (!instance || instance.totalFrames <= 0) return
  try {
    instance.setLoop(false)
    instance.pause()
    instance.setFrame(Math.max(0, instance.totalFrames - 1))
  } catch {
    /* ignore */
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

function tryPlay(instance: DotLottie | null, speed = 1): boolean {
  if (!instance) return false
  try {
    instance.setLoop(false)
    instance.setSpeed(speed)
    instance.setFrame(0)
    instance.play()
    return true
  } catch {
    return false
  }
}

/**
 * Idle: ✓ xanh.
 * Sai: Perfect Wrong → freeze frame cuối; sai tiếp → replay.
 * Đúng sau khi sai: crossfade Wrong → success confetti → onSuccess.
 * Đúng lần đầu: success confetti như cũ.
 */
export const ConfettiConfirmButton = forwardRef<ConfettiConfirmHandle, Props>(
  function ConfettiConfirmButton(
    { onValidate, onSuccess, onInvalid, label = 'Xác nhận', resetKey },
    ref,
  ) {
    const [phase, setPhase] = useState<Phase>('idle')
    const successRef = useRef<DotLottie | null>(null)
    const wrongRef = useRef<DotLottie | null>(null)
    const runId = useRef(0)
    const phaseRef = useRef(phase)
    const hadWrongRef = useRef(false)
    const onSuccessCb = useRef(onSuccess)
    const onValidateCb = useRef(onValidate)
    const onInvalidCb = useRef(onInvalid)
    phaseRef.current = phase
    onSuccessCb.current = onSuccess
    onValidateCb.current = onValidate
    onInvalidCb.current = onInvalid

    useEffect(() => {
      warmConfettiLottie()
    }, [])

    useEffect(() => {
      runId.current += 1
      hadWrongRef.current = false
      phaseRef.current = 'idle'
      setPhase('idle')
      pinFrame(successRef.current, 0)
      pinFrame(wrongRef.current, 0)
    }, [resetKey])

    const finishSuccess = useCallback((instance: DotLottie | null) => {
      pinLast(instance)
      phaseRef.current = 'done'
      setPhase('done')
      window.setTimeout(() => onSuccessCb.current(), 180)
    }, [])

    const playWrong = useCallback(() => {
      const id = ++runId.current
      hadWrongRef.current = true
      phaseRef.current = 'wrong'
      setPhase('wrong')
      onInvalidCb.current?.()

      const w = wrongRef.current
      if (!tryPlay(w, 1.15) || !w) {
        phaseRef.current = 'wrong-hold'
        setPhase('wrong-hold')
        return
      }

      const onComplete = () => {
        if (runId.current !== id) return
        w.removeEventListener('complete', onComplete)
        pinLast(w)
        phaseRef.current = 'wrong-hold'
        setPhase('wrong-hold')
      }
      w.addEventListener('complete', onComplete)
      window.setTimeout(() => {
        if (runId.current !== id) return
        if (phaseRef.current === 'wrong') {
          w.removeEventListener('complete', onComplete)
          pinLast(w)
          phaseRef.current = 'wrong-hold'
          setPhase('wrong-hold')
        }
      }, 3500)
    }, [])

    const playSuccess = useCallback(
      (fromWrong: boolean) => {
        const id = ++runId.current
        if (fromWrong) {
          phaseRef.current = 'recovering'
          setPhase('recovering')
        } else {
          phaseRef.current = 'playing'
          setPhase('playing')
        }

        const s = successRef.current
        // Nhanh hơn một chút — tránh cảm giác chậm/giật
        const started = tryPlay(s, 1.45)
        if (!started || !s) {
          finishSuccess(null)
          return
        }

        const onComplete = () => {
          if (runId.current !== id) return
          s.removeEventListener('complete', onComplete)
          finishSuccess(s)
        }
        s.addEventListener('complete', onComplete)
        window.setTimeout(() => {
          if (runId.current !== id) return
          if (phaseRef.current === 'playing' || phaseRef.current === 'recovering') {
            s.removeEventListener('complete', onComplete)
            finishSuccess(s)
          }
        }, 4200)
      },
      [finishSuccess],
    )

    const handleConfirm = useCallback(() => {
      const p = phaseRef.current
      if (
        p === 'playing' ||
        p === 'recovering' ||
        p === 'done' ||
        p === 'wrong' ||
        p === 'checking'
      ) {
        return
      }

      const runIdAtStart = ++runId.current
      phaseRef.current = 'checking'
      setPhase('checking')

      void (async () => {
        let ok = false
        try {
          ok = await Promise.resolve(onValidateCb.current())
        } catch {
          ok = false
        }
        if (runId.current !== runIdAtStart) return
        if (!ok) {
          playWrong()
          return
        }
        playSuccess(hadWrongRef.current || p === 'wrong-hold')
      })()
    }, [playWrong, playSuccess])

    useImperativeHandle(ref, () => ({ confirm: handleConfirm }), [handleConfirm])

    const showIdle = phase === 'idle' || phase === 'checking'
    const showWrong = phase === 'wrong' || phase === 'wrong-hold' || phase === 'recovering'
    const showSuccess = phase === 'playing' || phase === 'recovering' || phase === 'done'

    return (
      <button
        type="button"
        className={`auth-cinema__confetti-btn is-${phase}`}
        onClick={handleConfirm}
        aria-label={label}
        disabled={
          phase === 'playing' ||
          phase === 'recovering' ||
          phase === 'wrong' ||
          phase === 'checking'
        }
      >
        {showIdle ? (
          <span className="auth-cinema__confetti-idle" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
              <circle cx="12" cy="12" r="11" fill="#00b14f" />
              <path
                d="M7.2 12.4l3.1 3.1 6.5-6.8"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}

        <span
          className={`auth-cinema__confetti-stage auth-cinema__confetti-stage--wrong${showWrong ? ' is-on' : ''}${phase === 'recovering' ? ' is-fade-out' : ''}`}
          aria-hidden="true"
        >
          <DotLottieReact
            src={WRONG_SRC}
            loop={false}
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
            dotLottieRefCallback={(instance) => {
              wrongRef.current = instance
              if (!instance) return
              const sync = () => {
                if (phaseRef.current === 'idle') pinFrame(instance, 0)
                else if (
                  (phaseRef.current === 'wrong-hold' || phaseRef.current === 'recovering') &&
                  instance.totalFrames > 0
                ) {
                  pinLast(instance)
                }
              }
              instance.addEventListener('load', sync)
              if (instance.isLoaded || instance.totalFrames > 0) sync()
            }}
          />
        </span>

        <span
          className={`auth-cinema__confetti-stage auth-cinema__confetti-stage--success${showSuccess ? ' is-on' : ''}${phase === 'recovering' ? ' is-fade-in' : ''}`}
          aria-hidden="true"
        >
          <DotLottieReact
            src={SUCCESS_SRC}
            loop={false}
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
            dotLottieRefCallback={(instance) => {
              successRef.current = instance
              if (!instance) return
              const sync = () => {
                if (phaseRef.current === 'idle') pinFrame(instance, 0)
                else if (phaseRef.current === 'done' && instance.totalFrames > 0) pinLast(instance)
              }
              instance.addEventListener('load', sync)
              if (instance.isLoaded || instance.totalFrames > 0) sync()
            }}
          />
        </span>
      </button>
    )
  },
)

/** Huy hiệu đã xác nhận — SVG nhẹ. */
export function ConfettiDoneMark() {
  return (
    <span className="auth-cinema__confetti-done" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
        <circle cx="12" cy="12" r="11" fill="#00b14f" />
        <path
          d="M7.2 12.4l3.1 3.1 6.5-6.8"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
