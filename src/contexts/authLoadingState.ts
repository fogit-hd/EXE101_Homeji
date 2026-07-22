/**
 * Decides whether protected routes must block on the full-page startup skeleton.
 * Kept separate so an API disruption cannot silently reintroduce an infinite gate.
 */
export function shouldBlockProtectedRoutes(
  initialLoading: boolean,
  serviceDisrupted: boolean,
): boolean {
  if (initialLoading) return true
  if (serviceDisrupted) return false
  return false
}
