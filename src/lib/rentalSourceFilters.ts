import type { RentalSourceListing } from '../api/rentalSources'
import type { ListingQuery } from '../components/map/listings/listingAdapters'
import { isInHomejiServiceArea } from './homejiServiceArea'

const text = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').trim()
export const sourceHasLocation = (row: RentalSourceListing) => typeof row.latitude === 'number' && typeof row.longitude === 'number' && isInHomejiServiceArea(row.latitude, row.longitude)
export const sourceHasUnsupportedFilters = (query: ListingQuery) => Boolean(query.amenities.length || query.excludedAmenities?.length || query.minAvailableSlots || query.excludeRoommateShare || query.ids?.length)

export function filterRentalSources(rows: RentalSourceListing[], query: ListingQuery, now = Date.now()): RentalSourceListing[] {
  if (query.catalog !== 'rooms' || sourceHasUnsupportedFilters(query)) return []
  const keyword = text(query.keyword)
  return rows.filter(row => {
    if (row.sourceExpiresAt && (!Number.isFinite(Date.parse(row.sourceExpiresAt)) || Date.parse(row.sourceExpiresAt) <= now)) return false
    if (query.minPrice !== undefined && row.price < query.minPrice || query.maxPrice !== undefined && row.price > query.maxPrice
        || query.minArea !== undefined && row.area < query.minArea || query.maxArea !== undefined && row.area > query.maxArea) return false
    if (keyword && !text(`${row.title} ${row.address}`).includes(keyword)) return false
    if (query.bounds && sourceHasLocation(row)) {
      const bounds = query.bounds
      if (row.latitude! < bounds.minLatitude || row.latitude! > bounds.maxLatitude || row.longitude! < bounds.minLongitude || row.longitude! > bounds.maxLongitude) return false
    }
    return true
  })
}
