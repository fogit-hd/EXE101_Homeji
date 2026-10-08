import { apiRequest } from './client'

export interface RentalSourceListing {
  id: string; source: string; sourceId: string; sourceUrl: string; title: string
  address: string; district: string; price: number; area: number
  imageUrls: string[]; sourceUpdatedAt: string | null; collectedAt: string
  sourceExpiresAt?: string | null; sourceCheckedAt?: string | null
}

export function searchRentalSources({ keyword, district, page }: { keyword: string; district: string; page: number }) {
  return apiRequest<RentalSourceListing[]>('/api/rental-source-listings', {
    auth: false, params: { keyword: keyword.trim().slice(0, 200) || undefined, district: district || undefined, page, pageSize: 10 },
  })
}

export function rentalSourceHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password ||
      !['phongtro123.com', 'www.phongtro123.com', 'muaban.net', 'www.muaban.net'].includes(url.hostname)) return null
    return url.href
  } catch { return null }
}
