import { DISTRICT_OPTIONS, type Listing } from '../../../lib/mock/homeji'
import type { ListingQuery } from './SearchBar'

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

function inPriceRange(price: number, range: string) {
  if (!range) return true
  if (price <= 0) return false
  const [min, max] = range.split('-').map(part => (part ? Number(part) : undefined))
  return (min === undefined || price >= min) && (max === undefined || price < max)
}

function matchesDistrict(listing: Listing, districtValue: string): boolean {
  if (!districtValue) return true
  if (districtValue === 'thu-duc') {
    if (listing.district === 'TP. Thủ Đức' || listing.district === 'Quận 9 (cũ)') return true
    const text = normalizeText(`${listing.district} ${listing.address}`)
    return /thu\s*duc|\b(quan\s*9|q\.?\s*9)\b/.test(text)
  }
  const district = DISTRICT_OPTIONS.find(option => option.value === districtValue)
  if (district && listing.district === district.label) return true
  if (!district) return false
  const needle = normalizeText(district.label.replace(/\s*\(cũ\)\s*/i, ''))
  const haystack = normalizeText(`${listing.district} ${listing.address}`)
  return haystack.includes(needle)
}

export function filterListings(listings: Listing[], query: ListingQuery) {
  return listings.filter(listing =>
    (query.kind === 'all' || listing.kind === query.kind)
    && matchesDistrict(listing, query.district)
    && inPriceRange(listing.price, query.price),
  )
}
