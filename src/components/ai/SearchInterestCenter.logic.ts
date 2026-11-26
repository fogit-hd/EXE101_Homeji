import type { InterestCriteria } from '../../api/searchInterests'
import { interestFromSearch } from '../../lib/searchInterestCapture.ts'

export function interestDraftFromSearch(search: string): InterestCriteria {
  const params = new URLSearchParams(search)
  const area = (params.get('placeName') || params.get('keyword') || '').trim()
  // Manual follow can start before choosing an area; retain its other filters.
  if (!area) params.set('placeName', 'Homeji')
  const criteria = interestFromSearch(params.toString())
  return criteria ? { ...criteria, area } : { area: '', amenities: [], excludedAmenities: [] }
}

export function followedInterestSearch(criteria: InterestCriteria): URLSearchParams {
  const params = new URLSearchParams({ section: 'listings', view: 'list', keyword: criteria.area })
  for (const key of ['minPrice', 'maxPrice', 'minArea', 'maxArea', 'maxDeposit', 'latitude', 'longitude', 'radiusKm'] as const) {
    const value = criteria[key]
    if (value != null) params.set(key, String(value))
  }
  if (criteria.occupants != null) params.set('minAvailableSlots', String(criteria.occupants))
  for (const value of criteria.amenities ?? []) params.append('amenities', value)
  for (const value of criteria.excludedAmenities ?? []) params.append('excludedAmenities', value)
  if (criteria.excludeRoommateShare) params.set('excludeRoommateShare', 'true')
  return params
}
