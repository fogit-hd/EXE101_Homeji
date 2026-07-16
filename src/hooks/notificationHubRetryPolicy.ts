const RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000] as const

type RetryContext = {
  previousRetryCount: number
  elapsedMilliseconds: number
  retryReason: Error
}

type RetryPolicyDependencies = {
  getAccessToken: () => string | null
  onUnauthorized: () => void
}

export class NotificationHubAuthenticationError extends Error {
  constructor() {
    super('Notification hub authentication session is unavailable.')
    this.name = 'NotificationHubAuthenticationError'
  }
}

export function requireNotificationHubAccessToken(getAccessToken: () => string | null): string {
  const token = getAccessToken()
  if (!token) throw new NotificationHubAuthenticationError()
  return token
}

export function isUnauthorizedHubError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /(?:status(?: code)?\s*[':=]?\s*401|\b401\b.*unauthor)/i.test(message)
}

export function createNotificationHubRetryPolicy({
  getAccessToken,
  onUnauthorized,
}: RetryPolicyDependencies) {
  return {
    nextRetryDelayInMilliseconds(context: RetryContext): number | null {
      if (isUnauthorizedHubError(context.retryReason)) {
        onUnauthorized()
        return null
      }

      if (!getAccessToken()) return null
      return RECONNECT_DELAYS_MS[context.previousRetryCount] ?? null
    },
  }
}
