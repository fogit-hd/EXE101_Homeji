import { useCallback, useEffect, useState } from 'react'
import {
  cancelViewingAppointment,
  completeViewingAppointment,
  confirmViewingAppointment,
  getViewingAppointments,
  rejectViewingAppointment,
  rescheduleViewingAppointment,
  ViewingAppointmentStatus,
  type ViewingAppointment,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { ScheduleDateTimePicker } from '../ScheduleDateTimePicker'
import { formatDate, viewingAppointmentStatusLabel } from '../../lib/labels'
import { isoToLocalInputValue } from '../../lib/scheduleDateTime'
import './MapAppointmentsPanel.css'

type Props = {
  embedded?: boolean
}

export function MapAppointmentsPanel({ embedded = false }: Props) {
  const { profile } = useAuth()
  const myId = profile?.id ?? null
  const [items, setItems] = useState<ViewingAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleAt, setRescheduleAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getViewingAppointments())
    } catch (e) {
      setError(getErrorMessage(e, 'Không tải được lịch xem phòng'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (id: string, action: () => Promise<ViewingAppointment>) => {
    setBusyId(id)
    setError(null)
    try {
      const updated = await action()
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)))
    } catch (e) {
      setError(getErrorMessage(e, 'Thao tác thất bại'))
    } finally {
      setBusyId(null)
    }
  }

  const submitReschedule = async (id: string) => {
    if (!rescheduleAt) {
      setError('Chọn thời gian mới.')
      return
    }
    const selected = new Date(rescheduleAt)
    if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
      setError('Thời gian xem phòng phải ở tương lai.')
      return
    }
    await run(id, () =>
      rescheduleViewingAppointment(id, {
        scheduledAt: new Date(rescheduleAt).toISOString(),
      }),
    )
    setRescheduleId(null)
    setRescheduleAt('')
  }

  return (
    <div className={`map-appointments${embedded ? ' is-embedded' : ''}`}>
      {error ? <p className="map-appointments__error map-motion-fade">{error}</p> : null}
      {loading ? <p className="map-appointments__empty">Đang tải lịch hẹn…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="map-appointments__empty">Chưa có lịch xem phòng.</p>
      ) : null}

      <ul className="map-appointments__list">
        {items.map((item, i) => {
          const isOwner = Boolean(myId && item.ownerId === myId)
          const isRequester = Boolean(myId && item.requesterId === myId)
          const pending = item.status === ViewingAppointmentStatus.Pending
          const confirmed = item.status === ViewingAppointmentStatus.Confirmed

          return (
            <li
              key={item.id}
              className="map-appointments__card"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="map-appointments__head">
                <strong>{item.rentalPostTitle}</strong>
                <span className={`map-appointments__status status-${item.status}`}>
                  {viewingAppointmentStatusLabel[item.status] ?? '—'}
                </span>
              </div>
              <p className="map-appointments__time">{formatDate(item.scheduledAt)}</p>
              {item.note ? <p className="map-appointments__note">{item.note}</p> : null}
              <p className="map-appointments__note">
                {isOwner ? 'Bạn là chủ nhà' : isRequester ? 'Bạn đã đặt lịch' : 'Lịch hẹn'}
              </p>

              <div className="map-appointments__actions">
                {isOwner && pending ? (
                  <>
                    <button
                      type="button"
                      className="map-motion-press is-primary"
                      disabled={busyId === item.id}
                      onClick={() => void run(item.id, () => confirmViewingAppointment(item.id))}
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      className="map-motion-press"
                      disabled={busyId === item.id}
                      onClick={() => void run(item.id, () => rejectViewingAppointment(item.id))}
                    >
                      Từ chối
                    </button>
                  </>
                ) : null}

                {isRequester && (pending || confirmed) ? (
                  <button
                    type="button"
                    className="map-motion-press"
                    disabled={busyId === item.id}
                    onClick={() => void run(item.id, () => cancelViewingAppointment(item.id))}
                  >
                    Hủy
                  </button>
                ) : null}

                {isOwner && confirmed ? (
                  <button
                    type="button"
                    className="map-motion-press is-primary"
                    disabled={busyId === item.id}
                    onClick={() => void run(item.id, () => completeViewingAppointment(item.id))}
                  >
                    Hoàn tất
                  </button>
                ) : null}

                {(isOwner || isRequester) && (pending || confirmed) ? (
                  <button
                    type="button"
                    className="map-motion-press"
                    disabled={busyId === item.id}
                    onClick={() => {
                      setRescheduleId(item.id)
                      setRescheduleAt(isoToLocalInputValue(item.scheduledAt))
                    }}
                  >
                    Đổi lịch
                  </button>
                ) : null}
              </div>

              {rescheduleId === item.id ? (
                <div className="map-appointments__reschedule">
                  <ScheduleDateTimePicker
                    label="Thời gian mới"
                    className="map-appointments__reschedule-picker"
                    value={rescheduleAt}
                    onChange={setRescheduleAt}
                  />
                  <div className="map-appointments__reschedule-actions">
                    <button
                      type="button"
                      className="map-appointments__reschedule-btn map-appointments__reschedule-btn--save map-motion-press"
                      disabled={busyId === item.id}
                      onClick={() => void submitReschedule(item.id)}
                    >
                      Lưu lịch mới
                    </button>
                    <button
                      type="button"
                      className="map-appointments__reschedule-btn map-appointments__reschedule-btn--cancel map-motion-press"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setRescheduleId(null)
                        setRescheduleAt('')
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
