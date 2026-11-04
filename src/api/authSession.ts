/**
 * Browser session state. The refresh token and its signed anchor live in HttpOnly cookies set by the
 * API (reached through the same-origin proxy); the access token is only ever held in this module.
 * A script injected into the page can still act while the page is open, but cannot carry away a
 * long-lived credential.
 */
export const AUTH_EXPIRED_EVENT = 'homeji:auth-expired'

export type AuthTokenState = {
  token: string | null
  expired: boolean
}

export type MemorySession = {
  accessToken: string
  userId: string | null
  email: string | null
}

export type LegacySession = {
  accessToken: string
  anchor: string
  refreshToken: string
}

type WritableSessionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
type SessionChange = { type: 'signed-in' | 'signed-out'; userId?: string | null }

/** Keys of sessions saved before cookies; read once to migrate, and deleted once the API holds them. */
const LEGACY_KEYS = [
  'homeji_refresh_token',
  'homeji_session_anchor',
  'homeji_access_token',
  'homeji_user_id',
  'homeji_email',
] as const
const SESSION_TERMINATION_KEY = 'homeji_session_termination_message'
const SESSION_HINT_COOKIE = 'homeji_session_hint'
/** JavaScript cannot delete HttpOnly cookies, so a failed sign-out is remembered and retried. */
const SIGN_OUT_PENDING_KEY = 'homeji_sign_out_pending'
const CHANNEL_NAME = 'homeji-auth'

let memory: MemorySession | null = null
/** Changes when the session is replaced or ended, but not when its access token rotates. */
let epoch = 0
let legacyAbsorbed = false
let channel: BroadcastChannel | null = null

function localStore(): WritableSessionStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function decodeJwtExpiry(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
}

function decodeJwtSubject(token: string): string | null {
  const sub = decodeJwtPayload(token)?.sub
  return typeof sub === 'string' ? sub : null
}

/** Sessions from before cookies keep working from their first page load, before any network call. */
function absorbLegacySession() {
  if (legacyAbsorbed) return
  legacyAbsorbed = true
  const store = localStore()
  const accessToken = store?.getItem('homeji_access_token')
  if (!store || !accessToken) return
  memory = {
    accessToken,
    userId: store.getItem('homeji_user_id') ?? decodeJwtSubject(accessToken),
    email: store.getItem('homeji_email'),
  }
  // Without a refresh token there is nothing to adopt: it simply ends when the access token does.
  if (!store.getItem('homeji_refresh_token')) clearLegacySession()
}

export function readLegacySession(): LegacySession | null {
  const store = localStore()
  const accessToken = store?.getItem('homeji_access_token')
  const refreshToken = store?.getItem('homeji_refresh_token')
  if (!store || !accessToken || !refreshToken) return null
  return { accessToken, refreshToken, anchor: store.getItem('homeji_session_anchor') || accessToken }
}

export function clearLegacySession() {
  const store = localStore()
  for (const key of LEGACY_KEYS) store?.removeItem(key)
}

/** Parks tokens from a sign-in link until the API adopts them; retried on later loads if it cannot yet. */
export function queueSessionAdoption(accessToken: string, refreshToken: string) {
  const store = localStore()
  store?.setItem('homeji_access_token', accessToken)
  store?.setItem('homeji_session_anchor', accessToken)
  store?.setItem('homeji_refresh_token', refreshToken)
}

export function isSignOutPending(): boolean {
  return localStore()?.getItem(SIGN_OUT_PENDING_KEY) != null
}

export function setSignOutPending(pending: boolean) {
  const store = localStore()
  if (pending) store?.setItem(SIGN_OUT_PENDING_KEY, '1')
  else store?.removeItem(SIGN_OUT_PENDING_KEY)
}

/** True when the API has said a cookie session may exist. It holds no secret. */
export function hasSessionHint(cookies: string | null = typeof document === 'undefined' ? null : document.cookie): boolean {
  if (!cookies || isSignOutPending()) return false
  return cookies.split(';').some(part => part.trim().startsWith(`${SESSION_HINT_COOKIE}=`))
}

export function getMemorySession(): MemorySession | null {
  absorbLegacySession()
  return memory
}

export function getSessionEpoch(): number {
  absorbLegacySession()
  return epoch
}

export function setMemorySession(session: MemorySession) {
  legacyAbsorbed = true
  epoch += 1
  memory = { ...session, userId: session.userId ?? decodeJwtSubject(session.accessToken) }
}

/** Applies a token from the API. Only a different account counts as a new session. */
export function applyIssuedToken(accessToken: string, userId: string | null, email: string | null) {
  const current = getMemorySession()
  if (current && current.userId !== userId) epoch += 1
  memory = { accessToken, userId, email: email ?? (current?.userId === userId ? current?.email ?? null : null) }
}

export function clearStoredAuth() {
  legacyAbsorbed = true
  epoch += 1
  memory = null
  clearLegacySession()
}

export function expireStoredAuth(
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
) {
  const hadSession = getMemorySession() != null
  clearStoredAuth()
  if (hadSession) {
    announceSessionChange({ type: 'signed-out' })
    eventTarget?.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
}

export function terminateStoredAuth(
  reason: string,
  transientStorage: Pick<Storage, 'setItem'> = typeof sessionStorage === 'undefined' ? { setItem: () => undefined } : sessionStorage,
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
) {
  const message = reason.trim().slice(0, 300)
  if (message) transientStorage.setItem(SESSION_TERMINATION_KEY, message)
  expireStoredAuth(eventTarget)
}

export function consumeSessionTerminationMessage(
  transientStorage: Pick<Storage, 'getItem' | 'removeItem'> | null = typeof sessionStorage === 'undefined' ? null : sessionStorage,
) {
  const message = transientStorage?.getItem(SESSION_TERMINATION_KEY) ?? null
  if (message) transientStorage?.removeItem(SESSION_TERMINATION_KEY)
  return message
}

export function readAuthTokenState(
  now = Date.now(),
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
): AuthTokenState {
  const token = getMemorySession()?.accessToken ?? null
  if (!token) return { token: null, expired: false }

  const expiresAt = decodeJwtExpiry(token)
  if (expiresAt != null && expiresAt <= now && !hasSessionHint() && !readLegacySession()) {
    expireStoredAuth(eventTarget)
    return { token: null, expired: true }
  }

  return { token, expired: false }
}

function sessionChannel(): BroadcastChannel | null {
  if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Tabs no longer share storage, so sign-in and sign-out have to be told to the others. */
export function announceSessionChange(change: SessionChange) {
  sessionChannel()?.postMessage(change)
}

export function subscribeToSessionChanges(listener: (change: SessionChange) => void): () => void {
  const source = sessionChannel()
  if (!source) return () => undefined
  const onMessage = (event: MessageEvent<SessionChange>) => listener(event.data)
  source.addEventListener('message', onMessage)
  return () => source.removeEventListener('message', onMessage)
}
