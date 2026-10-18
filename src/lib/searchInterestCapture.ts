import type { InterestCriteria } from '../api/searchInterests'

/** Capture explicit URL search filters only; moving the map alone is not a new search. */
export function interestFromSearch(search: string): InterestCriteria | null {
  const p = new URLSearchParams(search)
  if (p.get('section') !== 'listings' || p.get('catalog') === 'market' || p.has('post')) return null
  const area = (p.get('placeName') || p.get('keyword') || '').trim()
  if (area.length < 2 || area.length > 160) return null
  const number = (key: string) => { const raw = p.get(key); return raw !== null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null }
  return { area, minPrice: number('minPrice'), maxPrice: number('maxPrice'), minArea: number('minArea'), maxArea: number('maxArea'),
    maxDeposit: number('maxDeposit'), occupants: number('minAvailableSlots'), amenities: p.getAll('amenities').flatMap(v => v.split(',')),
    excludedAmenities: p.getAll('excludedAmenities'), excludeRoommateShare: p.get('excludeRoommateShare') === 'true' }
}
export function interestSession(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string, now: number, uuid: () => string): string {
  const key = 'homeji:interest-session:' + owner
  let current: { id: string; at: number } | null = null
  try { current = JSON.parse(storage.getItem(key) || 'null') } catch { /* Reset malformed local state. */ }
  if (!current || typeof current.id !== 'string' || !Number.isFinite(current.at) || now - current.at > 30 * 60 * 1000 || current.at > now) current = { id: uuid(), at: now }
  storage.setItem(key, JSON.stringify({ id: current.id, at: now }))
  return current.id
}
