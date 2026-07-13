import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Map explore is now embedded on the guest landing (`/#map`).
 * Keep this route as a stable deep-link / bookmark target.
 */
export function ExplorePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  if (authLoading) return null

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Navigate to="/#map" replace />
}
