import { memo } from 'react'
import type { AgentGoal } from '../../api/types'
import './AgentGoalBar.css'

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang theo dõi mục tiêu',
  awaiting_clarification: 'Cần bạn trả lời thêm',
  awaiting_confirmation: 'Chờ bạn xác nhận',
  completed: 'Đã hoàn tất bước',
}

const FACT_KEY_LABELS: Record<string, string> = {
  userrole: 'Vai trò',
  role: 'Vai trò',
  school: 'Trường',
  preferredarea: 'Khu vực',
  area: 'Khu vực',
  location: 'Khu vực',
  maxbudget: 'Ngân sách',
  budget: 'Ngân sách',
  rentalneed: 'Nhu cầu',
  sleephabit: 'Giờ giấc',
  petpreference: 'Thú cưng',
  smokingpreference: 'Hút thuốc',
  kind: 'Loại tin',
}

const FACT_VALUE_LABELS: Record<string, string> = {
  landlord: 'Chủ nhà',
  renter: 'Người thuê',
  tenant: 'Người thuê',
  admin: 'Quản trị viên',
  rental: 'Cho thuê phòng',
  roommate: 'Tìm ở ghép',
  roomtransfer: 'Nhượng phòng',
  secondhand: 'Đồ cũ',
  food: 'Đồ ăn',
  wanted: 'Tìm mua',
}

function formatFactKey(rawKey: string): string {
  const normalized = rawKey.trim().toLowerCase()
  return FACT_KEY_LABELS[normalized] ?? rawKey.trim()
}

function formatFactValue(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase()
  return FACT_VALUE_LABELS[normalized] ?? rawValue.trim()
}

function formatGoalTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\bLandlord\b/gi, 'chủ nhà')
    .replace(/\bRenter\b/gi, 'người thuê')
}

function formatExpiryTime(expiresAt?: string | null): string | null {
  if (!expiresAt) return null
  const ms = Date.parse(expiresAt)
  if (!Number.isFinite(ms)) return null
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(ms)
  } catch {
    return null
  }
}

export const AgentGoalBar = memo(function AgentGoalBar({
  goal,
  busy,
  onReset,
}: {
  goal: AgentGoal
  busy: boolean
  onReset: () => void
}) {
  const statusLabel = STATUS_LABELS[goal.status] ?? STATUS_LABELS.active
  const factEntries = Object.entries(goal.facts ?? {}).filter(
    ([key, value]) => key.trim() && value.trim(),
  )
  const expiresTime = formatExpiryTime(goal.expiresAt)
  const visibleFacts = factEntries.slice(0, 5)
  const missingItems = goal.missingInfo?.slice(0, 3) ?? []

  return (
    <section
      className={`agent-goal-bar is-${goal.status || 'active'}`}
      aria-label="Mục tiêu hiện tại của Agent"
    >
      <div className="agent-goal-bar__top">
        <div className="agent-goal-bar__headline">
          <span className="agent-goal-bar__status">{statusLabel}</span>
          <strong className="agent-goal-bar__title">{formatGoalTitle(goal.title)}</strong>
        </div>
        <div className="agent-goal-bar__meta">
          {expiresTime ? (
            <span className="agent-goal-bar__ttl" title="Bộ nhớ tạm của Agent được giữ trong phiên">
              Nhớ tới {expiresTime}
            </span>
          ) : null}
          <button
            type="button"
            className="agent-goal-bar__reset"
            disabled={busy}
            onClick={onReset}
            title="Đặt lại mục tiêu và bộ nhớ tạm"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {visibleFacts.length > 0 || missingItems.length > 0 ? (
        <div className="agent-goal-bar__sub">
          {visibleFacts.length > 0 ? (
            <ul className="agent-goal-bar__facts" aria-label="Thông tin đã ghi nhớ">
              {visibleFacts.map(([key, value]) => (
                <li key={key}>
                  <span>{formatFactKey(key)}:</span> {formatFactValue(value)}
                </li>
              ))}
            </ul>
          ) : null}

          {missingItems.length > 0 ? (
            <p className="agent-goal-bar__missing">
              Cần làm rõ: {missingItems.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
})
