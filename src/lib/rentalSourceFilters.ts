import type { RentalSourceListing } from '../api/rentalSources'
import type { ListingQuery } from '../components/map/listings/listingAdapters'
import { isInHomejiServiceArea } from './homejiServiceArea'
import { matchesRentalPropertyCategory } from './rentalPropertyCategory'

const text = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').trim()
export const sourceHasLocation = (row: RentalSourceListing) => typeof row.latitude === 'number' && typeof row.longitude === 'number' && isInHomejiServiceArea(row.latitude, row.longitude)
export const sourceHasUnsupportedFilters = (query: ListingQuery) => Boolean(query.amenities.length || query.excludedAmenities?.length || query.minAvailableSlots || query.excludeRoommateShare || query.ids?.length)

function filter(rows: RentalSourceListing[], query: ListingQuery, now: number, respectMapBounds: boolean): RentalSourceListing[] {
  if (query.catalog === 'market' || sourceHasUnsupportedFilters(query)) return []
  const keyword = text(query.keyword)
  const category = query.catalog === 'apartments' ? 'apartments' : 'rooms'
  return rows.filter(row => {
    if (!matchesRentalPropertyCategory(category, row.title)) return false
    if (row.sourceExpiresAt && (!Number.isFinite(Date.parse(row.sourceExpiresAt)) || Date.parse(row.sourceExpiresAt) <= now)) return false
    if (query.minPrice !== undefined && row.price < query.minPrice || query.maxPrice !== undefined && row.price > query.maxPrice
        || query.minArea !== undefined && row.area < query.minArea || query.maxArea !== undefined && row.area > query.maxArea) return false
    if (keyword && !text(`${row.title} ${row.address}`).includes(keyword)) return false
    if (respectMapBounds && query.bounds && sourceHasLocation(row)) {
      const bounds = query.bounds
      if (row.latitude! < bounds.minLatitude || row.latitude! > bounds.maxLatitude || row.longitude! < bounds.minLongitude || row.longitude! > bounds.maxLongitude) return false
    }
    return true
  })
}

export function filterRentalSources(rows: RentalSourceListing[], query: ListingQuery, now = Date.now()): RentalSourceListing[] {
  return filter(rows, query, now, true)
}

export function filterRentalSourcesForList(rows: RentalSourceListing[], query: ListingQuery, now = Date.now()): RentalSourceListing[] {
  return filter(rows, query, now, false)
}
