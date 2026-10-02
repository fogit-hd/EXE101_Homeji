import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ContentSkeleton } from '../ContentSkeleton'
import { viewingAppointmentStatusLabel } from '../../lib/labels'
import { isoToLocalInputValue } from '../../lib/scheduleDateTime'
import './MapAppointmentsPanel.css'

type Props = {
  embedded?: boolean
}

type ViewMode = 'timeline' | 'list'

const CHECKLIST = [
  { id: 'fee', label: 'Kiểm tra phí phát sinh', done: true },
  { id: 'light', label: 'Chụp hướng nắng và cửa sổ', done: false },
  { id: 'park', label: 'Xác nhận chỗ để xe', done: false },
] as const

const STATUS_FIGMA: Record<number, { label: string; tone: string }> = {
  [ViewingAppointmentStatus.Confirmed]: { label: 'ĐÃ XÁC NHẬN', tone: 'confirmed' },
  [ViewingAppointmentStatus.Pending]: { label: 'CHỜ PHẢN HỒI', tone: 'pending' },
  [ViewingAppointmentStatus.Completed]: { label: 'ĐÃ XEM', tone: 'done' },
  [ViewingAppointmentStatus.Rejected]: { label: 'TỪ CHỐI', tone: 'muted' },
  [ViewingAppointmentStatus.Cancelled]: { label: 'ĐÃ HỦY', tone: 'muted' },
}

