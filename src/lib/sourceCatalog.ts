import { isInHomejiServiceArea } from './homejiServiceArea'

export type SourceCatalogPin = {
  id: string; kind: 'rental' | 'food'; title: string; address: string; lat: number; lng: number
  sourceUrl: string; imageUrl: string | null; price: number | null; area: number | null
  depositLabel: string | null; amenityHighlights: string[]; sourceUpdatedAt: string | null; publisherName: string | null
}

export function safeCatalogSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const url = new URL(raw)
    const allowed = ['muaban.net', 'www.muaban.net', 'phongtro123.com', 'www.phongtro123.com', 'mogi.vn', 'www.mogi.vn', 'phongtro.vn', 'www.phongtro.vn', 'www.nhatot.com', 'shopeefood.vn', 'vinwonders.com', 'www.tiemcomvien.com', 'www.google.com']
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.includes(url.hostname)) return null
    if (url.hostname === 'www.google.com' && !url.pathname.startsWith('/maps/')) return null
    return url.href
  } catch { return null }
}

export function readSourceCatalogPins(rows: unknown, kind: SourceCatalogPin['kind'], now = Date.now()): SourceCatalogPin[] {
  if (!Array.isArray(rows)) return []
  return (kind === 'food' ? rows.slice(0, 1000) : rows).flatMap(row => {
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
      const trusted = ['pt123.cdn.static123.com', 'cloud.mogi.vn', 'file.phongtro.vn'].includes(image.hostname) || image.hostname === 'res.cloudinary.com' && image.pathname.startsWith('/dv4y7cdpi/image/upload/')
      if (image.protocol === 'https:' && trusted && !image.username && !image.password && !image.port) imageUrl = image.href
    } catch { /* A sourced place can legitimately have no photograph. */ }
    const area = kind === 'rental' && typeof row.area === 'number' && Number.isFinite(row.area) && row.area > 0 ? row.area : null
    const depositLabel = kind === 'rental' && typeof row.depositLabel === 'string' && row.depositLabel.trim() ? row.depositLabel.trim().slice(0, 60) : null
    const amenityHighlights = kind === 'rental' && Array.isArray(row.amenityHighlights)
      ? (row.amenityHighlights as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 4).map(value => value.trim().slice(0, 48))
      : []
    const sourceUpdatedAt = typeof row.sourceUpdatedAt === 'string' && Number.isFinite(Date.parse(row.sourceUpdatedAt)) ? row.sourceUpdatedAt : null
    return [{ id: `${kind}:${row.id}`, kind, title: title.slice(0, 200), address: row.address.slice(0, 500), lat, lng, sourceUrl, imageUrl, price: kind === 'rental' && typeof row.price === 'number' && row.price > 0 ? row.price : null,
      area, depositLabel, amenityHighlights, sourceUpdatedAt,
      publisherName: typeof row.publisherName === 'string' && row.publisherName.trim() ? row.publisherName.trim().slice(0, 100) : null }]
  })
}
