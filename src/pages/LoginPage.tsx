import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '../api'
import { AuthMascot, useAuthMascotMood } from '../components/AuthMascot'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import './auth.css'

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, from])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typePulse, setTypePulse] = useState(0)
  const typingTimer = useRef<number | null>(null)

  const markTyping = () => {
    setIsTyping(true)
    setTypePulse((n) => n + 1)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => setIsTyping(false), 700)
  }

  useEffect(() => () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
  }, [])

  // Track focus via native focusin (works with automation + real users)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLInputElement)) return
      if (!t.closest('form')) return
      setFocusedField(t.id || t.name || 'field')
    }
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLInputElement)) return
      const next = e.relatedTarget
      if (next instanceof Node && t.form?.contains(next)) return
      setFocusedField(null)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const [hovering, setHovering] = useState(false)

  const { mood, onOneShotEnd, typePulse: mascotPulse, passwordStrength } = useAuthMascotMood({
    mode: 'login',
    error,
    loading,
    focusedField,
    isTyping,
    password,
    typePulse,
    hovering,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const base = getApiBaseUrl()
    window.location.href = `${base}/api/account/google/redirect?redirectTo=${encodeURIComponent(redirectTo)}`
  }

  return (
    <div className="container page auth-page">
      <div
        className="auth-shell"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <AuthMascot
          mood={mood}
          mode="login"
          onOneShotEnd={onOneShotEnd}
          typePulse={mascotPulse}
          passwordStrength={passwordStrength}
          className={hovering ? 'auth-mascot--hover' : ''}
        />
        <div className={`auth-card card ${error ? 'auth-card--error' : ''} ${loading ? 'auth-card--busy' : ''}`}>
          <h1 className="page-title">Đăng nhập</h1>
          <p className="page-subtitle">Chào mừng trở lại Homeji</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${focusedField === 'email' ? 'is-focused' : ''}`}>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  markTyping()
                }}
                required
                autoComplete="email"
              />
            </div>
            <div className={`form-group ${focusedField === 'password' ? 'is-focused' : ''}`}>
              <label className="form-label" htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  markTyping()
                }}
                required
                autoComplete="current-password"
              />
              {password.length > 0 && (
                <div className="auth-strength" aria-hidden="true">
                  <span className={passwordStrength >= 0.25 ? 'is-on' : ''} />
                  <span className={passwordStrength >= 0.5 ? 'is-on' : ''} />
                  <span className={passwordStrength >= 0.75 ? 'is-on' : ''} />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-divider">hoặc</div>

          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => void handleGoogleLogin()}>
            Đăng nhập với Google
          </button>

          <p className="auth-footer">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
            {' · '}
            <Link to="/register">Tạo tài khoản mới</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
