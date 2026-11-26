import './auth.css'
import type { CredentialResponse } from '@react-oauth/google'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { googleLoginWithIdToken } from '../api'
import { consumeSessionTerminationMessage } from '../api/authSession'
import { AuthSectionViewport } from '../components/auth/AuthSectionViewport'
import { AuthSectionPanel } from '../components/auth/AuthSectionPanel'
import { AuthPasswordField } from '../components/auth/AuthPasswordField'
import { AuthShowcase } from '../components/auth/AuthShowcase'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { PasswordRecoveryForm } from '../components/auth/PasswordRecoveryForm'
import { usePasswordRecovery } from '../components/auth/usePasswordRecovery'
import { useAuth } from '../contexts/AuthContext'
import { authDestination, persistAuthDestination } from '../lib/authDestination'
import { AUTH_SECTIONS, authSection, authSectionUrl, type AuthSection } from '../lib/authSections'
import { getErrorMessage } from '../lib/errors'
import { googleOAuthClientId } from '../lib/googleOAuthClient'
import { normalizeEmail, normalizeFullName, USER_INPUT_LIMITS, validateFullName, validateRegistrationEmail, validateRegistrationPassword } from '../lib/userInputValidation'
import './AuthPage.css'
import './AuthFormLayout.css'
import './AuthLoginLayout.css'
import './AuthUnified.css'

const COPY = {
  login: { title: 'Đăng nhập', subtitle: 'Đăng nhập để xem phòng đã lưu và tin nhắn' },
  register: { title: 'Đăng ký', subtitle: 'Miễn phí, chỉ cần email và mật khẩu' },
  'forgot-password': { title: 'Quên mật khẩu', subtitle: 'Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.' },
} as const

