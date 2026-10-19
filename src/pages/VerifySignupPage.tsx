import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resendSignupOtp, verifySignupOtp } from '../api/receipts'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import { trackFunnelEvent } from '../lib/ga4'

export function VerifySignupPage() {
  const navigate = useNavigate()
  const { setSessionFromAuth } = useAuth()
  const [email, setEmail] = useState(() => sessionStorage.getItem('homeji_pending_signup_email') ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const lock = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const session = await verifySignupOtp(email.trim(), code.trim())
      await setSessionFromAuth(session)
      trackFunnelEvent('sign_up')
      sessionStorage.removeItem('homeji_pending_signup_email')
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Không xác thực được mã OTP.'))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function resend() {
    if (lock.current || remaining > 0 || !email.trim()) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await resendSignupOtp(email.trim())
      setCode('')
      setMessage(result.message)
      setRemaining(60)
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa gửi được mã mới.'))
      setRemaining(60)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return <div className="container page auth-page"><section className="auth-card card" style={{ maxWidth: 540, width: '100%' }}>
    <h1 className="page-title">Xác thực email đăng ký</h1>
    <p>Hoàn tất đăng ký Homeji bằng mã 6 chữ số đã gửi tới email của bạn.</p>
    <p>Mã có hiệu lực tối đa 10 phút và được thử tối đa 5 lần.</p>
    <p>Kiểm tra cả thư rác nếu chưa thấy email.</p>
    {error && <p id="signup-otp-error" className="auth-card__error" role="alert">{error}</p>}
    {message && <p className="auth-card__message" role="status">{message}</p>}
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      <label className="form-label">Email đăng ký<input className="form-input" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy}
        onChange={event => { setEmail(event.target.value); setCode(''); setError(''); setMessage('') }} /></label>
      <label className="form-label">Mã OTP (6 chữ số)<input className="form-input" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}"
        aria-describedby={error ? 'signup-otp-error' : undefined}
        minLength={6} maxLength={6} value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></label>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác thực và hoàn tất đăng ký'}</button>
      <button className="btn" type="button" disabled={busy || remaining > 0 || !email.trim()} onClick={() => void resend()}>
        {remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã OTP'}
      </button>
    </form>
    <p>Chưa tạo tài khoản? <Link to="/register">Đăng ký Homeji</Link></p>
    <p><Link to="/login">Quay lại đăng nhập</Link></p>
  </section></div>
}
