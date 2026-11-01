import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileSetupNotice } from './ProfileSetupNotice'

/** Gate only a confirmed missing profile, never loading, role restrictions or API failures. */
export function ProfileGate({ children, action, onNavigate }: { children: ReactNode; action?: string; onNavigate?: () => void }) {
  const { isAuthenticated, needsProfileSetup } = useAuth()
  return isAuthenticated && needsProfileSetup ? <ProfileSetupNotice action={action} onNavigate={onNavigate} /> : children
}
