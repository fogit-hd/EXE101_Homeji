import { useId, useState } from 'react'
import { setViewingAppointmentReminder, type ViewingAppointment } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import './AppointmentEmailReminder.css'

const intervals = [
  { minutes: 15, label: '15 phút' },
  { minutes: 30, label: '30 phút' },
  { minutes: 60, label: '1 giờ' },
  { minutes: 1440, label: '1 ngày' },
]

export function AppointmentEmailReminder({ appointment, onUpdated, now, disabled = false }: {
  appointment: ViewingAppointment
  onUpdated: (appointment: ViewingAppointment) => void
  now: number
  disabled?: boolean
}) {
  const selectId = useId()
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState(appointment.reminderMinutesBefore ?? 30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const active = appointment.reminderMinutesBefore != null
  const available = intervals.filter(option => Date.parse(appointment.scheduledAt) - option.minutes * 60_000 > now)

  async function save(value: number | null) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await setViewingAppointmentReminder(appointment.id, value)
      onUpdated(updated)
      setEditing(false)
      setNotice(value == null ? 'Đã hủy lời nhắc email.' : 'Đã lưu lời nhắc. Email sẽ gửi đến địa chỉ tài khoản đã xác thực.')
    } catch (reason) {
      setError(getErrorMessage(reason, 'Chưa lưu được lời nhắc. Vui lòng thử lại.'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="appointment-reminder" aria-label="Lời nhắc email">
    {active && <p className="appointment-reminder__status">
      {appointment.reminderSentAt ? 'Đã gửi email nhắc lịch.'
        : appointment.reminderFailed ? 'Chưa xác nhận được việc gửi email. Vui lòng kiểm tra hộp thư và lịch hẹn.'
        : `Nhắc qua email trước ${intervals.find(option => option.minutes === appointment.reminderMinutesBefore)?.label ?? `${appointment.reminderMinutesBefore} phút`}.`}
    </p>}
    {!editing && !appointment.reminderSentAt && <button type="button" disabled={busy || disabled || available.length === 0}
      onClick={() => { setMinutes(available.some(option => option.minutes === minutes) ? minutes : available[0].minutes); setEditing(true); setNotice(null) }}>
      {active ? 'Đổi lời nhắc email' : 'Đặt lời nhắc qua email'}
    </button>}
    {!active && available.length === 0 && <p>Không còn đủ 15 phút để đặt lời nhắc.</p>}
    {editing && <div className="appointment-reminder__form">
      <label htmlFor={selectId}>Gửi email nhắc trước</label>
      <select id={selectId} value={minutes} disabled={busy || disabled} onChange={event => setMinutes(Number(event.target.value))}>
        {available.map(option => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}
      </select>
      <p>Gửi đến email tài khoản đã xác thực. Đổi giờ xem sẽ cập nhật lời nhắc; hủy lịch sẽ hủy lời nhắc. Nếu giờ nhắc mới đã qua, lời nhắc cũng tự hủy.</p>
      <button type="button" disabled={busy || disabled || !available.some(option => option.minutes === minutes)} onClick={() => void save(minutes)}>{busy ? 'Đang lưu…' : 'Lưu lời nhắc'}</button>
      <button type="button" disabled={busy} onClick={() => setEditing(false)}>Đóng</button>
    </div>}
    {active && !appointment.reminderSentAt && <button type="button" disabled={busy || disabled} onClick={() => void save(null)}>Hủy lời nhắc</button>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="appointment-reminder__error">{error}</p>}
  </div>
}
