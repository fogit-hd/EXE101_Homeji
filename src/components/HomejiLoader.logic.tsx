import { useChangedInputs } from '../hooks/useChangedInputs'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useOnReconnect } from "../contexts/NetworkStatusContext.logic"

import { createCoalescedLoad } from '../lib/coalescedLoad'

import { getErrorMessage, isServiceDisruption } from '../lib/errors'

import { shouldShowPersistentLoader } from './persistentLoadingState'

export const SERVICE_RETRY_MS = 5000

export const LOAD_TIMEOUT_MS = 20_000

export function useHomejiLoading(isLoading: boolean, forceHold = false) {
  const [introDone, setIntroDone] = useState(!isLoading && !forceHold)
  const [holding, setHolding] = useState(isLoading || forceHold)

  if (useChangedInputs([isLoading, forceHold])) {
    if (isLoading && !forceHold) {
      // Load mới: chạy lại intro
      setIntroDone(false)
      setHolding(true)
    } else if (isLoading || forceHold) {
      // Retry khi sự cố: giữ phase loop, không reset intro
      setHolding(true)
    }
  }

  if (useChangedInputs([isLoading, forceHold, introDone])) {
    if (!isLoading && !forceHold && introDone) setHolding(false)
  }

  const onIntroComplete = useCallback(() => setIntroDone(true), [])

  return {
    showLoader: isLoading || forceHold || holding,
    onIntroComplete,
  }
}

export type PersistentLoadResult = {
  showLoader: boolean
  onIntroComplete: () => void
  error: string
  disrupted: boolean
  reload: () => Promise<void>
}

export function usePersistentLoad(
  loadFn: () => Promise<void>,
  deps: unknown[] = [],
  options?: {
    enabled?: boolean
    retryIntervalMs?: number
    holdForIntro?: boolean
    timeoutMs?: number
  },
): PersistentLoadResult {
  const enabled = options?.enabled ?? true
  const retryIntervalMs = options?.retryIntervalMs ?? SERVICE_RETRY_MS
  // Data skeletons cannot emit an animation-complete callback. Do not let the
  // optional branded intro keep otherwise-completed requests blocked forever.
  const holdForIntro = options?.holdForIntro ?? false
  const timeoutMs = options?.timeoutMs ?? LOAD_TIMEOUT_MS
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disrupted, setDisrupted] = useState(false)
  const loadFnRef = useRef(loadFn)
  const disruptedRef = useRef(false)
  const enabledRef = useRef(enabled)
  const performLoadRef = useRef<() => Promise<void>>(async () => {})
  const queuedLoadRef = useRef<ReturnType<typeof createCoalescedLoad> | null>(null)

  useEffect(() => {
    loadFnRef.current = loadFn
  }, [loadFn])

  useEffect(() => {
    disruptedRef.current = disrupted
  }, [disrupted])

  const { showLoader, onIntroComplete } = useHomejiLoading(loading, disrupted)

  useEffect(() => {
    enabledRef.current = enabled
    if (!queuedLoadRef.current) {
      queuedLoadRef.current = createCoalescedLoad(() => performLoadRef.current())
    }
    performLoadRef.current = async () => {
      if (!enabledRef.current) return
      // Khi sự cố: giữ loop + message, không flip loading (tránh reset intro)
      if (!disruptedRef.current) setLoading(true)
      try {
        let timeoutId = 0
        try {
          await Promise.race([
            loadFnRef.current(),
            new Promise<never>((_, reject) => {
              timeoutId = window.setTimeout(
                () => reject(new Error('Yêu cầu mất quá nhiều thời gian. Homeji đang tự thử lại…')),
                timeoutMs,
              )
            }),
          ])
        } finally {
          window.clearTimeout(timeoutId)
        }
        setError('')
        setDisrupted(false)
      } catch (err) {
        setError(getErrorMessage(err))
        setDisrupted(isServiceDisruption(err) || (err instanceof Error && err.message.includes('quá nhiều thời gian')))
      } finally {
        setLoading(false)
      }
    }
  }, [enabled, timeoutMs])

  const reload = useCallback(async () => {
    if (enabledRef.current) await queuedLoadRef.current?.()
  }, [])

  useEffect(() => {
    if (!enabled) return
    void Promise.resolve().then(() => reload())
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

  return {
    showLoader: enabled && shouldShowPersistentLoader(loading, disrupted, showLoader, holdForIntro),
    onIntroComplete,
    error,
    disrupted: enabled && disrupted,
    reload,
  }
}
