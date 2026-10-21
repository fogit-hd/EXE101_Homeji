import {
  createContext,
  useContext
} from 'react'

export type AuthModalMode = 'login' | 'register'

export type AuthModalIntent = 'contact' | 'save' | 'invite' | 'report' | 'browse' | string

export type OpenAuthModalOptions = {
  mode?: AuthModalMode
  intent?: AuthModalIntent
  onSuccess?: () => void
}

export type AuthModalContextValue = {
  isOpen: boolean
  mode: AuthModalMode
  intent: AuthModalIntent | null
  openAuthModal: (options?: OpenAuthModalOptions) => void
  closeAuthModal: () => void
}

export const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
