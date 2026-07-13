import { importPlacesLibrary } from './loadGoogleMaps'

export type MapPlaceReview = {
  author: string
  rating: number | null
  text: string
  relativeTime: string | null
}

/** In-app Google Place details — never open google.com/maps for browsing. */
export type MapPlaceDetails = {
  placeId: string
  name: string
  address: string
  rating: number | null
  ratingCount: number | null
  phone: string | null
  typeLabel: string | null
  openNow: boolean | null
  weekdayHours: string[]
  websiteUri: string | null
  googleMapsUri: string | null
  editorialSummary: string | null
  photoUrls: string[]
  reviews: MapPlaceReview[]
  location: { lat: number; lng: number } | null
}

function readLatLng(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined,
): { lat: number; lng: number } | null {
  if (!loc) return null
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng
    return { lat: ll.lat(), lng: ll.lng() }
  }
  const lit = loc as google.maps.LatLngLiteral
  return { lat: Number(lit.lat), lng: Number(lit.lng) }
}

function displayText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'text' in value) {
    const t = (value as { text?: unknown }).text
    if (typeof t === 'string') return t
  }
  return value != null ? String(value) : ''
}

function readPhotoUrls(photos: unknown): string[] {
  if (!Array.isArray(photos)) return []
  const urls: string[] = []
  for (const photo of photos.slice(0, 6)) {
    if (!photo || typeof photo !== 'object') continue
    const getURI = (photo as { getURI?: (opts?: { maxWidth?: number; maxHeight?: number }) => string })
      .getURI
    if (typeof getURI !== 'function') continue
    try {
      const uri = getURI.call(photo, { maxWidth: 900, maxHeight: 600 })
      if (uri) urls.push(uri)
    } catch {
      /* photo URI unavailable */
    }
  }
  return urls
}

function readReviews(raw: unknown): MapPlaceReview[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 8).map((item) => {
    const r = item as {
      authorAttribution?: { displayName?: string }
      rating?: number
      text?: unknown
      relativePublishTimeDescription?: string
    }
    return {
      author: r.authorAttribution?.displayName?.trim() || 'Người dùng Google',
      rating: typeof r.rating === 'number' ? r.rating : null,
      text: displayText(r.text).trim(),
      relativeTime: r.relativePublishTimeDescription?.trim() || null,
    }
  }).filter((r) => r.text || r.rating != null)
}

function readWeekdayHours(hours: unknown): string[] {
  if (!hours || typeof hours !== 'object') return []
  const list = (hours as { weekdayDescriptions?: unknown }).weekdayDescriptions
  if (!Array.isArray(list)) return []
  return list.map((d) => String(d)).filter(Boolean)
}

export async function fetchMapPlaceDetails(
  placeId: string,
): Promise<MapPlaceDetails | null> {
  const { Place } = await importPlacesLibrary()
  if (!Place) return null

  const place = new Place({ id: placeId })
  await place.fetchFields({
    fields: [
      'displayName',
      'formattedAddress',
      'location',
      'rating',
      'userRatingCount',
      'nationalPhoneNumber',
      'primaryTypeDisplayName',
      'regularOpeningHours',
      'photos',
      'reviews',
      'websiteURI',
      'googleMapsURI',
      'editorialSummary',
    ],
  })

  const name = displayText(place.displayName).trim()
  if (!name) return null

  const hours = place.regularOpeningHours as
    | { openNow?: boolean; weekdayDescriptions?: string[] }
    | null
    | undefined

  const editorial = place.editorialSummary as unknown

  return {
    placeId,
    name,
    address: place.formattedAddress?.trim() || '',
    rating: typeof place.rating === 'number' ? place.rating : null,
    ratingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    phone: place.nationalPhoneNumber?.trim() || null,
    typeLabel: displayText(place.primaryTypeDisplayName).trim() || null,
    openNow: typeof hours?.openNow === 'boolean' ? hours.openNow : null,
    weekdayHours: readWeekdayHours(hours),
    websiteUri:
      typeof place.websiteURI === 'string' ? place.websiteURI.trim() || null : null,
    googleMapsUri:
      typeof place.googleMapsURI === 'string'
        ? place.googleMapsURI.trim() || null
        : null,
    editorialSummary: displayText(editorial).trim() || null,
    photoUrls: readPhotoUrls(place.photos),
    reviews: readReviews(place.reviews),
    location: readLatLng(place.location),
  }
}

export function isPlaceIconClick(
  event: google.maps.MapMouseEvent,
): event is google.maps.IconMouseEvent {
  return Boolean((event as google.maps.IconMouseEvent).placeId)
}

export function buildDirectionsUrl(
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
): string {
  const dest = `${destination.lat},${destination.lng}`
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`
}
