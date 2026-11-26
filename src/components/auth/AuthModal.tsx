import { X } from 'lucide-react'
import type { CredentialResponse } from '@react-oauth/google'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { googleLoginWithIdToken } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthModalIntent, AuthModalMode } from "../../contexts/AuthModalContext.logic"
import { useChangedInputs } from '../../hooks/useChangedInputs'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { persistAuthDestination } from '../../lib/authDestination'
import { useMotionPresence } from '../motion/useMotionPresence'
import { useTabTransition } from '../motion/useTabTransition'
import { GoogleSignInButton } from './GoogleSignInButton'

import { getErrorMessage } from '../../lib/errors'
import { googleOAuthClientId } from '../../lib/googleOAuthClient'
import {
  normalizeEmail,
  normalizeFullName,
  USER_INPUT_LIMITS,
  validateFullName,
  validateRegistrationEmail,
} from '../../lib/userInputValidation'
import { PageNotice } from '../toast/PageNotice'
import './AuthModal.css'

const AUTH_MODES = ['login', 'register'] as const

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
      return 'Đăng nhập để xem số điện thoại và liên hệ với người đăng qua Zalo hoặc Facebook'
    case 'invite':
      return 'Đăng nhập để nhắn tin / gửi lời mời ở ghép'
    case 'save':
      return 'Đăng nhập để lưu tin yêu thích'
    case 'report':
      return 'Đăng nhập để gửi báo cáo'
    case 'post':
      return 'Đăng nhập để đăng tin hoặc quản lý tin của bạn'
    case 'chatbot':
      return 'Đăng nhập để tìm phòng cùng Homeji và giữ tiêu chí trong hội thoại của bạn'
    default:
      return null
  }
}

export function AuthModal({ open, mode, intent, onModeChange, onClose, onSuccess }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, setSessionFromAuth } = useAuth()
  const { present, ...presence } = useMotionPresence(open, 'fade')
  const formRef = useTabTransition(mode, AUTH_MODES)
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Each submit gets an attempt id; closing the modal or switching mode supersedes it, so a
  // late response can neither close a dialog the user moved on from nor overlap a new request.
  const attemptRef = useRef(0)
  const beginAttempt = () => ++attemptRef.current
  const isCurrent = (attempt: number) => attempt === attemptRef.current
  const close = () => { attemptRef.current += 1; onClose() }
  const switchMode = (next: AuthModalMode) => { if (!submitting) onModeChange(next) }

  if (useChangedInputs([open, mode]) && open) {
    setError('')
    setMessage('')
    setSubmitting(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { attemptRef.current += 1; onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // First field gets focus; Tab stays inside the dialog; the opener gets focus back on close.
  useDialogFocus(open && present, formRef, 'input:not([type="hidden"])')

  if (!present) return null

  const subtitle = intentCopy(intent)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const attempt = beginAttempt()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      if (isCurrent(attempt)) onSuccess()
    } catch (err) {
      if (isCurrent(attempt)) setError(getErrorMessage(err, 'Chưa đăng nhập được. Kiểm tra email và mật khẩu rồi thử lại.'))
    } finally {
      if (isCurrent(attempt)) setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const nextName = normalizeFullName(displayName)
    const nextEmail = normalizeEmail(email)
    const validationError = validateFullName(nextName) || validateRegistrationEmail(nextEmail)
    if (validationError) {
      setError(validationError)
      return
    }
    if (submitting) return
    const attempt = beginAttempt()
    setSubmitting(true)
    try {
      const session = await register(nextEmail, password, nextName)
      if (!isCurrent(attempt)) return
      if (session.emailConfirmationRequired) {
        if (session.confirmationMethod === 'otp') {
          // Verification returns to the page the modal was opened on.
          close()
          navigate('/verify-email', { state: { from: `${location.pathname}${location.search}` } })
          return
        }
        persistAuthDestination(`${location.pathname}${location.search}${location.hash}`)
        setMessage(session.message || 'Vui lòng xác nhận email trước khi đăng nhập.')
      } else {
        onSuccess()
      }
    } catch (err) {
      if (isCurrent(attempt)) setError(getErrorMessage(err, 'Chưa đăng ký được. Vui lòng thử lại.'))
    } finally {
      if (isCurrent(attempt)) setSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError(mode === 'register' ? 'Chưa đăng ký được bằng Google. Vui lòng thử lại.' : 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.')
      return
    }
    if (submitting) return
    const attempt = beginAttempt()
    setError('')
    setSubmitting(true)
    try {
      const session = await googleLoginWithIdToken(
        { idToken: credentialResponse.credential },
        mode === 'register' ? 'sign_up' : 'login',
      )
      if (!isCurrent(attempt)) return
      await setSessionFromAuth(session)
      onSuccess()
    } catch (err) {
      if (isCurrent(attempt)) setError(getErrorMessage(err, mode === 'register' ? 'Chưa đăng ký được bằng Google. Vui lòng thử lại.' : 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.'))
    } finally {
      if (isCurrent(attempt)) setSubmitting(false)
    }
  }

  return (
    <div {...presence} className="auth-modal-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div
        ref={formRef}
        className="auth-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-modal__close" onClick={close} aria-label="Đóng" title="Đóng">
          <X aria-hidden="true" size={24} style={{ verticalAlign: 'middle' }} />
        </button>

        {mode === 'login' ? (
          <>
            <h2 id={titleId} className="auth-modal__title">
              Đăng nhập
            </h2>
            <p className="auth-modal__subtitle">{subtitle ?? 'Đăng nhập để lưu phòng và xem số liên hệ'}</p>
            <PageNotice message={error} tone="error" />
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
            {googleOAuthClientId ? (
              <>
                <div className="auth-modal__divider">hoặc</div>
                <div className="auth-modal__google-wrap">
                  <GoogleSignInButton
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Chưa đăng nhập được bằng Google. Vui lòng thử lại.')}
                  />
                </div>
              </>
            ) : null}
            <p className="auth-modal__footer">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => switchMode('register')} disabled={submitting}>
                Đăng ký
              </button>
            </p>
            <p className="auth-modal__footer">
              <Link to="/forgot-password" onClick={close}>
                Quên mật khẩu?
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 id={titleId} className="auth-modal__title">
              Đăng ký
            </h2>
            <p className="auth-modal__subtitle">{subtitle ?? 'Miễn phí, chỉ cần email và mật khẩu'}</p>
            <PageNotice message={error} tone="error" />
            <PageNotice message={message} tone="success" />
            {googleOAuthClientId ? (
              <>
                <div className="auth-modal__divider">hoặc</div>
                <div className="auth-modal__google-wrap">
                  <GoogleSignInButton
                    text="signup_with"
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Chưa đăng ký được bằng Google. Vui lòng thử lại.')}
                  />
                </div>
              </>
            ) : null}
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
                  maxLength={USER_INPUT_LIMITS.fullName}
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
                  maxLength={USER_INPUT_LIMITS.email}
                  autoComplete="email"
                  placeholder="ban@gmail.com"
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
              <button type="button" onClick={() => switchMode('login')} disabled={submitting}>
                Đăng nhập
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
