import './auth.css'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordOtp, resetPasswordWithOtp } from '../api/recovery'
import { getErrorMessage } from '../lib/errors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const codeInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  useEffect(() => { if (sent) codeInput.current?.focus() }, [sent])

  async function run(action: 'send' | 'reset') {
    if (busy.current) return
    if (action === 'reset' && password !== confirmation) { setError('Mật khẩu xác nhận không khớp.'); return }
    busy.current = true
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = action === 'send'
        ? await requestPasswordOtp(email.trim())
        : await resetPasswordWithOtp(email.trim(), code, password)
      setMessage(result.message)
      if (action === 'send') { setSent(true); setCooldown(60); setCode('') }
      else { setDone(true); setCode(''); setPassword(''); setConfirmation('') }
    } catch (err) { setError(getErrorMessage(err, 'Chưa xử lý được yêu cầu. Vui lòng thử lại.')) }
    finally { busy.current = false; setLoading(false) }
  }

  return <div className="container page auth-page">
    <div className="auth-card card" style={{ maxWidth: 480, margin: 'auto' }}>
      <h1 className="page-title">{done ? 'Đã đổi mật khẩu' : 'Quên mật khẩu'}</h1>
      {!done && <p className="page-subtitle">{sent ? 'Nhập mã trong email và đặt mật khẩu mới. Mã có hiệu lực tối đa 10 phút.' : 'Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.'}</p>}
      {error && <p id="recovery-error" role="alert" className="auth-card__error">{error}</p>}
      {message && <p role="status" className="auth-card__message">{message}</p>}
      {!done && <form aria-busy={loading} aria-describedby={error ? 'recovery-error' : undefined} onSubmit={event => { event.preventDefault(); void run(sent ? 'reset' : 'send') }}>
        <div className="form-group"><label className="form-label" htmlFor="recovery-email">Email</label>
          <input id="recovery-email" className="form-input" type="email" autoComplete="email" maxLength={254} required value={email} readOnly={sent} disabled={loading} onChange={event => setEmail(event.target.value)} />
        </div>
        {sent && <>
          <div className="form-group"><label className="form-label" htmlFor="recovery-code">Mã OTP (6 chữ số)</label>
            <input ref={codeInput} id="recovery-code" className="form-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} disabled={loading} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="form-group"><label className="form-label" htmlFor="recovery-password">Mật khẩu mới</label>
            <input id="recovery-password" className="form-input" type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={password} disabled={loading} onChange={event => setPassword(event.target.value)} />
          </div>
          <div className="form-group"><label className="form-label" htmlFor="recovery-confirmation">Xác nhận mật khẩu mới</label>
            <input id="recovery-confirmation" className="form-input" type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={confirmation} disabled={loading} onChange={event => setConfirmation(event.target.value)} />
          </div>
        </>}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>{loading ? 'Đang xử lý…' : sent ? 'Đổi mật khẩu' : 'Gửi mã OTP'}</button>
        {sent && <div className="auth-footer">
          <button type="button" className="btn btn-secondary" disabled={loading || cooldown > 0} onClick={() => void run('send')}>{cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}</button>{' '}
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => { setSent(false); setCode(''); setPassword(''); setConfirmation(''); setError(''); setMessage('') }}>Đổi email</button>
        </div>}
      </form>}
      <p className="auth-footer"><Link to="/login">Quay lại đăng nhập</Link></p>
    </div>
  </div>
}
