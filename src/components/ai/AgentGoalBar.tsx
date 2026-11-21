import type { AgentGoal } from '../../api/types'
import './AgentGoalBar.css'

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang theo dõi mục tiêu',
  awaiting_clarification: 'Cần bạn trả lời thêm',
  awaiting_confirmation: 'Chờ bạn xác nhận',
  completed: 'Đã hoàn tất bước',
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

export function AgentGoalBar({
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

  return (
    <section
      className={`agent-goal-bar is-${goal.status || 'active'}`}
      aria-label="Mục tiêu hiện tại của Agent"
    >
      <div className="agent-goal-bar__top">
        <span className="agent-goal-bar__status">{statusLabel}</span>
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

      <strong className="agent-goal-bar__title">{goal.title}</strong>

      {factEntries.length > 0 ? (
        <ul className="agent-goal-bar__facts" aria-label="Thông tin đã ghi nhớ">
          {factEntries.slice(0, 5).map(([key, value]) => (
            <li key={key}>
              <span>{key}:</span> {value}
            </li>
          ))}
        </ul>
      ) : null}

      {goal.missingInfo?.length ? (
        <p className="agent-goal-bar__missing">
          Cần làm rõ: {goal.missingInfo.slice(0, 3).join(' · ')}
        </p>
      ) : null}
    </section>
  )
}