function monthTitle(d: Date) {
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

function monthEyebrow(d: Date) {
  return d
    .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

function dayHeading(d: Date) {
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7 // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push({
      date: new Date(year, month - 1, prevDays - startPad + i + 1),
      inMonth: false,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const next = cells.length - startPad - daysInMonth + 1
    cells.push({ date: new Date(year, month + 1, next), inMonth: false })
  }
  return cells
}

export function MapAppointmentsPanel({ embedded = false }: Props) {
  const { profile } = useAuth()
  const myId = profile?.id ?? null
  const displayName = profile?.displayName?.trim()?.split(/\s+/).pop() || 'bạn'
  const [items, setItems] = useState<ViewingAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHECKLIST.map((c) => [c.id, c.done])),
  )

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

  const monthItems = useMemo(() => {
    return items.filter((i) => {
      const d = new Date(i.scheduledAt)
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()
    })
  }, [items, cursor])

  const daysWithAppt = useMemo(() => {
    const set = new Set<string>()
    for (const i of monthItems) {
      const d = new Date(i.scheduledAt)
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    }
    return set
  }, [monthItems])

  const dayItems = useMemo(() => {
    return items
      .filter((i) => sameDay(new Date(i.scheduledAt), selectedDay))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [items, selectedDay])

  const listItems = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
  }, [items])

  const displayItems = viewMode === 'timeline' ? dayItems : listItems

  const upcomingCount = items.filter(
    (i) =>
      i.status === ViewingAppointmentStatus.Pending ||
      i.status === ViewingAppointmentStatus.Confirmed,
  ).length
  const pendingCount = items.filter((i) => i.status === ViewingAppointmentStatus.Pending).length
  const confirmedMonth = monthItems.filter(
    (i) => i.status === ViewingAppointmentStatus.Confirmed,
  ).length
  const pendingMonth = monthItems.filter(
    (i) => i.status === ViewingAppointmentStatus.Pending,
  ).length
  const doneMonth = monthItems.filter(
    (i) => i.status === ViewingAppointmentStatus.Completed,
  ).length

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor])
  const today = new Date()

  const renderCard = (item: ViewingAppointment, i: number) => {
    const isOwner = Boolean(myId && item.ownerId === myId)
    const isRequester = Boolean(myId && item.requesterId === myId)
    const pending = item.status === ViewingAppointmentStatus.Pending
    const confirmed = item.status === ViewingAppointmentStatus.Confirmed
    const statusMeta =
      STATUS_FIGMA[item.status] ?? {
        label: viewingAppointmentStatusLabel[item.status] ?? '—',
        tone: 'muted',
      }
    const thumbSrc = i % 2 === 0 ? '/figma/images/room-1.jpg' : '/figma/images/room-2.jpg'

    return (
      <li
        key={item.id}
        className={`map-appointments__tl-item${confirmed ? ' is-confirmed' : ''}`}
        style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
      >
        <time className="map-appointments__tl-time" dateTime={item.scheduledAt}>
          {timeLabel(item.scheduledAt)}
        </time>
        <article className="map-appointments__tl-card">
          <img
            className="map-appointments__tl-thumb"
            src={thumbSrc}
            alt=""
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
              el.parentElement?.classList.add('no-thumb')
            }}
          />
          <div className="map-appointments__tl-body">
            <div className="map-appointments__tl-top">
              <span className={`map-appointments__pill map-appointments__pill--${statusMeta.tone}`}>
                {statusMeta.label}
              </span>
            </div>
            <h3 className="map-appointments__tl-title">{item.rentalPostTitle}</h3>
            {item.note ? <p className="map-appointments__tl-note">{item.note}</p> : null}
            <p className="map-appointments__tl-meta">
              {isOwner ? 'Bạn là chủ nhà' : isRequester ? 'Bạn đã đặt lịch' : 'Lịch hẹn'}
            </p>
            <div className="map-appointments__tl-links">
              <a href={`/?section=listings&post=${item.rentalPostId}`}>Xem chi tiết</a>
              <a href="/?section=messages">Nhắn chủ nhà</a>
            </div>

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
          </div>
        </article>
      </li>
    )
  }

  return (
    <div className={`map-appointments${embedded ? ' is-embedded' : ''}`}>
      <header className="map-appointments__page-head">
        <div className="map-appointments__page-copy">
          <span className="map-appointments__eyebrow">{monthEyebrow(selectedDay)}</span>
          <h1 className="map-appointments__page-title">Lịch xem phòng của {displayName}</h1>
          <p className="map-appointments__page-lead">
            {upcomingCount} lịch sắp tới
            {pendingCount > 0 ? ` · ${pendingCount} lịch đang chờ chủ nhà xác nhận.` : '.'}
          </p>
        </div>
        <div className="map-appointments__page-tools">
          <a href="/?section=listings" className="map-appointments__add-btn">
            + Thêm lịch xem
          </a>
          <div className="map-appointments__view-toggle" role="group" aria-label="Chế độ xem">
            <button
              type="button"
              className={viewMode === 'timeline' ? 'is-active' : ''}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : ''}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </button>
          </div>
        </div>
      </header>

      {error ? <p className="map-appointments__error map-motion-fade">{error}</p> : null}

      <div className="map-appointments__layout">
        <aside className="map-appointments__rail" aria-label="Lịch tháng">
          <div className="map-appointments__cal">
            <div className="map-appointments__cal-nav">
              <button
                type="button"
                aria-label="Tháng trước"
                onClick={() =>
                  setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
                }
              >
                ‹
              </button>
              <strong>{monthTitle(cursor)}</strong>
              <button
                type="button"
                aria-label="Tháng sau"
                onClick={() =>
                  setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
                }
              >
                ›
              </button>
            </div>
            <div className="map-appointments__cal-weekdays" aria-hidden>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="map-appointments__cal-grid">
              {grid.map(({ date, inMonth }) => {
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
                const selected = sameDay(date, selectedDay)
                const isToday = sameDay(date, today)
                const hasAppt = daysWithAppt.has(key)
                return (
                  <button
                    key={key + String(inMonth)}
                    type="button"
                    className={[
                      'map-appointments__cal-day',
                      inMonth ? '' : 'is-out',
                      selected ? 'is-selected' : '',
                      isToday && !selected ? 'is-today' : '',
                      hasAppt ? 'has-appt' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setSelectedDay(date)
                      if (!inMonth) {
                        setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
                      }
                      setViewMode('timeline')
                    }}
                  >
                    {String(date.getDate()).padStart(2, '0')}
                  </button>
                )
              })}
            </div>

            <div className="map-appointments__month-sum">
              <div className="map-appointments__month-sum-head">
                <span>Tóm tắt tháng</span>
                <em>{monthItems.length} lịch</em>
              </div>
              <div className="map-appointments__month-chips">
                <span className="is-ok">{confirmedMonth} xác nhận</span>
                <span className="is-wait">{pendingMonth} chờ</span>
                <span className="is-done">{doneMonth} đã xem</span>
              </div>
            </div>
          </div>

          <div className="map-appointments__prep">
            <div className="map-appointments__prep-head">
              <h2>Chuẩn bị trước khi đi</h2>
            </div>
            <ul className="map-appointments__prep-list">
              {CHECKLIST.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!checks[c.id]}
                      onChange={() =>
                        setChecks((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                      }
                    />
                    <span>{c.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="map-appointments__main" aria-label="Lịch xem">
          <div className="map-appointments__day-head">
            <h2>{viewMode === 'timeline' ? dayHeading(selectedDay) : 'Tất cả lịch hẹn'}</h2>
            <span>
              {displayItems.length} lịch xem
            </span>
          </div>

          {loading ? <ContentSkeleton compact count={3} label="Đang tải lịch hẹn…" /> : null}

          {!loading && displayItems.length === 0 ? (
            <div className="map-appointments__empty-state">
              <p>
                {viewMode === 'timeline'
                  ? 'Không có lịch xem trong ngày này. Chọn ngày khác trên lịch hoặc đặt lịch từ tin phòng.'
                  : 'Chưa có lịch xem phòng nào. Hãy đặt lịch từ tin phòng bạn quan tâm.'}
              </p>
            </div>
          ) : null}

          {!loading && displayItems.length > 0 ? (
            <ul className={`map-appointments__timeline${viewMode === 'list' ? ' is-list' : ''}`}>
              {displayItems.map((item, i) => renderCard(item, i))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  )
}
