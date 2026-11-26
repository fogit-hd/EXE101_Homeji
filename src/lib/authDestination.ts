import { UserRole } from '../api/types'

const RETURN_PATH_KEY = 'homeji:auth-return-path'

function internalPath(from: unknown): from is string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    && !from.includes('\\') && !Array.from(from).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
}

export function persistAuthDestination(from: unknown): void {
  try {
    if (internalPath(from)) sessionStorage.setItem(RETURN_PATH_KEY, from)
    else sessionStorage.removeItem(RETURN_PATH_KEY)
  } catch { /* Storage may be unavailable. */ }
}

export function consumeAuthDestination(role: UserRole | undefined): string {
  let from: unknown
  try {
    from = sessionStorage.getItem(RETURN_PATH_KEY)
    sessionStorage.removeItem(RETURN_PATH_KEY)
  } catch { /* Fall back to the profile destination. */ }
  return authDestination(from, role)
}

/** Preserve explicit internal destinations; the default landing follows the verified profile role. */
export function authDestination(from: unknown, role: UserRole | undefined): string {
  if (internalPath(from)) return from
  return role === UserRole.Admin ? '/admin' : '/'
}
