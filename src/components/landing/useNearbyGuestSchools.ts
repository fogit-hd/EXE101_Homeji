import { useEffect, useState } from 'react'
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

/**
 * Nearby universities for authenticated MapOmnibox (Places API + fallback).
 * Guest landing uses curated GUEST_SCHOOL_FALLBACK + ward filter instead.
 */
export function useNearbyGuestSchools(enabled: boolean) {
  const [schools, setSchools] = useState<GuestAreaOption[]>(GUEST_SCHOOL_FALLBACK)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.google?.maps?.places) {
      setSchools(GUEST_SCHOOL_FALLBACK)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const service = new google.maps.places.PlacesService(document.createElement('div'))
    const collected: GuestAreaOption[] = []
    const seen = new Set<string>()

    const finalize = () => {
      if (cancelled) return
      const next = collected.length > 0 ? collected : GUEST_SCHOOL_FALLBACK
      setSchools(next)
      setLoading(false)
    }

    const pushResults = (results: google.maps.places.PlaceResult[] | null) => {
      for (const place of results ?? []) {
        const name = place.name?.trim()
        const placeId = place.place_id
        const location = place.geometry?.location
        if (!name || !placeId || !location) continue
        if (!isLikelyUniversity(name, place.types)) continue
        if (seen.has(placeId) || seen.has(name.toLowerCase())) continue
        seen.add(placeId)
        seen.add(name.toLowerCase())
        collected.push({
          id: placeId,
          label: name,
          keyword: name,
          focus: { lat: location.lat(), lng: location.lng() },
        })
        if (collected.length >= MAX_RESULTS) break
      }
    }

    service.nearbySearch(
      {
        location: THU_DUC_CENTER,
        radius: SEARCH_RADIUS_M,
        type: 'university',
        keyword: 'đại học',
      },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK ||
          status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          pushResults(results)
        }

        if (collected.length >= 12 || cancelled) {
          finalize()
          return
        }

        service.textSearch(
          {
            query: 'đại học Thành phố Thủ Đức Hồ Chí Minh',
            location: THU_DUC_CENTER,
            radius: SEARCH_RADIUS_M,
          },
          (textResults, textStatus) => {
            if (
              textStatus === google.maps.places.PlacesServiceStatus.OK ||
              textStatus === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              pushResults(textResults)
            }
            finalize()
          },
        )
      },
    )

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { schools, loading }
}
