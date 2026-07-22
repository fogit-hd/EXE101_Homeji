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
import {
  ApiRequestError,
  AUTH_EXPIRED_EVENT,
  clearSession,
  getMyProfile,
  getStoredSession,
  login as apiLogin,
  persistSession,
  recordPresence,
  register as apiRegister,
  type AuthSession,
  type UserProfile,
} from '../api'
import { SERVICE_RETRY_MS } from '../components/HomejiLoader'
import { isServiceDisruption } from '../lib/errors'
import { useOnReconnect } from './NetworkStatusContext'
import { shouldBlockProtectedRoutes } from './authLoadingState'

type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  profile: UserProfile | null
  needsProfileSetup: boolean
  email: string | null
  login: (email: string, password: string) => Promise<AuthSession>
  register: (email: string, password: string, displayName: string) => Promise<AuthSession>
  logout: () => void
  refreshProfile: () => Promise<void>
  setSessionFromAuth: (session: AuthSession) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredSession()?.accessToken))
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)
  const [email, setEmail] = useState<string | null>(() => getStoredSession()?.email ?? null)
  const [authDisrupted, setAuthDisrupted] = useState(false)
  const refreshInFlight = useRef(false)

  const resetAuthState = useCallback(() => {
    setHasToken(false)
    setProfile(null)
    setNeedsProfileSetup(false)
    setEmail(null)
    setAuthDisrupted(false)
  }, [])

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, resetAuthState)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, resetAuthState)
  }, [resetAuthState])

  const applySession = useCallback((session: AuthSession) => {
    if (!session.accessToken) return
    persistSession(session.accessToken, session.userId, session.email)
    setHasToken(true)
    if (session.email) setEmail(session.email)
  }, [])

  const refreshProfile = useCallback(async () => {
    const session = getStoredSession()
    if (!session?.accessToken) {
      setProfile(null)
      setNeedsProfileSetup(false)
      setAuthDisrupted(false)
      return
    }

    if (refreshInFlight.current) return
    refreshInFlight.current = true

    try {
      const data = await getMyProfile()
      setProfile(data)
      setNeedsProfileSetup(false)
      setAuthDisrupted(false)
    } catch (err) {
      // User mới đăng ký chưa có row profile trong DB — vẫn giữ session
      if (err instanceof ApiRequestError && err.status === 404) {
        setProfile(null)
        setNeedsProfileSetup(true)
        setAuthDisrupted(false)
        return
      }

      // Token hết hạn / không hợp lệ
      if (err instanceof ApiRequestError && err.status === 401) {
        clearSession()
        resetAuthState()
        return
      }

      // Mạng / server sự cố → giữ loading + retry, không logout
      if (isServiceDisruption(err)) {
        setAuthDisrupted(true)
        return
      }

      setProfile(null)
      setNeedsProfileSetup(false)
      setAuthDisrupted(false)
    } finally {
      refreshInFlight.current = false
    }
  }, [resetAuthState])

  useEffect(() => {
    void (async () => {
      if (hasToken) {
        await refreshProfile()
      }
      setIsLoading(false)
    })()
  }, [hasToken, refreshProfile])

  // Có mạng lại → tiếp tục session/profile, không cần F5
  useOnReconnect(() => {
    if (!getStoredSession()?.accessToken) return
    void refreshProfile()
  })

  useEffect(() => {
    if (!authDisrupted || !hasToken) return
    const t = window.setInterval(() => void refreshProfile(), SERVICE_RETRY_MS)
    return () => window.clearInterval(t)
  }, [authDisrupted, hasToken, refreshProfile])

  useEffect(() => {
    if (!hasToken || !profile) return
    const sendPresence = () => {
      void recordPresence().catch(() => undefined)
    }
    sendPresence()
    const timer = window.setInterval(sendPresence, 60_000)
    return () => window.clearInterval(timer)
  }, [hasToken, profile])

  const setSessionFromAuth = useCallback(async (session: AuthSession) => {
    applySession(session)
    await refreshProfile()
  }, [applySession, refreshProfile])

  const login = useCallback(async (loginEmail: string, password: string) => {
    const session = await apiLogin({ email: loginEmail, password })
    applySession(session)
    await refreshProfile()
    return session
  }, [applySession, refreshProfile])

  const register = useCallback(async (registerEmail: string, password: string, displayName: string) => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const session = await apiRegister({ email: registerEmail, password, displayName, redirectTo })
    if (session.accessToken && !session.emailConfirmationRequired) {
      applySession(session)
      await refreshProfile()
    }
    return session
  }, [applySession, refreshProfile])

  const logout = useCallback(() => {
    clearSession()
    resetAuthState()
  }, [resetAuthState])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: hasToken,
      isLoading: shouldBlockProtectedRoutes(isLoading, authDisrupted),
      profile,
      needsProfileSetup,
      email: email ?? profile?.displayName ?? null,
      login,
      register,
      logout,
      refreshProfile,
      setSessionFromAuth,
    }),
    [
      hasToken,
      isLoading,
      authDisrupted,
      profile,
      needsProfileSetup,
      email,
      login,
      register,
      logout,
      refreshProfile,
      setSessionFromAuth,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
