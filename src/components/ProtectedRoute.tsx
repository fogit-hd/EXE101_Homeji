import { Navigate, useLocation } from 'react-router-dom'
import { UserRole } from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { RouteSkeleton } from './skeletons/RouteSkeleton'
import { ProfileSetupNotice } from './auth/ProfileSetupNotice'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <RouteSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (needsProfileSetup && location.pathname !== '/profile') return <ProfileSetupNotice />
  return children
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return <RouteSkeleton />
  }

  if (profile?.role !== UserRole.Admin) {
    return <Navigate to="/" replace />
  }

  return children
}
