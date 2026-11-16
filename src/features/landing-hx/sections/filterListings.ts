import { DISTRICT_OPTIONS, type Listing } from '../../../lib/mock/homeji'
import type { ListingQuery } from './SearchBar'

function inPriceRange(price: number, range: string) {
  if (!range) return true
  const [min, max] = range.split('-').map(part => (part ? Number(part) : undefined))
  return (min === undefined || price >= min) && (max === undefined || price < max)
}

export function filterListings(listings: Listing[], query: ListingQuery) {
  const district = DISTRICT_OPTIONS.find(option => option.value === query.district)
  return listings.filter(listing =>
    (query.kind === 'all' || listing.kind === query.kind)
    && (!query.district || listing.district === district?.label)
    && inPriceRange(listing.price, query.price),
  )
}
