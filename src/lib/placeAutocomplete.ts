import { DEFAULT_MAP_CENTER, geocodeAddress, looksLikeAddressQuery } from './googleMaps'
import { importPlacesLibrary } from './loadGoogleMaps'

export type PlacePredictionItem = {
  placeId: string
  title: string
  subtitle: string
}

export type ResolvedPlaceLocation = {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

export type MapSearchBBox = {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

/** ~radiusKm square bbox for rental proximity search. */
export function bboxAround(lat: number, lng: number, radiusKm = 1.8): MapSearchBBox {
  const dLat = radiusKm / 111
  const cos = Math.cos((lat * Math.PI) / 180)
  const dLng = radiusKm / (111 * Math.max(cos, 0.2))
  return {
    minLatitude: lat - dLat,
    maxLatitude: lat + dLat,
    minLongitude: lng - dLng,
    maxLongitude: lng + dLng,
  }
}

function readPredictionText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'text' in value) {
    const t = (value as { text?: unknown }).text
    if (typeof t === 'string') return t.trim()
  }
  return ''
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
  const lat = Number(lit.lat)
  const lng = Number(lit.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Live address / POI suggestions for the map omnibox (Vietnam-biased).
 * Prefers Places AutocompleteSuggestion; falls back to AutocompleteService.
 */
export async function fetchPlacePredictions(
  input: string,
  options?: { limit?: number },
): Promise<PlacePredictionItem[]> {
  const q = input.trim()
  if (q.length < 2) return []

  const places = await importPlacesLibrary()
  const limit = options?.limit ?? 6

  const AutocompleteSuggestion = (
    places as google.maps.PlacesLibrary & {
      AutocompleteSuggestion?: {
        fetchAutocompleteSuggestions: (req: {
          input: string
          includedRegionCodes?: string[]
          language?: string
          locationBias?: {
            circle: { center: google.maps.LatLngLiteral; radius: number }
          }
        }) => Promise<{ suggestions?: Array<{ placePrediction?: unknown }> }>
      }
    }
  ).AutocompleteSuggestion

  if (AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    try {
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        includedRegionCodes: ['vn'],
        language: 'vi',
        locationBias: {
          circle: { center: DEFAULT_MAP_CENTER, radius: 25000 },
        },
      })

      const out: PlacePredictionItem[] = []
      for (const s of suggestions ?? []) {
        const pred = s.placePrediction as
          | {
              placeId?: string
              text?: unknown
              mainText?: unknown
              secondaryText?: unknown
            }
          | undefined
        if (!pred?.placeId) continue
        const title =
          readPredictionText(pred.mainText) ||
          readPredictionText(pred.text) ||
          'Địa điểm'
        const subtitle =
          readPredictionText(pred.secondaryText) || 'Địa điểm trên Google Maps'
        out.push({ placeId: pred.placeId, title, subtitle })
        if (out.length >= limit) break
      }
      if (out.length) return out
    } catch {
      /* fall through to legacy */
    }
  }

  if (!places.AutocompleteService) return []

  const service = new places.AutocompleteService()
  const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
    (resolve) => {
      service.getPlacePredictions(
        {
          input: q,
          componentRestrictions: { country: 'vn' },
          language: 'vi',
          location: new google.maps.LatLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng),
          radius: 25000,
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            resolve([])
            return
          }
          resolve(results)
        },
      )
    },
  )

  return predictions.slice(0, limit).map((p) => ({
    placeId: p.place_id,
    title: p.structured_formatting?.main_text || p.description,
    subtitle:
      p.structured_formatting?.secondary_text || 'Địa điểm trên Google Maps',
  }))
}

/** Resolve a Place ID to coordinates for map focus + nearby listing search. */
export async function resolvePlaceCoordinates(
  placeId: string,
): Promise<ResolvedPlaceLocation | null> {
  const { Place } = await importPlacesLibrary()
  if (!Place) return null

  try {
    const place = new Place({ id: placeId })
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location'],
    })

    const coords = readLatLng(place.location)
    if (!coords) return null

    const name =
      typeof place.displayName === 'string'
        ? place.displayName.trim()
        : readPredictionText(place.displayName)
    const address = place.formattedAddress?.trim() || ''

    return {
      placeId,
      name: name || address || 'Địa điểm',
      address,
      lat: coords.lat,
      lng: coords.lng,
    }
  } catch {
    return null
  }
}

/** Text search for a place (stronger than geocode for Vietnamese building names). */
export async function searchPlaceByText(
  query: string,
): Promise<ResolvedPlaceLocation | null> {
  const q = query.trim()
  if (q.length < 2) return null

  const placesLib = await importPlacesLibrary()
  const Place = placesLib.Place as typeof google.maps.places.Place & {
    searchByText?: (req: Record<string, unknown>) => Promise<{
      places?: google.maps.places.Place[]
    }>
  }

  if (typeof Place.searchByText !== 'function') return null

  try {
    const { places } = await Place.searchByText({
      textQuery: q,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      language: 'vi',
      region: 'vn',
      maxResultCount: 1,
      locationBias: {
        center: DEFAULT_MAP_CENTER,
        radius: 30000,
      },
    })
    const place = places?.[0]
    if (!place) return null

    const coords = readLatLng(place.location)
    if (!coords) return null

    const name =
      typeof place.displayName === 'string'
        ? place.displayName.trim()
        : readPredictionText(place.displayName)
    const address = place.formattedAddress?.trim() || ''
    const id =
      typeof (place as { id?: string }).id === 'string'
        ? (place as { id: string }).id
        : `text:${coords.lat},${coords.lng}`

    return {
      placeId: id,
      name: name || address || q,
      address,
      lat: coords.lat,
      lng: coords.lng,
    }
  } catch {
    return null
  }
}

/**
 * Resolve a free-text map search to a concrete lat/lng.
 * Order: Autocomplete → Text Search → Geocode (address-like queries).
 */
export async function resolveSearchLocation(
  query: string,
): Promise<ResolvedPlaceLocation | null> {
  const q = query.trim()
  if (q.length < 2) return null

  const preds = await fetchPlacePredictions(q, { limit: 1 })
  if (preds[0]?.placeId) {
    const fromPred = await resolvePlaceCoordinates(preds[0].placeId)
    if (fromPred) return fromPred
  }

  const fromText = await searchPlaceByText(q)
  if (fromText) return fromText

  if (!looksLikeAddressQuery(q) && preds.length === 0) return null

  const geo = await geocodeAddress(q)
  if (!geo) return null
  return {
    placeId: `geo:${geo.lat},${geo.lng}`,
    name: geo.formattedAddress || q,
    address: geo.formattedAddress || q,
    lat: geo.lat,
    lng: geo.lng,
  }
}
