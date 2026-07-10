import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import './AuthMascot.css'

export type AuthMascotMood =
  | 'idle'
  | 'wave'
  | 'peek'
  | 'type'
  | 'think'
  | 'error'
  | 'success'

type AuthMascotProps = {
  mood: AuthMascotMood
  mode?: 'login' | 'register'
  className?: string
  reducedMotion?: boolean
  onOneShotEnd?: () => void
  /** 0–1 password strength for visual feedback */
  passwordStrength?: number
  /** Bumps on each keystroke for type spark */
  typePulse?: number
}

const ASSET_V = '9'

const CLIP: Record<AuthMascotMood, { gif: string; still: string; loop: boolean; ms: number }> = {
  idle: { gif: `/mascot/homie_idle.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_idle.png?v=${ASSET_V}`, loop: true, ms: 2000 },
  wave: { gif: `/mascot/homie_wave.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_wave.png?v=${ASSET_V}`, loop: false, ms: 1200 },
  peek: { gif: `/mascot/homie_peek.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_peek.png?v=${ASSET_V}`, loop: true, ms: 1000 },
  type: { gif: `/mascot/homie_type.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_type.png?v=${ASSET_V}`, loop: true, ms: 1000 },
  think: { gif: `/mascot/homie_think.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_think.png?v=${ASSET_V}`, loop: true, ms: 1000 },
  error: { gif: `/mascot/homie_error.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_error.png?v=${ASSET_V}`, loop: false, ms: 1200 },
  success: { gif: `/mascot/homie_success.gif?v=${ASSET_V}`, still: `/mascot/stills/homie_success.png?v=${ASSET_V}`, loop: false, ms: 1400 },
}

const MOOD_CAPTION: Record<AuthMascotMood, string> = {
  idle: 'Homie đang chờ bạn…',
  wave: 'Xin chào!',
  peek: 'Không nhìn đâu…',
  type: 'Đang nghe bạn gõ…',
  think: 'Đợi một chút nhé',
  error: 'Ối, thử lại nhé',
  success: 'Tuyệt vời!',
}

/**
 * Homie — linh vật ngôi nhà Homeji cho auth.
 * GIF + particle/aura/parallax effects. One-shot → onOneShotEnd.
 */
