import {
  announceSessionChange,
  applyIssuedToken,
  clearLegacySession,
  decodeJwtExpiry,
  expireStoredAuth,
  getMemorySession,
  getSessionEpoch,
  hasSessionHint,
  isSignOutPending,
  readLegacySession,
  setSignOutPending,
} from './authSession'
import type { AuthSession } from './types'

export const AUTH_REFRESHED_EVENT = 'homeji:auth-refreshed'
export const SESSION_MODE_HEADERS = { 'X-Homeji-Session': 'cookie' } as const

const SESSION_PATH = '/api/account/session'
const SESSION_TIMEOUT_MS = 20_000
const RENEWAL_MARGIN_MS = 60_000
/** Shared with tabs still running the previous bundle, so their rotation cannot race a migration. */
const SESSION_LOCK = 'homeji-session-refresh'

let flight: { identity: number; promise: Promise<string | null> } | null = null

export class SessionRefreshUnavailable extends Error {
  readonly status = 503
  constructor() { super('Chưa thể gia hạn phiên. Vui lòng thử lại khi kết nối ổn định.') }
}

/** Serializes everything that writes session cookies, so a late response cannot restore an ended session. */
export function withSessionLock<T>(run: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(SESSION_LOCK, run) as Promise<T>
    : run()
}

function sessionFetch(path: string, method: string, body?: unknown, keepalive = false): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS)
  return fetch(path, {
    method,
    credentials: 'same-origin',
    keepalive,
    headers: { ...SESSION_MODE_HEADERS, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
}

async function retryPendingSignOut() {
  if (!isSignOutPending()) return
  try {
    const response = await sessionFetch(SESSION_PATH, 'DELETE')
    if (response.ok) setSignOutPending(false)
  } catch { /* Stays pending; the session is treated as ended meanwhile. */ }
}

type Adoption = 'none' | 'adopted' | 'rejected' | 'pending'

/** Moves a localStorage session into cookies; its tokens are deleted only once the API holds them. */
async function adoptLegacySession(): Promise<Adoption> {
  const legacy = readLegacySession()
  if (!legacy) return 'none'
  let response: Response
  try {
    response = await sessionFetch(`${SESSION_PATH}/adopt`, 'POST', {
      sessionToken: legacy.anchor,
      accessToken: legacy.accessToken,
      refreshToken: legacy.refreshToken,
    })
  } catch {
    return 'pending'
  }
  if (response.ok) {
    clearLegacySession()
    announceSessionChange({ type: 'signed-in', userId: getMemorySession()?.userId })
    return 'adopted'
  }
  return response.status === 401 ? 'rejected' : 'pending'
}

/** One renewal per tab at a time, one per browser under the lock; never resurrects a signed-out account. */
export function ensureFreshSession(rejectedToken?: string): Promise<string | null> {
  const identity = getSessionEpoch()
  if (flight?.identity === identity) return flight.promise
  const run = async (): Promise<string | null> => {
    await retryPendingSignOut()
    const adoption = await adoptLegacySession()
    if (adoption === 'rejected') { expireStoredAuth(); return null }

    const startedIn = getSessionEpoch()
    const access = getMemorySession()?.accessToken ?? null
    if (rejectedToken && access && access !== rejectedToken) return access
    const expiry = access ? decodeJwtExpiry(access) : null
    if (access && !rejectedToken && (expiry == null || expiry > Date.now() + RENEWAL_MARGIN_MS)) return access
    // The API cannot be reached yet, so the session cannot be judged either way.
    if (adoption === 'pending') throw new SessionRefreshUnavailable()

    if (!hasSessionHint()) {
      if (!access) return null
      if (rejectedToken || (expiry != null && expiry <= Date.now())) { expireStoredAuth(); return null }
      return access
    }

    const changed = () => getSessionEpoch() !== startedIn
    try {
      const response = await sessionFetch(SESSION_PATH, 'POST', { forceRotate: Boolean(rejectedToken) })
      if (changed()) throw new DOMException('Session changed', 'AbortError')
      if (response.status === 401) { expireStoredAuth(); return null }
      if (!response.ok) throw new SessionRefreshUnavailable()
      const next = await response.json() as AuthSession
      if (changed()) throw new DOMException('Session changed', 'AbortError')
      if (!next.accessToken) throw new SessionRefreshUnavailable()
      applyIssuedToken(next.accessToken, next.userId, next.email)
      window.dispatchEvent(new Event(AUTH_REFRESHED_EVENT))
      return next.accessToken
    } catch (error) {
      if (changed()) throw new DOMException('Session changed', 'AbortError')
      if (error instanceof SessionRefreshUnavailable) throw error
      throw new SessionRefreshUnavailable()
    }
  }
  const promise = withSessionLock(run).finally(() => { if (flight?.promise === promise) flight = null })
  flight = { identity, promise }
  return promise
}

/** Ends the cookie session on the API. JavaScript cannot clear it, so failures are retried on later loads. */
export async function endCookieSession(): Promise<void> {
  if (!hasSessionHint()) return
  setSignOutPending(true)
  await withSessionLock(async () => {
    try {
      const response = await sessionFetch(SESSION_PATH, 'DELETE', undefined, true)
      if (response.ok) setSignOutPending(false)
    } catch { /* Retried by retryPendingSignOut. */ }
  })
}
