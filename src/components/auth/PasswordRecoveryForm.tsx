import { AuthPasswordField } from './AuthPasswordField'
import type { usePasswordRecovery } from './usePasswordRecovery'

type Props = { recovery: ReturnType<typeof usePasswordRecovery>; onBack: () => void; visible: boolean; onToggle: () => void }

export function PasswordRecoveryForm({ recovery, onBack, visible, onToggle }: Props) {
  const { email, setEmail, code, setCode, password, setPassword, confirmation, setConfirmation, sent, done, cooldown, loading, error, message, codeInputRef, run, changeEmail } = recovery
  return <>
    {error ? <div id="recovery-error" role="alert" className="auth-cinema__alert auth-cinema__alert--error">{error}</div> : null}
    {message ? <div role="status" className="auth-cinema__alert auth-cinema__alert--ok">{message}</div> : null}
    {!done ? <form aria-busy={loading} aria-describedby={error ? 'recovery-error' : undefined}
      onSubmit={event => { event.preventDefault(); void run(sent ? 'reset' : 'send') }}>
      <div className="auth-cinema__field"><label htmlFor="recovery-email">Email</label>
        <input id="recovery-email" type="email" autoComplete="email" maxLength={254} required
          placeholder="ban@email.com" value={email} readOnly={sent} disabled={loading} onChange={event => setEmail(event.target.value)} />
      </div>
      {sent ? <>
        <div className="auth-cinema__field"><label htmlFor="recovery-code">Mã OTP (6 chữ số)</label>
          <input ref={codeInputRef} id="recovery-code" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="Nhập 6 chữ số"
            value={code} disabled={loading} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} />
        </div>
        <AuthPasswordField id="recovery-password" label="Mật khẩu mới" visible={visible} onToggle={onToggle}
          autoComplete="new-password" minLength={6} maxLength={128} required value={password} disabled={loading}
          placeholder="Ít nhất 6 ký tự" onChange={event => setPassword(event.target.value)} />
        <AuthPasswordField id="recovery-confirmation" label="Xác nhận mật khẩu mới" visible={visible} onToggle={onToggle}
          autoComplete="new-password" minLength={6} maxLength={128} required value={confirmation} disabled={loading}
          placeholder="Nhập lại mật khẩu" onChange={event => setConfirmation(event.target.value)} />
      </> : null}
      <button type="submit" data-glass-exclude className="auth-cinema__submit" disabled={loading}>
        {loading ? 'Đang xử lý…' : sent ? 'Đổi mật khẩu' : 'Gửi mã OTP'}
      </button>
      {sent ? <div className="auth-recovery-actions">
        <button type="button" disabled={loading || cooldown > 0} onClick={() => void run('send')}>
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
        </button>
        <button type="button" disabled={loading} onClick={changeEmail}>Đổi email</button>
      </div> : null}
    </form> : null}
    <p className="auth-cinema__footer" data-glass-exclude>
      <button type="button" disabled={loading} onClick={onBack}>Quay lại đăng nhập</button>
    </p>
  </>
}
