import { Navigate, useLocation } from 'react-router-dom'
import { UserRole } from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { HomejiLoader, useHomejiLoading } from './HomejiLoader'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const { showLoader, onIntroComplete } = useHomejiLoading(isLoading)

  if (showLoader) {
    return <HomejiLoader fullPage onIntroComplete={onIntroComplete} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth()
  const { showLoader, onIntroComplete } = useHomejiLoading(isLoading)

  if (showLoader) {
    return <HomejiLoader fullPage onIntroComplete={onIntroComplete} />
  }

  if (profile?.role !== UserRole.Admin) {
    return <Navigate to="/" replace />
  }

  return children
}
