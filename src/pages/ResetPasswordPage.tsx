import './auth.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredSession, resetPassword } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { PageNotice } from '../components/toast/PageNotice'
import { consumeAuthDestination } from '../lib/authDestination'
import { getErrorMessage } from '../lib/errors'

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.replace(/^#/, '')
  return Object.fromEntries(new URLSearchParams(hash))
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [accessToken] = useState(() => parseHashParams().access_token ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!completed) return
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 2000)
    return () => window.clearTimeout(timer)
  }, [completed, navigate])



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || completed) return
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await resetPassword({ accessToken, newPassword })
      setMessage(result.message)
      setCompleted(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa đặt lại được mật khẩu. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page auth-page">
      <div className="auth-card card">
        <h1 className="page-title">Đặt lại mật khẩu</h1>

        <PageNotice message={error} tone="error" />
        <PageNotice message={message} tone="success" />
        <PageNotice
          message={accessToken ? '' : 'Liên kết không hợp lệ hoặc đã hết hạn.'}
          tone="info"
        />

        {!accessToken ? (
          <p className="page-subtitle">
            <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || completed} style={{ width: '100%' }}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setSessionFromAuth } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = parseHashParams()
    const accessToken = params.access_token
    if (accessToken) {
      void setSessionFromAuth({
        accessToken,
        tokenType: params.token_type ?? 'bearer',
        expiresIn: params.expires_in ? Number(params.expires_in) : null,
        refreshToken: params.refresh_token ?? null,
        userId: null,
        email: null,
        emailConfirmationRequired: false,
        message: '',
      }).then(() => {
        if (cancelled) return
        if (!getStoredSession()) throw new Error('Session adoption failed')
        navigate(consumeAuthDestination(undefined), { replace: true })
      }).catch(() => setError('Không hoàn tất đăng nhập. Vui lòng đăng nhập lại.'))
    } else {
      navigate('/login', { replace: true })
    }
    return () => { cancelled = true }
  }, [navigate, setSessionFromAuth])

  return (
    <div className="container page">
      {error ? (
        <>
          <PageNotice message={error} tone="error" />
          <Link to="/login" replace className="btn btn-primary">Quay lại đăng nhập</Link>
        </>
      ) : <p>Đang xử lý đăng nhập...</p>}
    </div>
  )
}