export function AuthPage({ initialMode }: { initialMode?: 'signin' | 'signup' } = {}) {
  const { login, register, isAuthenticated, isLoading, profile, setSessionFromAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const authPath = location.pathname.replace(/\/+$/, '') === '/auth'
  const section = authPath ? authSection(location.search) : initialMode === 'signup' ? 'register' : 'login'
  const [transition, setTransition] = useState({ section, direction: 1 })
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(() => consumeSessionTerminationMessage() ?? '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const mounted = useRef(true)
  const currentSection = useRef(section)
  useLayoutEffect(() => { currentSection.current = section }, [section])
  useEffect(() => () => { mounted.current = false }, [])
  const formSubmitLock = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reduced = useReducedMotion()
  const recovery = usePasswordRecovery()

  if (transition.section !== section) {
    setTransition({ section, direction: AUTH_SECTIONS.indexOf(section) > AUTH_SECTIONS.indexOf(transition.section) ? 1 : -1 })
    setError(''); setMessage(''); setPassword(''); setConfirmPassword(''); setShowPassword(false)
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && !submitting) navigate(authDestination(from, profile?.role), { replace: true })
  }, [isAuthenticated, isLoading, navigate, from, profile?.role, submitting])

  useEffect(() => {
    if (authPath && (location.pathname !== '/auth' || new URLSearchParams(location.search).get('section') !== section)) {
      navigate(authSectionUrl(section, location.search, location.hash), { replace: true, state: location.state })
    }
  }, [authPath, section, location.pathname, location.search, location.hash, location.state, navigate])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = previous }
  }, [])

  const switchSection = (next: AuthSection) => {
    if (formSubmitLock.current || recovery.loading || next === section) return
    navigate(authSectionUrl(next, location.search, location.hash), { state: location.state })
  }

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    if (formSubmitLock.current) return
    formSubmitLock.current = true
    setError(''); setSubmitting(true)
    try { await login(email, password) }
    catch (reason) { setError(getErrorMessage(reason, 'Chưa đăng nhập được. Kiểm tra email và mật khẩu rồi thử lại.')) }
    finally { formSubmitLock.current = false; setSubmitting(false) }
  }

  const handleSignUpCard = async (event: FormEvent) => {
    event.preventDefault()
    if (formSubmitLock.current) return
    setError(''); setMessage('')
    const nextName = normalizeFullName(displayName)
    const nextEmail = normalizeEmail(email)
    const validationError = validateFullName(nextName) || validateRegistrationEmail(nextEmail) || validateRegistrationPassword(password, confirmPassword)
    if (validationError) { setError(validationError); return }
    formSubmitLock.current = true
    setSubmitting(true)
    try {
      const session = await register(nextEmail, password, nextName)
      if (!mounted.current || currentSection.current !== 'register') return
      if (session.emailConfirmationRequired) {
        if (session.confirmationMethod === 'otp') { navigate('/verify-email', { state: { from } }); return }
        persistAuthDestination(from)
        setMessage(session.message || 'Vui lòng xác nhận email trước khi đăng nhập.')
      } else { navigate(authDestination(from, profile?.role), { replace: true }) }
    } catch (reason) { setError(getErrorMessage(reason, 'Chưa đăng ký được. Vui lòng thử lại.')) }
    finally { formSubmitLock.current = false; setSubmitting(false) }
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const signup = section === 'register'
    const fallback = signup ? 'Chưa đăng ký được bằng Google. Vui lòng thử lại.' : 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.'
    if (!response.credential) { setError(fallback); return }
    if (formSubmitLock.current) return
    formSubmitLock.current = true
    setError(''); setSubmitting(true)
    try {
      const session = await googleLoginWithIdToken({ idToken: response.credential }, signup ? 'sign_up' : 'login')
      await setSessionFromAuth(session)
    } catch (reason) { setError(getErrorMessage(reason, fallback)) }
    finally { formSubmitLock.current = false; setSubmitting(false) }
  }

  const recovering = section === 'forgot-password'
  const title = recovering && recovery.done ? 'Đã đổi mật khẩu' : COPY[section].title
  const subtitle = recovering && recovery.sent && !recovery.done
    ? 'Nhập mã trong email và đặt mật khẩu mới. Mã có hiệu lực tối đa 10 phút.' : COPY[section].subtitle


  return <div className="auth-cinema auth-cinema--form auth-cinema--login auth-unified" role="main" aria-label={title}>
    <div className="auth-cinema__stage">
      <div className="auth-cinema__form-wrap is-ready">
        <div className="auth-cinema__card">
          <Link to="/" className="auth-login-brand" aria-label="Homeji — Trang chủ"><img loading="eager" decoding="async" src="/brand/homeji-logo2.png" width="28" height="28" alt="" /><span>Homeji</span></Link>
          <AuthSectionViewport>
          <AnimatePresence initial={false} mode="popLayout" custom={transition.direction}>
            <AuthSectionPanel key={section} section={section} direction={transition.direction} reduced={Boolean(reduced)}>
              <h1 ref={headingRef} tabIndex={-1} className="auth-cinema__title">{title}</h1>
              <p className="auth-cinema__subtitle">{recovery.done && recovering ? 'Bạn có thể đăng nhập bằng mật khẩu mới.' : subtitle}</p>
              {recovering ? <PasswordRecoveryForm recovery={recovery} onBack={() => switchSection('login')} visible={showPassword} onToggle={() => setShowPassword(value => !value)} /> : <>
                {error ? <div id="auth-form-error" className="auth-cinema__alert auth-cinema__alert--error" role="alert">{error}</div> : null}
                {message ? <div className="auth-cinema__alert auth-cinema__alert--ok" role="status">{message}</div> : null}
                {googleOAuthClientId ? <>
                  <div className="auth-modal__google-wrap"><GoogleSignInButton maxWidth={380} text={section === 'register' ? 'signup_with' : 'signin_with'}
                    onSuccess={handleGoogleSuccess} onError={() => setError(section === 'register' ? 'Chưa đăng ký được bằng Google. Vui lòng thử lại.' : 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.')} /></div>
                  <div className="auth-cinema__divider">{section === 'register' ? 'hoặc đăng ký bằng email' : 'hoặc đăng nhập bằng email'}</div>
                </> : null}
                <form aria-busy={submitting} aria-describedby={error ? 'auth-form-error' : undefined} onSubmit={event => void (section === 'register' ? handleSignUpCard(event) : handleSignIn(event))}>
                  <div className="auth-cinema__field"><label htmlFor={section === 'register' ? 'auth-reg-email' : 'auth-email'}>Email</label>
                    <input id={section === 'register' ? 'auth-reg-email' : 'auth-email'} type="email" value={email} onChange={event => setEmail(event.target.value)} required
                      autoComplete="email" maxLength={section === 'register' ? USER_INPUT_LIMITS.email : undefined} placeholder={section === 'register' ? 'ban@gmail.com' : 'ban@email.com'} />
                  </div>
                  {section === 'register' ? <div className="auth-cinema__field"><label htmlFor="auth-name">Họ tên</label>
                    <input id="auth-name" value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={USER_INPUT_LIMITS.fullName} autoComplete="name" placeholder="Nguyễn Văn A" />
                  </div> : null}
                  <AuthPasswordField id={section === 'register' ? 'auth-reg-password' : 'auth-password'} label="Mật khẩu" visible={showPassword} onToggle={() => setShowPassword(value => !value)}
                    value={password} onChange={event => setPassword(event.target.value)} required minLength={section === 'register' ? 6 : undefined}
                    autoComplete={section === 'register' ? 'new-password' : 'current-password'} placeholder={section === 'register' ? 'Ít nhất 6 ký tự' : 'Nhập mật khẩu của bạn'} />
                  {section === 'register' ? <>
                    <AuthPasswordField id="auth-reg-confirm-password" label="Xác nhận mật khẩu" visible={showPassword} onToggle={() => setShowPassword(value => !value)}
                      value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setError('') }} minLength={6} required autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu" aria-invalid={Boolean(confirmPassword && password !== confirmPassword)} aria-describedby={confirmPassword ? 'auth-password-match' : undefined} />
                    {confirmPassword ? <p id="auth-password-match" className="auth-password-match" role="status">{password === confirmPassword ? 'Mật khẩu đã khớp.' : 'Mật khẩu xác nhận chưa khớp.'}</p> : null}
                  </> : <Link className="auth-login-forgot" to={authSectionUrl('forgot-password', location.search, location.hash)} state={location.state} aria-disabled={submitting}
                    onClick={event => { if (submitting) event.preventDefault() }}>Quên mật khẩu?</Link>}
                  <button type="submit" data-glass-exclude className="auth-cinema__submit" disabled={submitting}>
                    {submitting ? section === 'register' ? 'Đang đăng ký...' : 'Đang đăng nhập...' : COPY[section].title}
                  </button>
                </form>
                <p className="auth-cinema__footer" data-glass-exclude>{section === 'register' ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                  <button type="button" disabled={submitting} onClick={() => switchSection(section === 'register' ? 'login' : 'register')}>{section === 'register' ? 'Đăng nhập' : 'Đăng ký'}</button>
                </p>
              </>}
            </AuthSectionPanel>
          </AnimatePresence>
          </AuthSectionViewport>
              <p className="auth-account-notice">{section === 'register' ? 'Bằng việc đăng ký Homeji, bạn xác nhận đồng ý với ' : 'Khi sử dụng Homeji, vui lòng đọc '}
                <Link to="/terms">Điều khoản sử dụng</Link>{section === 'register' ? ' và đã đọc ' : ' và '}<Link to="/privacy">Chính sách quyền riêng tư</Link>.
              </p>
              <footer className="auth-login-legal"><span>© {new Date().getFullYear()} Homeji</span></footer>

        </div>
      </div>
    </div>
    <AuthShowcase section={section} />
  </div>
}
