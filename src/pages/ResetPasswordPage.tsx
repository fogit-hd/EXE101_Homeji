import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.replace(/^#/, '')
  return Object.fromEntries(new URLSearchParams(hash))
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = parseHashParams()
    const token = params.access_token
    if (token) setAccessToken(token)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await resetPassword({ accessToken, newPassword })
      setMessage(result.message)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(getErrorMessage(err, 'Đặt lại mật khẩu thất bại'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page auth-page">
      <div className="auth-card card">
        <h1 className="page-title">Đặt lại mật khẩu</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {!accessToken ? (
          <div className="alert alert-info">
            Liên kết không hợp lệ hoặc đã hết hạn.{' '}
            <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
          </div>
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
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
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

  useEffect(() => {
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
      }).then(() => navigate('/', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate, setSessionFromAuth])

  return (
    <div className="container page">
      <p>Đang xử lý đăng nhập...</p>
    </div>
  )
}
