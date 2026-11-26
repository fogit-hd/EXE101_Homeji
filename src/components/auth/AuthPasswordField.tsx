import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  visible: boolean
  onToggle: () => void
}

export function AuthPasswordField({ id, label, visible, onToggle, ...input }: Props) {
  return <div className="auth-cinema__field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-login-password">
      <input {...input} id={id} type={visible ? 'text' : 'password'} />
      <button type="button" data-glass-exclude className="auth-login-password__toggle"
        aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} aria-controls={id} onClick={onToggle}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          {visible ? <path d="m3 3 18 18" /> : null}
        </svg>
      </button>
    </div>
  </div>
}
