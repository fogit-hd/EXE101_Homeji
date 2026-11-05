import { apiRequest } from './client'
export { sourceRoomHref } from '../lib/sourceRoomLink'

export interface RentalSourceListing {
  id: string; source: string; sourceId: string; sourceUrl: string; title: string
  address: string; district: string; price: number; area: number
  imageUrls: string[]; sourceUpdatedAt: string | null; collectedAt: string
  sourceExpiresAt?: string | null; sourceCheckedAt?: string | null
  publisherName?: string | null; latitude?: number | null; longitude?: number | null
  description?: string | null; contactPhone?: string | null; detailsCollectedAt?: string | null
  depositLabel?: string | null; amenityHighlights?: string[]
}

export const getRentalSource = (id: string, signal?: AbortSignal) => apiRequest<RentalSourceListing>(`/api/rental-source-listings/${encodeURIComponent(id)}`, { auth: false, signal })
export const getRentalSourceContact = (id: string, signal?: AbortSignal) =>
  apiRequest<{ phone: string | null; phones?: string[] }>(`/api/rental-source-listings/${encodeURIComponent(id)}/contact`, { signal })

let catalog: { rows: RentalSourceListing[]; at: number } | null = null
let catalogRequest: Promise<RentalSourceListing[]> | null = null

/** Public inventory shared by the map and list. Read every page before claiming a complete count. */
export function getRentalSourceCatalog(): Promise<RentalSourceListing[]> {
  if (catalog && Date.now() - catalog.at < 60_000) return Promise.resolve(catalog.rows)
  if (catalogRequest) return catalogRequest
  catalogRequest = (async () => {
    const rows = new Map<string, RentalSourceListing>()
    for (let page = 1; page <= 20; page++) {
      const chunk = await searchRentalSources({ keyword: '', district: '', page, pageSize: 50 })
      for (const row of chunk) rows.set(row.id, row)
      if (chunk.length < 50) { const result = [...rows.values()]; catalog = { rows: result, at: Date.now() }; return result }
    }
    throw new Error('Danh sách vượt quá giới hạn tải bản đồ. Cần chia nhỏ khu vực để tải đủ tin.')
  })().finally(() => { catalogRequest = null })
  return catalogRequest
}

export function searchRentalSources({ keyword, district, page, pageSize = 10, propertyCategory }: { keyword: string; district: string; page: number; pageSize?: number; propertyCategory?: 'room' | 'apartment' }, signal?: AbortSignal) {
  return apiRequest<RentalSourceListing[]>('/api/rental-source-listings', {
    auth: false, signal, params: { keyword: keyword.trim().slice(0, 200) || undefined, district: district || undefined, page, pageSize, propertyCategory },
  })
}

export function rentalSourceImageHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && (['cloud.mogi.vn', 'pt123.cdn.static123.com', 'file.phongtro.vn'].includes(url.hostname)
        || url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/dv4y7cdpi/image/upload/')) ? url.href : null
  } catch { return null }
}

export { rentalSourcePublisher } from '../lib/rentalSourcePublisher'

export const rentalSourceLabel = (source: string) => ({ mogi: 'Mogi', phongtro123: 'Phongtro123', muaban: 'Muaban.net', phongtrovn: 'Phongtro.vn' }[source] ?? 'Nguồn công khai')

export function rentalSourceHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['phongtro123.com', 'www.phongtro123.com', 'muaban.net', 'www.muaban.net', 'mogi.vn', 'www.mogi.vn', 'phongtro.vn', 'www.phongtro.vn'].includes(url.hostname)) return null
    return url.href
  } catch { return null }
}
