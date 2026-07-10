import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthMascot, useAuthMascotMood } from '../components/AuthMascot'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import './auth.css'

export function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
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
    mode: 'register',
    error,
    success: message,
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
    setMessage('')
    setLoading(true)
    try {
      const session = await register(email, password, displayName)
      if (session.emailConfirmationRequired) {
        setMessage(session.message || 'Vui lòng xác nhận email trước khi đăng nhập.')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại'))
    } finally {
      setLoading(false)
    }
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
          mode="register"
          onOneShotEnd={onOneShotEnd}
          typePulse={mascotPulse}
          passwordStrength={passwordStrength}
          className={hovering ? 'auth-mascot--hover' : ''}
        />
        <div className={`auth-card card ${error ? 'auth-card--error' : ''} ${loading ? 'auth-card--busy' : ''} ${message ? 'auth-card--ok' : ''}`}>
          <h1 className="page-title">Đăng ký</h1>
          <p className="page-subtitle">Tạo tài khoản Homeji miễn phí</p>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-info">{message}</div>}

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${focusedField === 'displayName' ? 'is-focused' : ''}`}>
              <label className="form-label" htmlFor="displayName">Họ tên</label>
              <input
                id="displayName"
                className="form-input"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  markTyping()
                }}
                required
                autoComplete="name"
              />
            </div>
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
                minLength={6}
                required
                autoComplete="new-password"
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
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

          <p className="auth-footer">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
