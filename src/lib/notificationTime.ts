export function relativeTime(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const min = Math.max(0, Math.round((now - t) / 60000))
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} giờ`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Hôm qua'
  if (d < 7) return `${d} ngày`
  return new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
