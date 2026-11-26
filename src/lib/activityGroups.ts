/** Groups activity entries by Vietnam calendar day, newest first, for the activity log. */
const DAY_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY_LABEL = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })
const DAY_MS = 86_400_000

const dayKey = (date: Date) => DAY_KEY.format(date)

export function activityDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const key = dayKey(date)
  if (key === dayKey(now)) return 'Hôm nay'
  if (key === dayKey(new Date(now.getTime() - DAY_MS))) return 'Hôm qua'
  return DAY_LABEL.format(date)
}

export function groupActivitiesByDay<T extends { occurredAt: string }>(items: readonly T[], now: Date = new Date()) {
  const groups: { key: string; label: string; items: T[] }[] = []
  for (const item of items) {
    const key = dayKey(new Date(item.occurredAt))
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: activityDayLabel(item.occurredAt, now), items: [item] })
  }
  return groups
}
