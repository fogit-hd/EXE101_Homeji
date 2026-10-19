import { decodeJwtExpiry, expireStoredAuth } from './authSession'
import type { AuthSession } from './types'

export const AUTH_REFRESHED_EVENT = 'homeji:auth-refreshed'
let flight: { identity: string | null; promise: Promise<string | null> } | null = null

export class SessionRefreshUnavailable extends Error {
  readonly status = 503
  constructor() { super('Chưa thể gia hạn phiên. Vui lòng thử lại khi kết nối ổn định.') }
}

/** A single rotating refresh per browser origin; never resurrect a signed-out account. */
export function ensureFreshSession(rejectedToken?: string): Promise<string | null> {
  const identity = localStorage.getItem('homeji_session_anchor') || localStorage.getItem('homeji_access_token')
  if (flight?.identity === identity) return flight.promise
  const run = async () => {
    const access = localStorage.getItem('homeji_access_token')
    const refresh = localStorage.getItem('homeji_refresh_token')
    if (!access) return null
    if (rejectedToken && access !== rejectedToken) return access
    const expiry = decodeJwtExpiry(access)
    if (!rejectedToken && (expiry == null || expiry > Date.now() + 60_000)) return access
    if (!refresh) {
      if (rejectedToken || (expiry != null && expiry <= Date.now())) { expireStoredAuth(); return null }
      return access
    }
    const anchor = localStorage.getItem('homeji_session_anchor') || access
    const user = localStorage.getItem('homeji_user_id')
    const current = () => localStorage.getItem('homeji_access_token') === access
      && localStorage.getItem('homeji_refresh_token') === refresh
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20_000)
    try {
      const origin = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
      const response = await fetch(`${origin}/api/account/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: anchor, refreshToken: refresh }), signal: controller.signal,
      })
      if (!current()) throw new DOMException('Session changed', 'AbortError')
      if (response.status === 401 || response.status === 403) { expireStoredAuth(); return null }
      if (!response.ok) throw new SessionRefreshUnavailable()
      const next = await response.json() as AuthSession
      if (!current()) throw new DOMException('Session changed', 'AbortError')
      if (!next.accessToken || !next.refreshToken || next.userId !== user) throw new SessionRefreshUnavailable()
      localStorage.setItem('homeji_session_anchor', anchor)
      localStorage.setItem('homeji_refresh_token', next.refreshToken)
      localStorage.setItem('homeji_access_token', next.accessToken)
      window.dispatchEvent(new Event(AUTH_REFRESHED_EVENT))
      return next.accessToken
    } catch (error) {
      if (!current() && localStorage.getItem('homeji_access_token') !== access) throw new DOMException('Session changed', 'AbortError')
      if (error instanceof SessionRefreshUnavailable) throw error
      throw new SessionRefreshUnavailable()
    } finally { clearTimeout(timer) }
  }
  const promise = (typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('homeji-session-refresh', run) : run()).finally(() => { if (flight?.promise === promise) flight = null })
  flight = { identity, promise }
  return promise
}
