import { useEffect, useState } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { DEFAULT_MAP_CENTER } from '../../lib/googleMaps'
import { importPlacesLibrary } from '../../lib/loadGoogleMaps'
import {
  GUEST_SCHOOL_FALLBACK,
  type GuestAreaOption,
} from './guestMapAreas'

type NearbySchool = GuestAreaOption & { placeId?: string }

/** Places searchNearby via official google.maps.places.Place API. */
export function useNearbyGuestSchools(enabled: boolean): {
  schools: NearbySchool[]
  loading: boolean
  source: 'google' | 'fallback'
} {
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const [schools, setSchools] = useState<NearbySchool[]>(GUEST_SCHOOL_FALLBACK)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'google' | 'fallback'>('fallback')

  useEffect(() => {
    if (!enabled || !mapsLoaded) {
      setSchools(GUEST_SCHOOL_FALLBACK)
      setSource('fallback')
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const placesLib = await importPlacesLibrary()
        const Place = placesLib.Place
        if (!Place?.searchNearby) {
          if (!cancelled) {
            setSchools(GUEST_SCHOOL_FALLBACK)
            setSource('fallback')
            setLoading(false)
          }
          return
        }

        const { places } = await Place.searchNearby({
          fields: ['displayName', 'location', 'id', 'formattedAddress'],
          locationRestriction: {
            center: DEFAULT_MAP_CENTER,
            radius: 10000,
          },
          includedPrimaryTypes: ['university'],
          maxResultCount: 20,
        })

        if (cancelled) return
        setLoading(false)

        if (!places?.length) {
          setSchools(GUEST_SCHOOL_FALLBACK)
          setSource('fallback')
          return
        }

        const fromGoogle: NearbySchool[] = places
          .filter((p) => p.id && p.displayName && p.location)
          .slice(0, 20)
          .map((p) => {
            const loc = p.location!
            const lat =
              typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat)
            const lng =
              typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng)
            const label =
              typeof p.displayName === 'string'
                ? p.displayName
                : String(p.displayName ?? 'Trường')
            return {
              id: p.id!,
              label,
              keyword: label,
              placeId: p.id,
              focus: { lat, lng, zoom: 15 },
            }
          })

        if (fromGoogle.length) {
          setSchools(fromGoogle)
          setSource('google')
        } else {
          setSchools(GUEST_SCHOOL_FALLBACK)
          setSource('fallback')
        }
      } catch {
        if (!cancelled) {
          setSchools(GUEST_SCHOOL_FALLBACK)
          setSource('fallback')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, mapsLoaded])

  return { schools, loading, source }
}
