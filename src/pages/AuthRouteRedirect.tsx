import { Navigate, useLocation } from 'react-router-dom'
import { authSectionUrl, type AuthSection } from '../lib/authSections'

export function AuthRouteRedirect({ section }: { section: AuthSection }) {
  const location = useLocation()
  return <Navigate to={authSectionUrl(section, location.search, location.hash)} replace state={location.state} />
}
