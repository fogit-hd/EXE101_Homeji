import type { RentalPostSummary } from '../../../api'
import type { RentalSourceListing } from '../../../api/rentalSources'
import { rentalSourceImageHref } from '../../../api/rentalSources'
import { sourcePublisherLink } from '../../../lib/sourcePublisherLinks'

export type NearbyListingKind = 'homeji' | 'source'

export type NearbyListingItem = {
  id: string
  kind: NearbyListingKind
  title: string
  price: number
  area: number
  address: string
  lat: number
  lng: number
  distanceKm: number
  thumbnailUrl: string | null
  isOwnerVerified: boolean
  updatedAt: string | null
  post?: RentalPostSummary
  source?: RentalSourceListing
}

const EARTH_KM = 6371

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function readCoords(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

function fromHomejiPost(
  post: RentalPostSummary,
  center: { lat: number; lng: number },
): NearbyListingItem | null {
  if (post.isSynthetic === true) return null
  const coords = readCoords(post.latitude, post.longitude)
  if (!coords) return null
  return {
    id: post.id,
    kind: 'homeji',
    title: post.title,
    price: post.price,
    area: post.area,
    address: post.address,
    lat: coords.lat,
    lng: coords.lng,
    distanceKm: haversineKm(center, coords),
    thumbnailUrl: post.thumbnailPath,
    isOwnerVerified: post.isOwnerVerified === true,
    updatedAt: post.updatedAt ?? null,
    post,
  }
}

function fromSourceListing(
  source: RentalSourceListing,
  center: { lat: number; lng: number },
  nativeIds: Set<string>,
): NearbyListingItem | null {
  const coords = readCoords(source.latitude, source.longitude)
  if (!coords) return null
  const nativeId = sourcePublisherLink(source.id)?.nativePostId
  if (nativeIds.has(source.id) || (nativeId && nativeIds.has(nativeId))) return null
  const image = source.imageUrls?.map(rentalSourceImageHref).find(Boolean) ?? null
  return {
    id: source.id,
    kind: 'source',
    title: source.title,
    price: source.price,
    area: source.area,
    address: source.address,
    lat: coords.lat,
    lng: coords.lng,
    distanceKm: haversineKm(center, coords),
    thumbnailUrl: image,
    isOwnerVerified: false,
    updatedAt: source.sourceUpdatedAt ?? source.collectedAt ?? null,
    source,
  }
}

/** Gộp tin Homeji + tin nguồn, bỏ thiếu tọa độ / synthetic, loại trùng, sắp theo khoảng cách. */
export function mergeNearby(
  posts: RentalPostSummary[],
  sources: RentalSourceListing[],
  center: { lat: number; lng: number },
  radiusKm: number,
): NearbyListingItem[] {
  const nativeIds = new Set(posts.filter(post => post.isSynthetic !== true).map(post => post.id))
  const items: NearbyListingItem[] = []

  for (const post of posts) {
    const item = fromHomejiPost(post, center)
    if (!item || item.distanceKm > radiusKm) continue
    items.push(item)
  }

  for (const source of sources) {
    const item = fromSourceListing(source, center, nativeIds)
    if (!item || item.distanceKm > radiusKm) continue
    items.push(item)
  }

  items.sort((a, b) => a.distanceKm - b.distanceKm || a.title.localeCompare(b.title, 'vi'))
  return items
}

/** Sắp tin quanh khu mặc định theo mới nhất (không lọc bán kính chặt). */
export function mergeNewest(
  posts: RentalPostSummary[],
  sources: RentalSourceListing[],
  center: { lat: number; lng: number },
): NearbyListingItem[] {
  const nativeIds = new Set(posts.filter(post => post.isSynthetic !== true).map(post => post.id))
  const items: NearbyListingItem[] = []

  for (const post of posts) {
    const item = fromHomejiPost(post, center)
    if (item) items.push(item)
  }

  for (const source of sources) {
    const item = fromSourceListing(source, center, nativeIds)
    if (item) items.push(item)
  }

  items.sort((a, b) => {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0
    return tb - ta || a.distanceKm - b.distanceKm
  })
  return items
}

/**
 * Round first, then pick unit.
 * 0.65 → "cách 650 m"; 0.9996 → "cách 1 km"; 1.2 → "cách 1,2 km"
 */
export function formatDistanceVi(km: number): string {
  if (!Number.isFinite(km) || km < 0) return 'cách —'
  const meters = Math.round(km * 1000)
  if (meters < 1000) return `cách ${meters.toLocaleString('vi-VN')} m`
  const roundedKm = Math.round(meters / 100) / 10
  const label = Number.isInteger(roundedKm)
    ? String(roundedKm)
    : roundedKm.toFixed(1).replace('.', ',')
  return `cách ${label} km`
}
