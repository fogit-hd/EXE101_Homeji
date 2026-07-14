import { useEffect, useState } from 'react'
import { importPlacesLibrary } from '../../lib/loadGoogleMaps'
import { GUEST_SCHOOL_FALLBACK, type GuestAreaOption } from './guestMapAreas'

const THU_DUC_CENTER = { lat: 10.8505, lng: 106.772 }
const SEARCH_RADIUS_M = 12000
const MAX_RESULTS = 40

function isLikelyUniversity(name: string, types: string[] | undefined): boolean {
  const lower = name.toLowerCase()
  if (types?.some((t) => t === 'university' || t === 'school')) return true
  return (
    lower.includes('đại học') ||
    lower.includes('dai hoc') ||
    lower.includes('university') ||
    lower.includes('học viện') ||
    lower.includes('hoc vien') ||
    lower.includes('cao đẳng') ||
    lower.includes('cao dang') ||
    lower.includes('college')
  )
}

function readName(value: unknown): string {
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
 * Nearby universities for authenticated MapOmnibox.
 * Uses Place (New) APIs only — never legacy PlacesService.
 * Falls back to curated GUEST_SCHOOL_FALLBACK (keeps ward metadata).
 */
export function useNearbyGuestSchools(enabled: boolean) {
  const [schools, setSchools] = useState<GuestAreaOption[]>(GUEST_SCHOOL_FALLBACK)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setSchools(GUEST_SCHOOL_FALLBACK)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const run = async () => {
      const collected: GuestAreaOption[] = []
      const seen = new Set<string>()

      const pushPlace = (place: google.maps.places.Place) => {
        const name = readName(place.displayName)
        const coords = readLatLng(place.location)
        const id =
          typeof (place as { id?: string }).id === 'string'
            ? (place as { id: string }).id
            : coords
              ? `near:${coords.lat},${coords.lng}`
              : ''
        if (!name || !coords || !id) return
        if (!isLikelyUniversity(name, place.types)) return
        if (seen.has(id) || seen.has(name.toLowerCase())) return
        seen.add(id)
        seen.add(name.toLowerCase())
        collected.push({
          id,
          label: name,
          keyword: name,
          focus: { lat: coords.lat, lng: coords.lng },
        })
      }

      try {
        const { Place } = await importPlacesLibrary()
        const PlaceCtor = Place as typeof google.maps.places.Place & {
          searchNearby?: (req: Record<string, unknown>) => Promise<{
            places?: google.maps.places.Place[]
          }>
          searchByText?: (req: Record<string, unknown>) => Promise<{
            places?: google.maps.places.Place[]
          }>
        }

        if (typeof PlaceCtor.searchNearby === 'function') {
          try {
            const { places } = await PlaceCtor.searchNearby({
              fields: ['id', 'displayName', 'location', 'types'],
              locationRestriction: {
                center: THU_DUC_CENTER,
                radius: SEARCH_RADIUS_M,
              },
              includedPrimaryTypes: ['university'],
              maxResultCount: Math.min(MAX_RESULTS, 20),
            })
            for (const p of places ?? []) {
              pushPlace(p)
              if (collected.length >= MAX_RESULTS) break
            }
          } catch {
            /* try text search below */
          }
        }

        if (collected.length < 12 && typeof PlaceCtor.searchByText === 'function') {
          try {
            const { places } = await PlaceCtor.searchByText({
              textQuery: 'đại học Thành phố Thủ Đức Hồ Chí Minh',
              fields: ['id', 'displayName', 'location', 'types'],
              language: 'vi',
              region: 'vn',
              maxResultCount: 20,
              locationBias: {
                center: THU_DUC_CENTER,
                radius: SEARCH_RADIUS_M,
              },
            })
            for (const p of places ?? []) {
              pushPlace(p)
              if (collected.length >= MAX_RESULTS) break
            }
          } catch {
            /* keep curated fallback */
          }
        }
      } catch {
        /* Maps / Places not ready */
      }

      if (cancelled) return
      // Prefer curated list when Places returns little — keeps wardIds for filters.
      setSchools(collected.length >= 8 ? collected : GUEST_SCHOOL_FALLBACK)
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { schools, loading }
}
