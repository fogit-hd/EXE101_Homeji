import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiBaseUrl } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthModalIntent, AuthModalMode } from '../../contexts/AuthModalContext'
import { getErrorMessage } from '../../lib/errors'
import './AuthModal.css'

type Props = {
  open: boolean
  mode: AuthModalMode
  intent: AuthModalIntent | null
  onModeChange: (mode: AuthModalMode) => void
  onClose: () => void
  onSuccess: () => void
}

function intentCopy(intent: AuthModalIntent | null): string | null {
  switch (intent) {
    case 'browse':
      return 'Đăng nhập để mở bộ lọc nâng cao và đầy đủ tính năng tìm phòng'
    case 'contact':
      return 'Đăng nhập để xem số điện thoại chủ nhà'
    case 'invite':
      return 'Đăng nhập để nhắn tin / gửi lời mời ở ghép'
    case 'save':
      return 'Đăng nhập để lưu tin yêu thích'
    case 'report':
      return 'Đăng nhập để gửi báo cáo'
    case 'post':
      return 'Đăng nhập để đăng tin hoặc quản lý tin của bạn'
    default:
      return null
  }
}

export function AuthModal({ open, mode, intent, onModeChange, onClose, onSuccess }: Props) {
  const { login, register } = useAuth()
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setMessage('')
    setSubmitting(false)
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const subtitle = intentCopy(intent)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const session = await register(email, password, displayName)
      if (session.emailConfirmationRequired) {
        setMessage(session.message || 'Vui lòng xác nhận email trước khi đăng nhập.')
      } else {
        onSuccess()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const base = getApiBaseUrl()
    window.location.href = `${base}/api/account/google/redirect?redirectTo=${encodeURIComponent(redirectTo)}`
  }

  return (
    <div className="auth-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-modal__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        {mode === 'login' ? (
          <>
            <h2 id={titleId} className="auth-modal__title">
              Đăng nhập
            </h2>
            <p className="auth-modal__subtitle">{subtitle ?? 'Chào mừng trở lại Homeji'}</p>
            {error ? <div className="alert alert-error">{error}</div> : null}
            <form onSubmit={(e) => void handleLogin(e)}>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-modal-email">
                  Email
                </label>
                <input
                  id="auth-modal-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="ban@email.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-modal-password">
                  Mật khẩu
                </label>
                <input
                  id="auth-modal-password"
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn btn-primary auth-modal__submit" disabled={submitting}>
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
            <div className="auth-modal__divider">hoặc</div>
            <button type="button" className="btn btn-secondary auth-modal__google" onClick={handleGoogleLogin}>
              Đăng nhập với Google
            </button>
            <p className="auth-modal__footer">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => onModeChange('register')}>
                Đăng ký
              </button>
            </p>
            <p className="auth-modal__footer">
              <Link to="/forgot-password" onClick={onClose}>
                Quên mật khẩu?
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 id={titleId} className="auth-modal__title">
              Đăng ký
            </h2>
            <p className="auth-modal__subtitle">{subtitle ?? 'Tạo tài khoản Homeji miễn phí'}</p>
            {error ? <div className="alert alert-error">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}
            <form onSubmit={(e) => void handleRegister(e)}>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-modal-name">
                  Họ tên
                </label>
                <input
                  id="auth-modal-name"
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-modal-reg-email">
                  Email
                </label>
                <input
                  id="auth-modal-reg-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="ban@email.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-modal-reg-password">
                  Mật khẩu
                </label>
                <input
                  id="auth-modal-reg-password"
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>
              <button type="submit" className="btn btn-primary auth-modal__submit" disabled={submitting}>
                {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
              </button>
            </form>
            <p className="auth-modal__footer">
              Đã có tài khoản?{' '}
              <button type="button" onClick={() => onModeChange('login')}>
                Đăng nhập
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
