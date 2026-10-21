import { useCallback, useEffect, useRef, useState } from 'react'

import { useChangedInputs } from '../hooks/useChangedInputs'

export type AuthMascotMood =
  | 'idle'
  | 'wave'
  | 'peek'
  | 'type'
  | 'think'
  | 'error'
  | 'success'

export function resolveMood(opts: {
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

export function passwordStrengthScore(password: string): number {
  if (!password) return 0
  let s = 0
  if (password.length >= 6) s += 0.25
  if (password.length >= 10) s += 0.2
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s += 0.2
  if (/\d/.test(password)) s += 0.2
  if (/[^A-Za-z0-9]/.test(password)) s += 0.15
  return Math.min(1, s)
}

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

  if (useChangedInputs([error, success, loading, focusedField, isTyping])) {
    if (error || success || loading || focusedField || isTyping) {
      setWavePending(false)
    }
  }

  // Password length changes also spark (covers paste / autofill)
  useEffect(() => {
    if (password !== prevPassword.current) {
      prevPassword.current = password
      setLocalPulse((n) => n + 1)
    }
  }, [password])

  // Hover intensifies presence but does not re-trigger wave loop
  if (useChangedInputs([hovering]) && hovering) {
    setLocalPulse((n) => n + 1)
  }

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
