import type { AgentAccess } from '../api/types'

/** AgentAccess is authoritative; an expiry from an older subscription must not override it. */
export function agentAccessSnapshot(access: AgentAccess) {
  return {
    ...access,
    kind: 'ready' as const,
    premiumExpiresAt: null,
    nextFreeResetAt: access.nextFreeResetAt ?? null,
  }
}
