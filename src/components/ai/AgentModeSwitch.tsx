import { HomejiAgentMark } from './HomejiAgentMark'
import { memo, useEffect, useState } from 'react'
import { getMySubscription } from '../../api'
import type { AgentAccess } from '../../api/types'
import './AgentModeSwitch.css'

type AccessState =
  | {
      kind: 'ready'
      canUse: boolean
      isPremium: boolean
      premiumExpiresAt: number | null
      freeWeeklyLimit: number
      freeWeeklyRemaining: number
      hasActiveFreeSession: boolean
      nextFreeResetAt: string | null
    }
  | { kind: 'error' }

function formatResetDate(iso?: string | null): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ms)
  } catch {
    return null
  }
}

export const AgentModeSwitch = memo(function AgentModeSwitch({
  active,
  busy,
  enabled,
  authenticated,
  refreshTrigger = 0,
  serverAccess = null,
  onChange,
  onUpgrade,
  onAccessResolved,
}: {
  active: boolean
  busy: boolean
  enabled: boolean
  authenticated: boolean
  refreshTrigger?: number
  serverAccess?: AgentAccess | null
  onChange: (active: boolean) => void
  onUpgrade: () => void
  onAccessResolved?: (access: {
    canUse: boolean
    isPremium: boolean
    hasActiveFreeSession: boolean
  }) => void
}) {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!serverAccess || !authenticated) return
    setAccess(prev => ({
      kind: 'ready',
      canUse: serverAccess.canUse,
      isPremium: serverAccess.isPremium,
      premiumExpiresAt: prev?.kind === 'ready' ? prev.premiumExpiresAt : null,
      freeWeeklyLimit: serverAccess.freeWeeklyLimit,
      freeWeeklyRemaining: serverAccess.freeWeeklyRemaining,
      hasActiveFreeSession: serverAccess.hasActiveFreeSession,
      nextFreeResetAt: serverAccess.nextFreeResetAt ?? null,
    }))
  }, [serverAccess, authenticated])

  useEffect(() => {
    if (!enabled || !authenticated) return
    let alive = true
    let pending = false

    async function refresh() {
      if (pending || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
      pending = true
      try {
        const subscription = await getMySubscription()
        const expiresAt = Date.parse(subscription.premiumExpiresAt ?? '')
        const hasValidPremium = subscription.isPremium && (!subscription.premiumExpiresAt || Number.isFinite(expiresAt))
        const serverAccess = subscription.agentAccess
        if (alive) {
          if (serverAccess) {
            setAccess({
              kind: 'ready',
              canUse: serverAccess.canUse,
              isPremium: serverAccess.isPremium,
              premiumExpiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
              freeWeeklyLimit: serverAccess.freeWeeklyLimit,
              freeWeeklyRemaining: serverAccess.freeWeeklyRemaining,
              hasActiveFreeSession: serverAccess.hasActiveFreeSession,
              nextFreeResetAt: serverAccess.nextFreeResetAt ?? null,
            })
          } else {
            const legacyPremium = Boolean(hasValidPremium && (!Number.isFinite(expiresAt) || expiresAt > Date.now()))
            setAccess({
              kind: 'ready',
              canUse: legacyPremium,
              isPremium: legacyPremium,
              premiumExpiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
              freeWeeklyLimit: 1,
              freeWeeklyRemaining: 0,
              hasActiveFreeSession: false,
              nextFreeResetAt: null,
            })
          }
        }
      } catch {
        if (alive) setAccess({ kind: 'error' })
      } finally {
        pending = false
      }
    }

    void refresh()
    const onWake = () => {
      void refresh()
    }
    const timer = window.setInterval(onWake, 60000)
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      alive = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [enabled, authenticated, attempt, refreshTrigger])

  const ready = authenticated && access?.kind === 'ready'
  const premiumExpired = Boolean(ready && access.isPremium && access.premiumExpiresAt !== null && access.premiumExpiresAt <= now)
  const isPremium = Boolean(ready && access.isPremium && !premiumExpired)
  const hasActiveFreeSession = Boolean(ready && !isPremium && access.hasActiveFreeSession)
  const freeRemaining = ready && !isPremium ? access.freeWeeklyRemaining : 0
  const canUse = Boolean(ready && !premiumExpired && (isPremium || access.canUse))
  const loading = authenticated && !access

  useEffect(() => {
    if (access?.kind !== 'ready' || !access.isPremium || access.premiumExpiresAt === null) return
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(access.premiumExpiresAt - Date.now() + 10, 2147483647)),
    )
    return () => window.clearTimeout(timer)
  }, [access])

  useEffect(() => {
    if (ready) {
      onAccessResolved?.({ canUse, isPremium, hasActiveFreeSession })
    }
  }, [ready, canUse, isPremium, hasActiveFreeSession, onAccessResolved])

  useEffect(() => {
    if (active && !busy && (!authenticated || access?.kind === 'error' || (ready && !canUse))) {
      onChange(false)
    }
  }, [active, busy, authenticated, access, ready, canUse, onChange])

  const badgeText = isPremium
    ? 'PREMIUM'
    : hasActiveFreeSession
      ? 'ĐANG DÙNG FREE'
      : canUse
        ? `${freeRemaining || 1} LƯỢT/TUẦN`
        : 'HẾT LƯỢT'

  const agentAriaLabel = isPremium
    ? 'Agent · Premium'
    : canUse
      ? 'Agent · Miễn phí 1 lượt/tuần'
      : 'Agent · Đã hết lượt tuần này'

  const resetFormatted = ready ? formatResetDate(access.nextFreeResetAt) : null

  let descriptionText: string
  if (active) {
    if (busy) {
      descriptionText = 'Agent đang phân tích mục tiêu và gọi công cụ…'
    } else if (!isPremium && hasActiveFreeSession) {
      descriptionText = 'Đang dùng lượt Agent miễn phí tuần này · ghi nhớ ngữ cảnh trong phiên.'
    } else if (!isPremium) {
      descriptionText = 'Đang bật Agent · lượt miễn phí tuần này (1 lượt/tuần) sẽ dùng khi bạn gửi tin.'
    } else {
      descriptionText = 'Ghi nhớ mục tiêu & ngữ cảnh, hỏi làm rõ, tìm phòng và soạn bài theo yêu cầu.'
    }
  } else if (!authenticated) {
    descriptionText = 'Đăng nhập để dùng thử Agent 1 lượt/tuần hoặc nâng cấp Premium.'
  } else if (loading) {
    descriptionText = 'Đang kiểm tra quyền sử dụng Agent…'
  } else if (access?.kind === 'error') {
    descriptionText = 'Chưa kiểm tra được quyền sử dụng Agent.'
  } else if (isPremium) {
    descriptionText = 'Trò chuyện thường, hoặc bật Agent để ghi nhớ mục tiêu và tra cứu tự động.'
  } else if (hasActiveFreeSession) {
    descriptionText = 'Bạn đang có phiên Agent miễn phí tuần này chưa kết thúc.'
  } else if (canUse) {
    descriptionText = `Bạn có ${freeRemaining || 1} lượt dùng Agent miễn phí tuần này.`
  } else {
    descriptionText = resetFormatted
      ? `Đã hết 1 lượt Agent miễn phí tuần này (mở lại ${resetFormatted}).`
      : 'Đã hết 1 lượt Agent miễn phí tuần này.'
  }

  return (
    <section
      className={`agent-mode-switch${active ? ' is-agent' : ''}${busy && active ? ' is-working' : ''}`}
      aria-label="Chế độ trợ lý"
    >
      <div className="agent-mode-switch__control" role="group" aria-label="Chọn Chat hoặc Agent">
        <span className="agent-mode-switch__thumb" aria-hidden="true" />
        <button type="button" aria-pressed={!active} disabled={busy} onClick={() => onChange(false)}>
          Chat
        </button>
        <button
          type="button"
          aria-pressed={active}
          disabled={!canUse || busy}
          onClick={() => {
            if (canUse) onChange(true)
          }}
          aria-label={agentAriaLabel}
        >
          {!canUse ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="3.5" y="7" width="9" height="7" rx="2" />
              <path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" />
            </svg>
          ) : (
            <HomejiAgentMark />
          )}
          Agent <small>{badgeText}</small>
        </button>
      </div>
      {!isPremium || active || busy ? (
        <div className="agent-mode-switch__description" key={active ? 'agent' : 'chat'}>
          <span className="agent-mode-switch__status" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p>{descriptionText}</p>
          {!active && !loading && !canUse ? (
            <button
              type="button"
              className="agent-mode-switch__upgrade"
              disabled={busy}
              onClick={() => (access?.kind === 'error' ? setAttempt(value => value + 1) : onUpgrade())}
            >
              {access?.kind === 'error' ? 'Thử lại' : 'Nâng cấp'}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
})
