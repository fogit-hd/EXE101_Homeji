import type { ListingQuery } from './listingAdapters'

export function countActiveListingFilters(query: ListingQuery): number {
  return Number(query.minPrice != null || query.maxPrice != null)
    + Number(query.minArea != null || query.maxArea != null)
    + new Set(query.amenities).size + new Set(query.excludedAmenities ?? []).size
    + Number(Boolean(query.excludeRoommateShare)) + Number(query.minAvailableSlots != null)
    + Number(Boolean(query.keyword.trim())) + Number(Boolean(query.ids?.length))
    + Number(query.catalog !== 'rooms') + Number(Boolean(query.placeId || (query.searchOnMove && query.bounds)))
}

/** Imported counts already exclude IDs in the native inventory. */
export function listingResultCount(nativeCount: number, sourceCount: number | null, marketMode: boolean): number {
  return nativeCount + (marketMode ? 0 : sourceCount ?? 0)
}
