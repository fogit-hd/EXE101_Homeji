import { useEffect, useRef } from 'react'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import type { Notification } from '../api/types'
import { getApiBaseUrl, getStoredSession } from '../api/client'
import { AUTH_EXPIRED_EVENT, expireStoredAuth, terminateStoredAuth } from '../api/authSession'
import {
  createNotificationHubRetryPolicy,
  isUnauthorizedHubError,
  NotificationHubAuthenticationError,
  requireNotificationHubAccessToken,
} from './notificationHubRetryPolicy'

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
  if (err instanceof NotificationHubAuthenticationError) return true
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
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    handlerRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!enabled) return
    const session = getStoredSession()
    if (!session?.accessToken) return

    let cancelled = false
    const getAccessToken = () => getStoredSession()?.accessToken ?? null
    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), {
        accessTokenFactory: () => requireNotificationHubAccessToken(getAccessToken),
      })
      .withAutomaticReconnect(createNotificationHubRetryPolicy({
        getAccessToken,
        onUnauthorized: expireStoredAuth,
      }))
      // Page-freeze / tab-sleep warnings are expected in Chrome — keep console quiet.
      .configureLogging(LogLevel.None)
      .build()

    connectionRef.current = connection

    connection.on('notificationReceived', (payload: Notification) => {
      handlerRef.current?.(payload)
    })
    connection.on('sessionTerminated', (payload: { reason?: string }) => {
      terminateStoredAuth(payload?.reason || 'Phiên đăng nhập đã được kết thúc bởi quản trị viên.')
    })

    const stopForExpiredSession = () => {
      cancelled = true
      void connection.stop().catch(() => undefined)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, stopForExpiredSession)

    void (async () => {
      try {
        if (cancelled) return
        await connection.start()
      } catch (err) {
        if (isUnauthorizedHubError(err)) expireStoredAuth()
        if (cancelled || isBenignHubError(err)) return
        /* hub may be unavailable offline / CORS — silent */
      }
    })()

    return () => {
      cancelled = true
      window.removeEventListener(AUTH_EXPIRED_EVENT, stopForExpiredSession)
      connection.off('notificationReceived')
      connection.off('sessionTerminated')
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
