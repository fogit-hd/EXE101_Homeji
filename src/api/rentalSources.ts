import { apiRequest } from './client'

export interface RentalSourceListing {
  id: string; source: string; sourceId: string; sourceUrl: string; title: string
  address: string; district: string; price: number; area: number
  imageUrls: string[]; sourceUpdatedAt: string | null; collectedAt: string
  sourceExpiresAt?: string | null; sourceCheckedAt?: string | null
}

export function searchRentalSources({ keyword, district, page, pageSize = 10 }: { keyword: string; district: string; page: number; pageSize?: number }, signal?: AbortSignal) {
  return apiRequest<RentalSourceListing[]>('/api/rental-source-listings', {
    auth: false, signal, params: { keyword: keyword.trim().slice(0, 200) || undefined, district: district || undefined, page, pageSize },
  })
}

export function rentalSourceImageHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password
      && ['cloud.mogi.vn', 'pt123.cdn.static123.com'].includes(url.hostname) ? url.href : null
  } catch { return null }
}

export const rentalSourceLabel = (source: string) => ({ mogi: 'Mogi', phongtro123: 'Phongtro123', muaban: 'Muaban.net' }[source] ?? 'Nguồn công khai')

export function rentalSourceHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password ||
      !['phongtro123.com', 'www.phongtro123.com', 'muaban.net', 'www.muaban.net', 'mogi.vn', 'www.mogi.vn'].includes(url.hostname)) return null
    return url.href
  } catch { return null }
}
