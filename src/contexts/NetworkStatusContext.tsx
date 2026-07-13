import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import '../components/NetworkStatusBanner.css'

type NetworkStatus = 'online' | 'offline' | 'reconnecting'

type NetworkStatusContextValue = {
  status: NetworkStatus
  isOnline: boolean
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null)

const PROBE_INTERVAL_OFFLINE_MS = 2500
const PROBE_INTERVAL_ONLINE_MS = 20000
const RESTORED_BANNER_MS = 2800
const OFFLINE_FAIL_THRESHOLD = 2

/** Module-level listeners — useOnReconnect does NOT subscribe to status context. */
const reconnectListeners = new Set<() => void>()

function notifyReconnectListeners() {
  reconnectListeners.forEach((cb) => {
    try {
      cb()
    } catch (err) {
      console.error('[network] reconnect callback failed', err)
    }
  })
}

async function probeConnectivity(signal?: AbortSignal): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  const url = `${window.location.origin}/?_net=${Date.now()}`
  try {
    const controller = new AbortController()
    const onAbort = () => {
      try {
        controller.abort()
      } catch {
        /* ignore */
      }
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    const timeout = window.setTimeout(() => {
      try {
        controller.abort()
      } catch {
        /* ignore */
      }
    }, 4000)

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      return res.type === 'opaque' || res.status > 0
    } catch (err) {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      if (err instanceof DOMException && err.name === 'AbortError') {
        return typeof navigator !== 'undefined' ? navigator.onLine : false
      }
      throw err
    }
  } catch {
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => {
        try {
          controller.abort()
        } catch {
          /* ignore */
        }
      }, 4000)
      await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      return true
    } catch {
      return typeof navigator !== 'undefined' ? navigator.onLine : false
    }
  }
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  )
  const [showRestored, setShowRestored] = useState(false)
  const statusRef = useRef(status)
  const probingRef = useRef(false)
  const failStreakRef = useRef(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const goOnline = useCallback(() => {
    failStreakRef.current = 0
    const wasOffline = statusRef.current !== 'online'
    setStatus('online')
    if (wasOffline) {
      setShowRestored(true)
      notifyReconnectListeners()
    }
  }, [])

  const goOffline = useCallback(() => {
    setShowRestored(false)
    setStatus('offline')
  }, [])

  const goReconnecting = useCallback(() => {
    setShowRestored(false)
    setStatus((prev) =>
      prev === 'online' ? 'reconnecting' : prev === 'offline' ? 'reconnecting' : prev,
    )
  }, [])

  const check = useCallback(
    async (signal?: AbortSignal) => {
      if (probingRef.current) return
      probingRef.current = true
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          failStreakRef.current = OFFLINE_FAIL_THRESHOLD
          goOffline()
          return
        }

        if (statusRef.current === 'offline') {
          goReconnecting()
        }

        const ok = await probeConnectivity(signal)
        if (signal?.aborted) return
        if (ok) {
          goOnline()
          return
        }

        failStreakRef.current += 1
        if (failStreakRef.current >= OFFLINE_FAIL_THRESHOLD) {
          goOffline()
        }
      } finally {
        probingRef.current = false
      }
    },
    [goOffline, goOnline, goReconnecting],
  )

  useEffect(() => {
    const ac = new AbortController()

    const onOffline = () => {
      failStreakRef.current = OFFLINE_FAIL_THRESHOLD
      goOffline()
    }
    const onOnline = () => {
      goReconnecting()
      void check(ac.signal)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    void check(ac.signal)
    const timer = window.setInterval(
      () => void check(ac.signal),
      statusRef.current === 'online' ? PROBE_INTERVAL_ONLINE_MS : PROBE_INTERVAL_OFFLINE_MS,
    )

    return () => {
      try {
        ac.abort()
      } catch {
        /* ignore */
      }
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.clearInterval(timer)
    }
  }, [check, goOffline, goReconnecting])

  useEffect(() => {
    if (!showRestored) return
    const t = window.setTimeout(() => setShowRestored(false), RESTORED_BANNER_MS)
    return () => window.clearTimeout(t)
  }, [showRestored])

  const value = useMemo<NetworkStatusContextValue>(
    () => ({
      status,
      isOnline: status === 'online',
    }),
    [status],
  )

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
      <NetworkStatusBanner status={status} showRestored={showRestored} />
    </NetworkStatusContext.Provider>
  )
}

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext)
  if (!ctx) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider')
  }
  return ctx
}

/** Không dùng useNetworkStatus — tránh re-render HomePage khi status đổi. */
export function useOnReconnect(callback: () => void) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const wrap = () => cbRef.current()
    reconnectListeners.add(wrap)
    return () => {
      reconnectListeners.delete(wrap)
    }
  }, [])
}

function NetworkStatusBanner({
  status,
  showRestored,
}: {
  status: NetworkStatus
  showRestored: boolean
}) {
  if (status === 'online' && !showRestored) return null

  let text = ''
  let tone: 'offline' | 'reconnecting' | 'restored' = 'offline'

  if (status === 'offline') {
    text = 'Đã mất kết nối mạng. Đang cố kết nối lại…'
    tone = 'offline'
  } else if (status === 'reconnecting') {
    text = 'Đang kết nối lại mạng…'
    tone = 'reconnecting'
  } else if (showRestored) {
    text = 'Đã có mạng trở lại. Tiếp tục sử dụng bình thường.'
    tone = 'restored'
  }

  if (!text) return null

  return (
    <div className={`network-banner network-banner--${tone}`} role="status" aria-live="polite">
      <span className="network-banner__dot" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
