import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api'
import { getErrorMessage } from '../lib/errors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const result = await forgotPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setMessage(result.message)
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi email thất bại'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page auth-page">
      <div className="auth-card card">
        <h1 className="page-title">Quên mật khẩu</h1>
        <p className="page-subtitle">Nhập email để nhận liên kết đặt lại mật khẩu</p>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Đang gửi...' : 'Gửi liên kết'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
