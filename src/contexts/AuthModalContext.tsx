import { useChangedInputs } from '../hooks/useChangedInputs'
import {
  lazy,
  Suspense,
  useCallback,

  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthModalContext, type AuthModalContextValue, type AuthModalIntent, type AuthModalMode, type OpenAuthModalOptions } from "./AuthModalContext.logic"

const AuthModal = lazy(() => import('../components/auth/AuthModal').then(module => ({ default: module.AuthModal })))

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
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
    setHasOpened(true)
    setIsOpen(true)
  }, [])

  // Deep-link: ?auth=login | ?auth=register
  if (useChangedInputs([searchParams], true)) {
    const auth = searchParams.get('auth')
    if (auth === 'login' || auth === 'register') {
      setMode(auth === 'register' ? 'register' : 'login')
      setHasOpened(true)
      setIsOpen(true)
    }
  }

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
      {hasOpened && <Suspense fallback={null}><AuthModal
        open={isOpen}
        mode={mode}
        intent={intent}
        onModeChange={setMode}
        onClose={closeAuthModal}
        onSuccess={handleSuccess}
      /></Suspense>}
    </AuthModalContext.Provider>
  )
}
