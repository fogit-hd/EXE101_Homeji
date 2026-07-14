import { useEffect, useRef } from 'react'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import type { Notification } from '../api/types'
import { getApiBaseUrl, getStoredSession } from '../api/client'

type Options = {
  enabled?: boolean
  onNotification?: (notification: Notification) => void
}

function resolveHubUrl(): string {
  const base = getApiBaseUrl()
  if (base) return `${base.replace(/\/$/, '')}/hubs/notifications`
  // Dev: same-origin → Vite proxy
  return '/hubs/notifications'
}

function isBenignHubError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return (
    /stopped during negotiation/i.test(msg) ||
    /connection was stopped/i.test(msg) ||
    /Handshake was canceled/i.test(msg) ||
    /Invocation canceled/i.test(msg) ||
    /WebSocket closed/i.test(msg)
  )
}

/**
 * Connects to `/hubs/notifications` and listens for `notificationReceived`.
 * Tolerates React Strict Mode / Vite HMR remounts (start/stop race).
 */
export function useNotificationHub({ enabled = true, onNotification }: Options) {
  const handlerRef = useRef(onNotification)
  handlerRef.current = onNotification
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!enabled) return
    const session = getStoredSession()
    if (!session?.accessToken) return

    let cancelled = false
    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), {
        accessTokenFactory: () => getStoredSession()?.accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      // Page-freeze / tab-sleep warnings are expected in Chrome — keep console quiet.
      .configureLogging(LogLevel.Error)
      .build()

    connectionRef.current = connection

    connection.on('notificationReceived', (payload: Notification) => {
      handlerRef.current?.(payload)
    })

    void (async () => {
      try {
        if (cancelled) return
        await connection.start()
      } catch (err) {
        if (cancelled || isBenignHubError(err)) return
        /* hub may be unavailable offline / CORS — silent */
      }
    })()

    return () => {
      cancelled = true
      connection.off('notificationReceived')
      connectionRef.current = null
      void (async () => {
        try {
          // stop() while Connecting causes "stopped during negotiation" — swallow it.
          if (connection.state !== HubConnectionState.Disconnected) {
            await connection.stop()
          }
        } catch {
          /* remount / HMR */
        }
      })()
    }
  }, [enabled])
}
