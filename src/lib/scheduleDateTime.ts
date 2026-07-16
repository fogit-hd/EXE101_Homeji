const pad = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DDTHH:mm` in local timezone */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseLocalInputValue(value: string): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, mo, d, h, mi] = match.map(Number)
  const date = new Date(y, mo - 1, d, h, mi, 0, 0)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d ||
    date.getHours() !== h ||
    date.getMinutes() !== mi
  ) {
    return null
  }
  return date
}

/** ISO string → local `YYYY-MM-DDTHH:mm` */
export function isoToLocalInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return toLocalInputValue(date)
}

/** Display: `17/07/2026, 13:15` */
export function formatScheduleDisplay(value: string): string {
  const date = parseLocalInputValue(value)
  if (!date) return 'Chọn ngày và giờ'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function roundUpToInterval(date: Date, intervalMinutes: number): Date {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const remainder = next.getMinutes() % intervalMinutes
  if (remainder !== 0 || date.getSeconds() > 0 || date.getMilliseconds() > 0) {
    next.setMinutes(next.getMinutes() + (intervalMinutes - remainder))
  }
  return next
}

export const VI_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const

export const VI_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
] as const

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function buildCalendarDays(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth)
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    return day
  })
}