export function AuthMascot({
  mood,
  mode = 'login',
  className = '',
  reducedMotion,
  onOneShotEnd,
  passwordStrength = 0,
  typePulse = 0,
}: AuthMascotProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const endRef = useRef(onOneShotEnd)
  endRef.current = onOneShotEnd
  const [systemReduced, setSystemReduced] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [burstKey, setBurstKey] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setSystemReduced(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  const useStill = typeof reducedMotion === 'boolean' ? reducedMotion : systemReduced
  const clip = CLIP[mood]
  const src = useStill ? clip.still : clip.gif

  useEffect(() => {
    if (clip.loop) return
    const t = window.setTimeout(() => endRef.current?.(), clip.ms)
    return () => window.clearTimeout(t)
  }, [mood, clip.loop, clip.ms])

  // Pointer parallax — Homie leans toward cursor
  useEffect(() => {
    if (useStill) return
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = (e.clientX - cx) / Math.max(r.width, 1)
      const dy = (e.clientY - cy) / Math.max(r.height, 1)
      setTilt({
        x: Math.max(-1, Math.min(1, dx)) * 8,
        y: Math.max(-1, Math.min(1, dy)) * -6,
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [useStill])

  // Keystroke spark burst
  useEffect(() => {
    if (!typePulse) return
    setBurstKey((k) => k + 1)
  }, [typePulse])

  // Mood change burst
  useEffect(() => {
    setBurstKey((k) => k + 1)
  }, [mood])

  const strengthClass =
    mood === 'peek' || mood === 'type'
      ? passwordStrength >= 0.75
        ? 'auth-mascot--strong'
        : passwordStrength >= 0.4
          ? 'auth-mascot--medium'
          : passwordStrength > 0
            ? 'auth-mascot--weak'
            : ''
      : ''

  return (
    <div
      ref={rootRef}
      className={`auth-mascot auth-mascot--${mode} auth-mascot--${mood} ${strengthClass} ${className}`.trim()}
      aria-hidden="true"
      data-mood={mood}
      style={
        useStill
          ? undefined
          : {
              '--tilt-x': `${tilt.x}deg`,
              '--tilt-y': `${tilt.y}deg`,
            } as CSSProperties
      }
    >
      <div className="auth-mascot__stage">
        <span className="auth-mascot__aura" />
        <span className="auth-mascot__ring" />
        <span className="auth-mascot__ground" />
        {!useStill && (
          <>
            <span className="auth-mascot__orb auth-mascot__orb--a" />
            <span className="auth-mascot__orb auth-mascot__orb--b" />
            <span className="auth-mascot__orb auth-mascot__orb--c" />
            <span className="auth-mascot__sparkles" key={burstKey}>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
            {mood === 'think' && (
              <span className="auth-mascot__bubbles">
                <i />
                <i />
                <i />
              </span>
            )}
            {mood === 'success' && <span className="auth-mascot__confetti" key={`c-${burstKey}`} />}
            {mood === 'error' && <span className="auth-mascot__shock" />}
          </>
        )}
        <img
          key={`${mood}-${src}`}
          className="auth-mascot__media is-active"
          src={src}
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
      <p className="auth-mascot__caption">{MOOD_CAPTION[mood]}</p>
    </div>
  )
}

function resolveMood(opts: {
  error: string
  success?: string
  loading: boolean
  focusedField: string | null
  isTyping: boolean
  allowWave: boolean
}): AuthMascotMood {
  const { error, success, loading, focusedField, isTyping, allowWave } = opts
  if (error) return 'error'
  if (success) return 'success'
  if (loading) return 'think'
  if (focusedField === 'password') return 'peek'
  if (isTyping || focusedField) return 'type'
  if (allowWave) return 'wave'
  return 'idle'
}

function passwordStrengthScore(password: string): number {
  if (!password) return 0
  let s = 0
  if (password.length >= 6) s += 0.25
  if (password.length >= 10) s += 0.2
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s += 0.2
  if (/\d/.test(password)) s += 0.2
  if (/[^A-Za-z0-9]/.test(password)) s += 0.15
  return Math.min(1, s)
}

/** Derive mascot mood + extra signals from auth form. */
export function useAuthMascotMood(opts: {
  mode: 'login' | 'register'
  error: string
  success?: string
  loading: boolean
  focusedField: string | null
  isTyping: boolean
  password?: string
  /** Increment on each keystroke from the page */
  typePulse?: number
  hovering?: boolean
}) {
  const {
    mode,
    error,
    success,
    loading,
    focusedField,
    isTyping,
    password = '',
    typePulse: externalPulse = 0,
    hovering = false,
  } = opts
  const [wavePending, setWavePending] = useState(true)
  const [localPulse, setLocalPulse] = useState(0)
  const prevMode = useRef(mode)
  const prevPassword = useRef(password)

  useEffect(() => {
    if (prevMode.current !== mode) {
      prevMode.current = mode
      setWavePending(true)
    }
  }, [mode])

  useEffect(() => {
    if (error || success || loading || focusedField || isTyping) {
      setWavePending(false)
    }
  }, [error, success, loading, focusedField, isTyping])

  // Password length changes also spark (covers paste / autofill)
  useEffect(() => {
    if (password !== prevPassword.current) {
      prevPassword.current = password
      setLocalPulse((n) => n + 1)
    }
  }, [password])

  // Hover intensifies presence but does not re-trigger wave loop
  useEffect(() => {
    if (!hovering) return
    setLocalPulse((n) => n + 1)
  }, [hovering])

  const mood = resolveMood({
    error,
    success,
    loading,
    focusedField,
    isTyping,
    allowWave: wavePending,
  })

  const onOneShotEnd = useCallback(() => {
    setWavePending(false)
  }, [])

  return {
    mood,
    onOneShotEnd,
    typePulse: externalPulse + localPulse,
    passwordStrength: passwordStrengthScore(password),
    hovering,
  }
}
