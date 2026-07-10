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
  /** Đăng ký callback chạy khi vừa có mạng lại (sau khi verify) */
  onReconnect: (callback: () => void) => () => void
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null)

const PROBE_INTERVAL_OFFLINE_MS = 2500
const PROBE_INTERVAL_ONLINE_MS = 20000
const RESTORED_BANNER_MS = 2800

async function probeConnectivity(signal?: AbortSignal): Promise<boolean> {
  // 1) Browser báo offline → chắc chắn mất mạng
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  // 2) Probe nhẹ: favicon/same-origin (không phụ thuộc API)
  try {
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort, { once: true })
    const timeout = window.setTimeout(() => controller.abort(), 4000)

    const res = await fetch(`${window.location.origin}/favicon.svg?_net=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
    return res.ok || res.status === 404 || res.type === 'opaque'
  } catch {
    // Fallback: thử no-cors ping tới origin
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 4000)
      await fetch(`${window.location.origin}/?_net=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      return true
    } catch {
      return false
    }
  }
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  )
  const [showRestored, setShowRestored] = useState(false)
  const listenersRef = useRef(new Set<() => void>())
  const statusRef = useRef(status)
  const probingRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const notifyReconnect = useCallback(() => {
    listenersRef.current.forEach((cb) => {
      try {
        cb()
      } catch (err) {
        console.error('[network] reconnect callback failed', err)
      }
    })
  }, [])

  const goOnline = useCallback(() => {
    const wasOffline = statusRef.current !== 'online'
    setStatus('online')
    if (wasOffline) {
      setShowRestored(true)
      notifyReconnect()
    }
  }, [notifyReconnect])

  const goOffline = useCallback(() => {
    setShowRestored(false)
    setStatus('offline')
  }, [])

  const goReconnecting = useCallback(() => {
    setShowRestored(false)
    setStatus((prev) => (prev === 'online' ? 'reconnecting' : prev === 'offline' ? 'reconnecting' : prev))
  }, [])

  const check = useCallback(async (signal?: AbortSignal) => {
    if (probingRef.current) return
    probingRef.current = true
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        goOffline()
        return
      }

      if (statusRef.current === 'offline') {
        goReconnecting()
      }

      const ok = await probeConnectivity(signal)
      if (signal?.aborted) return
      if (ok) goOnline()
      else goOffline()
    } finally {
      probingRef.current = false
    }
  }, [goOffline, goOnline, goReconnecting])

  useEffect(() => {
    const ac = new AbortController()

    const onOffline = () => goOffline()
    const onOnline = () => {
      goReconnecting()
      void check(ac.signal)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    // Probe ngay + định kỳ (nhanh hơn khi đang offline)
    void check(ac.signal)
    let timer = window.setInterval(
      () => void check(ac.signal),
      statusRef.current === 'online' ? PROBE_INTERVAL_ONLINE_MS : PROBE_INTERVAL_OFFLINE_MS,
    )

    const syncInterval = window.setInterval(() => {
      window.clearInterval(timer)
      timer = window.setInterval(
        () => void check(ac.signal),
        statusRef.current === 'online' ? PROBE_INTERVAL_ONLINE_MS : PROBE_INTERVAL_OFFLINE_MS,
      )
    }, 1000)

    return () => {
      ac.abort()
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.clearInterval(timer)
      window.clearInterval(syncInterval)
    }
  }, [check, goOffline, goReconnecting])

  useEffect(() => {
    if (!showRestored) return
    const t = window.setTimeout(() => setShowRestored(false), RESTORED_BANNER_MS)
    return () => window.clearTimeout(t)
  }, [showRestored])

  const onReconnect = useCallback((callback: () => void) => {
    listenersRef.current.add(callback)
    return () => {
      listenersRef.current.delete(callback)
    }
  }, [])

  const value = useMemo<NetworkStatusContextValue>(
    () => ({
      status,
      isOnline: status === 'online',
      onReconnect,
    }),
    [status, onReconnect],
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

/** Chạy lại callback mỗi khi mạng vừa khôi phục — không cần F5 */
export function useOnReconnect(callback: () => void) {
  const { onReconnect } = useNetworkStatus()
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    return onReconnect(() => cbRef.current())
  }, [onReconnect])
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
