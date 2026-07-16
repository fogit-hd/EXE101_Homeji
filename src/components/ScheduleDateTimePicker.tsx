import { useEffect, useId, useRef, useState } from 'react'
import {
  VI_MONTHS,
  VI_WEEKDAYS,
  addMonths,
  buildCalendarDays,
  formatScheduleDisplay,
  isSameDay,
  parseLocalInputValue,
  roundUpToInterval,
  toLocalInputValue,
} from '../lib/scheduleDateTime'
import './ScheduleDateTimePicker.css'

type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  id?: string
}

const MINUTE_OPTIONS = [0, 15, 30, 45] as const
type MinuteOption = (typeof MINUTE_OPTIONS)[number]

function nearestMinute(m: number): MinuteOption {
  return MINUTE_OPTIONS.reduce((prev, cur) =>
    Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev,
  )
}

export function ScheduleDateTimePicker({
  value,
  onChange,
  label,
  className = '',
  inputClassName = 'form-input',
  disabled = false,
  id: idProp,
}: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selected = parseLocalInputValue(value)
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date())
  const [draftDate, setDraftDate] = useState<Date>(() => selected ?? new Date())
  const [hour, setHour] = useState(() => selected?.getHours() ?? 9)
  const [minute, setMinute] = useState<MinuteOption>(() => nearestMinute(selected?.getMinutes() ?? 0))

  useEffect(() => {
    if (!open) return
    const parsed = parseLocalInputValue(value)
    const base = parsed ?? new Date()
    setViewMonth(base)
    setDraftDate(base)
    setHour(parsed?.getHours() ?? 9)
    setMinute(nearestMinute(parsed?.getMinutes() ?? 0))
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const commit = (date: Date, h: number, m: number) => {
    const next = new Date(date)
    next.setHours(h, m, 0, 0)
    onChange(toLocalInputValue(next))
  }

  const applyDraft = () => {
    commit(draftDate, hour, minute)
    setOpen(false)
  }

  const setToday = () => {
    const today = new Date()
    setDraftDate(today)
    setViewMonth(today)
  }

  const setNow = () => {
    const now = roundUpToInterval(new Date(), 15)
    setDraftDate(now)
    setViewMonth(now)
    setHour(now.getHours())
    setMinute(nearestMinute(now.getMinutes()))
    commit(now, now.getHours(), now.getMinutes())
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setOpen(false)
  }

  const calendarDays = buildCalendarDays(viewMonth)
  const today = new Date()
  const preview = new Date(draftDate)
  preview.setHours(hour, minute, 0, 0)

  return (
    <div
      ref={rootRef}
      className={`schedule-dt${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      {label ? (
        <label className="schedule-dt__label" htmlFor={id}>
          {label}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        className={`schedule-dt__trigger ${inputClassName}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="schedule-dt__trigger-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className={value ? 'schedule-dt__trigger-value' : 'schedule-dt__trigger-placeholder'}>
          {formatScheduleDisplay(value)}
        </span>
      </button>

      {open ? (
        <div className="schedule-dt__panel" role="dialog" aria-label="Chọn thời gian">
          <div className="schedule-dt__top">
            <div className="schedule-dt__cal-head">
              <button
                type="button"
                className="schedule-dt__nav"
                aria-label="Tháng trước"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                ‹
              </button>
              <span className="schedule-dt__month">
                {VI_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button
                type="button"
                className="schedule-dt__nav"
                aria-label="Tháng sau"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                ›
              </button>
            </div>
            <p className="schedule-dt__preview">{formatScheduleDisplay(toLocalInputValue(preview))}</p>
          </div>

          <div className="schedule-dt__calendar">
            <div className="schedule-dt__weekdays">
              {VI_WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="schedule-dt__grid">
              {calendarDays.map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth()
                const isSelected = isSameDay(day, draftDate)
                const isToday = isSameDay(day, today)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={[
                      'schedule-dt__day',
                      !inMonth ? 'is-outside' : '',
                      isSelected ? 'is-selected' : '',
                      isToday ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setDraftDate(day)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="schedule-dt__footer">
            <div className="schedule-dt__time-fields">
              <select
                className="schedule-dt__select"
                value={hour}
                aria-label="Giờ"
                onChange={(e) => setHour(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="schedule-dt__time-sep">:</span>
              <select
                className="schedule-dt__select"
                value={minute}
                aria-label="Phút"
                onChange={(e) => setMinute(Number(e.target.value) as MinuteOption)}
              >
                {MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div className="schedule-dt__quick">
              <button type="button" className="schedule-dt__quick-btn" onClick={clear}>
                Xóa
              </button>
              <button type="button" className="schedule-dt__quick-btn" onClick={setToday}>
                Hôm nay
              </button>
              <button type="button" className="schedule-dt__quick-btn is-accent" onClick={setNow}>
                Bây giờ
              </button>
            </div>

            <button type="button" className="schedule-dt__confirm map-motion-press" onClick={applyDraft}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
