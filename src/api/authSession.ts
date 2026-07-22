export const AUTH_EXPIRED_EVENT = 'homeji:auth-expired'

export type AuthTokenState = {
  token: string | null
  expired: boolean
}

type SessionStorage = Pick<Storage, 'getItem' | 'removeItem'>
type WritableSessionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

const SESSION_KEYS = [
  'homeji_access_token',
  'homeji_user_id',
  'homeji_email',
] as const
const SESSION_TERMINATION_KEY = 'homeji_session_termination_message'

function decodeJwtExpiry(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized)) as { exp?: unknown }
    return typeof decoded.exp === 'number' && Number.isFinite(decoded.exp)
      ? decoded.exp * 1000
      : null
  } catch {
    return null
  }
}

export function clearStoredAuth(storage: SessionStorage = localStorage) {
  for (const key of SESSION_KEYS) storage.removeItem(key)
}

export function expireStoredAuth(
  storage: SessionStorage = localStorage,
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
) {
  const hadToken = storage.getItem('homeji_access_token') != null
  clearStoredAuth(storage)
  if (hadToken) eventTarget?.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

export function terminateStoredAuth(
  reason: string,
  storage: SessionStorage = localStorage,
  transientStorage: WritableSessionStorage = typeof sessionStorage === 'undefined' ? { ...storage, setItem: () => undefined } : sessionStorage,
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
) {
  const message = reason.trim().slice(0, 300)
  if (message) transientStorage.setItem(SESSION_TERMINATION_KEY, message)
  expireStoredAuth(storage, eventTarget)
}

export function consumeSessionTerminationMessage(
  transientStorage: Pick<Storage, 'getItem' | 'removeItem'> = typeof sessionStorage === 'undefined' ? localStorage : sessionStorage,
) {
  const message = transientStorage.getItem(SESSION_TERMINATION_KEY)
  if (message) transientStorage.removeItem(SESSION_TERMINATION_KEY)
  return message
}

export function readAuthTokenState(
  now = Date.now(),
  storage: SessionStorage = localStorage,
  eventTarget: EventTarget | null = typeof window === 'undefined' ? null : window,
): AuthTokenState {
  const token = storage.getItem('homeji_access_token')
  if (!token) return { token: null, expired: false }

  const expiresAt = decodeJwtExpiry(token)
  if (expiresAt != null && expiresAt <= now) {
    expireStoredAuth(storage, eventTarget)
    return { token: null, expired: true }
  }

  return { token, expired: false }
}
