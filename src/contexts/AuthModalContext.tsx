import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthModal } from '../components/auth/AuthModal'

export type AuthModalMode = 'login' | 'register'
export type AuthModalIntent = 'contact' | 'save' | 'invite' | 'report' | 'browse' | string

type OpenAuthModalOptions = {
  mode?: AuthModalMode
  intent?: AuthModalIntent
  onSuccess?: () => void
}

type AuthModalContextValue = {
  isOpen: boolean
  mode: AuthModalMode
  intent: AuthModalIntent | null
  openAuthModal: (options?: OpenAuthModalOptions) => void
  closeAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthModalMode>('login')
  const [intent, setIntent] = useState<AuthModalIntent | null>(null)
  const onSuccessRef = useRef<(() => void) | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const closeAuthModal = useCallback(() => {
    setIsOpen(false)
    setIntent(null)
    onSuccessRef.current = null
    if (searchParams.has('auth')) {
      const next = new URLSearchParams(searchParams)
      next.delete('auth')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    setMode(options?.mode ?? 'login')
    setIntent(options?.intent ?? null)
    onSuccessRef.current = options?.onSuccess ?? null
    setIsOpen(true)
  }, [])

  // Deep-link: ?auth=login | ?auth=register
  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login' || auth === 'register') {
      setMode(auth === 'register' ? 'register' : 'login')
      setIsOpen(true)
    }
  }, [searchParams])

  const handleSuccess = useCallback(() => {
    const resume = onSuccessRef.current
    closeAuthModal()
    resume?.()
  }, [closeAuthModal])

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      mode,
      intent,
      openAuthModal,
      closeAuthModal,
    }),
    [isOpen, mode, intent, openAuthModal, closeAuthModal],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={isOpen}
        mode={mode}
        intent={intent}
        onModeChange={setMode}
        onClose={closeAuthModal}
        onSuccess={handleSuccess}
      />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
