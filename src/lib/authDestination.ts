import { UserRole } from '../api/types'

/** Preserve explicit internal destinations; the default landing follows the verified profile role. */
export function authDestination(from: unknown, role: UserRole | undefined): string {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    && !from.includes('\\') && !Array.from(from).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return from
  return role === UserRole.Admin ? '/admin' : '/'
}
