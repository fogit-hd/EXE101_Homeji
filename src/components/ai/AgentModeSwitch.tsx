import { useEffect, useState } from 'react'
import { getMySubscription } from '../../api'
import './AgentModeSwitch.css'

type Access = { kind: 'premium'; expiresAt: number } | { kind: 'basic' | 'error' }
export function AgentModeSwitch({ active, busy, enabled, authenticated, onChange, onUpgrade }: {
  active: boolean; busy: boolean; enabled: boolean; authenticated: boolean
  onChange: (active: boolean) => void; onUpgrade: () => void
}) {
  const [access, setAccess] = useState<Access | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!enabled || !authenticated) return
    let alive = true, pending = false
    async function refresh() {
      if (pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        const subscription = await getMySubscription()
        const expiresAt = Date.parse(subscription.premiumExpiresAt ?? '')
        if (alive) setAccess(subscription.isPremium && Number.isFinite(expiresAt)
          ? { kind: 'premium', expiresAt } : { kind: 'basic' })
      } catch { if (alive) setAccess({ kind: 'error' }) }
      finally { pending = false }
    }
    void refresh()
    const timer = window.setInterval(() => { setNow(Date.now()); void refresh() }, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [enabled, authenticated, attempt])
  const premium = authenticated && access?.kind === 'premium' && access.expiresAt > now
  const loading = authenticated && !access
  useEffect(() => {
    if (access?.kind !== 'premium') return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(access.expiresAt - Date.now() + 10, 2147483647)))
    return () => window.clearTimeout(timer)
  }, [access])
  useEffect(() => { if (active && !busy && (!authenticated || access?.kind === 'basic' || access?.kind === 'error' || access?.kind === 'premium' && access.expiresAt <= now)) onChange(false) }, [active, busy, authenticated, access, now, onChange])
  return <section className={`agent-mode-switch${active ? ' is-agent' : ''}${busy && active ? ' is-working' : ''}`} aria-label="Chế độ trợ lý">
    <div className="agent-mode-switch__control" role="group" aria-label="Chọn Chat hoặc Agent">
      <span className="agent-mode-switch__thumb" aria-hidden="true" />
      <button type="button" aria-pressed={!active} disabled={busy} onClick={() => onChange(false)}>Chat</button>
      <button type="button" aria-pressed={active} disabled={!premium || busy} onClick={() => { if (premium) onChange(true) }} aria-label="Agent · Premium">
        {!premium ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="2" /><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" /></svg> : <span className="agent-mode-switch__spark" aria-hidden="true">✦</span>}
        Agent <small>PREMIUM</small>
      </button>
    </div>
    <div className="agent-mode-switch__description" key={active ? 'agent' : 'chat'}>
      <span className="agent-mode-switch__status" aria-hidden="true"><i /><i /><i /></span>
      <p>{active ? busy ? 'Agent đang thực hiện yêu cầu…' : 'Cho thuê, pass phòng, tìm trọ/ở ghép, bán đồ ăn hoặc đồ cũ. Bạn duyệt đúng mẫu trước khi đăng.' : loading ? 'Đang kiểm tra quyền sử dụng Agent…' : access?.kind === 'error' ? 'Chưa kiểm tra được gói thành viên.' : premium ? 'Trò chuyện, tìm phòng hoặc bật Agent để soạn bài.' : 'Agent dành cho Premium · soạn bài từ ảnh, đăng khi bạn xác nhận.'}</p>
      {!active && !loading && !premium ? <button type="button" className="agent-mode-switch__upgrade" disabled={busy} onClick={() => access?.kind === 'error' ? setAttempt(value => value + 1) : onUpgrade()}>{access?.kind === 'error' ? 'Thử lại' : 'Mở khóa'}</button> : null}
    </div>
  </section>
}
