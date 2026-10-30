import { isInHomejiServiceArea } from './homejiServiceArea'

export type SourceCatalogPin = { id: string; kind: 'rental' | 'food'; title: string; address: string; lat: number; lng: number; sourceUrl: string; imageUrl: string | null; price: number | null }

export function safeCatalogSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const url = new URL(raw)
    const allowed = ['phongtro123.com', 'mogi.vn', 'www.nhatot.com', 'shopeefood.vn', 'vinwonders.com', 'www.tiemcomvien.com', 'www.google.com']
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.includes(url.hostname)) return null
    if (url.hostname === 'www.google.com' && !url.pathname.startsWith('/maps/')) return null
    return url.href
  } catch { return null }
}

export function readSourceCatalogPins(rows: unknown, kind: SourceCatalogPin['kind'], now = Date.now()): SourceCatalogPin[] {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, 50).flatMap(row => {
    if (!row || typeof row !== 'object') return []
    const { latitude: lat, longitude: lng } = row
    const title = kind === 'food' ? row.name : row.title
    const sourceUrl = safeCatalogSource(row.sourceUrl)
    if (typeof row.id !== 'string' || typeof title !== 'string' || !title.trim() || typeof row.address !== 'string' || !sourceUrl ||
        typeof lat !== 'number' || typeof lng !== 'number' || !isInHomejiServiceArea(lat, lng)) return []
    if (kind === 'rental' && row.sourceExpiresAt && (!Number.isFinite(Date.parse(row.sourceExpiresAt)) || Date.parse(row.sourceExpiresAt) <= now)) return []
    let imageUrl: string | null = null
    try {
      const image = new URL(row.imageUrls?.[0])
      if (image.protocol === 'https:' && ['pt123.cdn.static123.com', 'cloud.mogi.vn'].includes(image.hostname) && !image.username && !image.password && !image.port) imageUrl = image.href
    } catch { /* A sourced place can legitimately have no photograph. */ }
    return [{ id: `${kind}:${row.id}`, kind, title: title.slice(0, 200), address: row.address.slice(0, 500), lat, lng, sourceUrl, imageUrl, price: kind === 'rental' && typeof row.price === 'number' && row.price > 0 ? row.price : null }]
  })
}
