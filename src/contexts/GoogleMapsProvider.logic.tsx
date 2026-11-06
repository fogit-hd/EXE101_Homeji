import {
  createContext,
  useContext,
  useEffect
} from 'react'

import { getGoogleMapId } from '../lib/googleMaps'

export type GoogleMapsContextValue = {
  apiKey: string
  mapId: string
  isLoaded: boolean
  loadError: Error | undefined
  /** Starts downloading the Maps script; later calls do nothing. */
  requestLoad?: () => void
}

export const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: '',
  mapId: getGoogleMapId(),
  isLoaded: false,
  loadError: undefined,
})

/** Reads Maps state without downloading it. For code mounted on pages that may have no map. */
export function useGoogleMapsStatus() {
  return useContext(GoogleMapsContext)
}

/** For anything that needs Maps as soon as it renders: mounting it loads the script. */
export function useGoogleMaps() {
  const maps = useContext(GoogleMapsContext)
  const { requestLoad } = maps
  useEffect(() => { requestLoad?.() }, [requestLoad])
  return maps
}
