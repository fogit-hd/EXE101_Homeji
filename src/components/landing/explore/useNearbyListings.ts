import { useCallback, useEffect, useState } from 'react'
import type { RentalPostSearchParams } from '../../../api'
import { getRentalSourceCatalog } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { HOMEJI_SERVICE_AREA } from '../../../lib/homejiServiceArea'
import { bboxAround, type MapSearchBBox } from '../../../lib/placeAutocomplete'
import { searchRentalMapInventory } from '../../../lib/rentalMapInventory'
import {
  mergeNearby,
  mergeNewest,
  type NearbyListingItem,
} from './nearbyListings'

export type NearbyListingsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'empty'

export type NearbyListingsQuery = {
  enabled: boolean
  center: { lat: number; lng: number } | null
  radiusKm: number
  bounds: MapSearchBBox | null
  /** When true, sort by newest around default focus (no tight radius filter). */
  defaultMode: boolean
  filters: Pick<
    RentalPostSearchParams,
    'keyword' | 'minPrice' | 'maxPrice' | 'propertyCategory' | 'minLatitude' | 'maxLatitude' | 'minLongitude' | 'maxLongitude'
  >
}

export function useNearbyListings(query: NearbyListingsQuery) {
  const [items, setItems] = useState<NearbyListingItem[]>([])
  const [status, setStatus] = useState<NearbyListingsStatus>(query.enabled ? 'loading' : 'idle')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    if (!query.enabled) return undefined

    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setStatus('loading')
      setError('')
    })

    void (async () => {
      try {
        const center = query.center
        const bbox = query.bounds
          ?? (center ? bboxAround(center.lat, center.lng, query.defaultMode ? 8 : query.radiusKm) : HOMEJI_SERVICE_AREA)

        const searchParams: RentalPostSearchParams = {
          ...query.filters,
          ...bbox,
          pageSize: 100,
        }

        const [postsResult, sourcesResult] = await Promise.allSettled([
          searchRentalMapInventory(searchParams, { auth: false, signal: controller.signal }),
          getRentalSourceCatalog(),
        ])

        if (controller.signal.aborted) return

        if (postsResult.status === 'rejected' && sourcesResult.status === 'rejected') {
          setItems([])
          setError(getErrorMessage(postsResult.reason, 'Chưa tải được danh sách phòng.'))
          setStatus('error')
          return
        }

        const posts = postsResult.status === 'fulfilled' ? postsResult.value : []
        const sources = sourcesResult.status === 'fulfilled' ? sourcesResult.value : []
        const anchor = center ?? {
          lat: (bbox.minLatitude + bbox.maxLatitude) / 2,
          lng: (bbox.minLongitude + bbox.maxLongitude) / 2,
        }

        const merged = query.defaultMode
          ? mergeNewest(posts, sources, anchor)
          : mergeNearby(posts, sources, anchor, query.radiusKm)

        setItems(merged)
        setStatus(merged.length === 0 ? 'empty' : 'ready')
        if (postsResult.status === 'rejected' || sourcesResult.status === 'rejected') {
          setError('Chưa tải được danh sách phòng.')
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        setItems([])
        setError(getErrorMessage(reason, 'Chưa tải được danh sách phòng.'))
        setStatus('error')
      }
    })()

    return () => controller.abort()
  }, [
    attempt,
    query.bounds,
    query.center,
    query.defaultMode,
    query.enabled,
    query.filters,
    query.radiusKm,
  ])

  const resolvedStatus = query.enabled ? status : 'idle'
  return { items: query.enabled ? items : [], status: resolvedStatus, error: query.enabled ? error : '', retry }
}
