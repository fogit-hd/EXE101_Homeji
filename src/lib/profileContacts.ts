export function facebookContactHref(value: string | null | undefined): string | null {
  if (!value || value.length > 500) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)
      && !['/', '/l.php'].includes(url.pathname) && !url.pathname.toLowerCase().startsWith('/flx/') ? url.href : null
  } catch { return null }
}
export function normalizeZaloPhone(value: string): string {
  const digits = value.trim().replace(/[\s().-]/g, '').replace(/^\+84/, '0')
  return /^0[35789][0-9]{8}$/.test(digits) ? digits : ''
}
export function memberTenure(createdAt: string, now = Date.now()): string {
  const timestamp = Date.parse(createdAt)
  if (!Number.isFinite(timestamp) || timestamp > now) return 'Chưa có ngày tham gia'
  const joined = new Date(timestamp + 7 * 3600_000), today = new Date(now + 7 * 3600_000)
  const months = Math.max(0, (today.getUTCFullYear() - joined.getUTCFullYear()) * 12 + today.getUTCMonth() - joined.getUTCMonth() - Number(today.getUTCDate() < joined.getUTCDate()))
  const years = Math.floor(months / 12), remainder = months % 12
  if (years) return `Đã tham gia ${years} năm${remainder ? ` ${remainder} tháng` : ''}`
  if (months) return `Đã tham gia ${months} tháng`
  const days = Math.floor((now - timestamp) / 86400_000)
  return days ? `Đã tham gia ${days} ngày` : 'Vừa tham gia Homeji'
}
