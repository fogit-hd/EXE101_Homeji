import {
  createContext,
  useContext
} from 'react'

import { getGoogleMapId } from '../lib/googleMaps'

export type GoogleMapsContextValue = {
  apiKey: string
  mapId: string
  isLoaded: boolean
  loadError: Error | undefined
}

export const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: '',
  mapId: getGoogleMapId(),
  isLoaded: false,
  loadError: undefined,
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
