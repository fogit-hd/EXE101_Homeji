import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ListingsSkeleton } from '../components/skeletons/PageSkeletons'
import { exploreListUrl } from '../components/chrome/exploreMode'

/**
 * Map explore is now embedded on the guest landing (`/#map`).
 * Keep this route as a stable deep-link / bookmark target.
 */
export function ExplorePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="container page">
        <ListingsSkeleton />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={exploreListUrl(location.search)} replace />
  }

  return <Navigate to={{ pathname: '/', search: location.search, hash: '#map' }} replace />
}
