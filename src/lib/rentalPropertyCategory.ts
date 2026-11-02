const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase()

const APARTMENT_TERMS = [
  'can ho',
  'chung cu',
  'studio',
  'officetel',
  'apartment',
  'penthouse',
  'condotel',
  'duplex',
] as const

export function isApartmentListing(value: string): boolean {
  const normalized = normalize(value)
  return APARTMENT_TERMS.some(term => normalized.includes(term))
}

export function matchesRentalPropertyCategory(
  category: 'rooms' | 'apartments',
  title: string,
  details?: string | null,
): boolean {
  const isApartment = isApartmentListing(`${title} ${details ?? ''}`)
  return category === 'apartments' ? isApartment : !isApartment
}
