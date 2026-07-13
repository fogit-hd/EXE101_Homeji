import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getGoogleMapId, getGoogleMapsApiKey } from '../lib/googleMaps'
import { loadGoogleMaps } from '../lib/loadGoogleMaps'

type GoogleMapsContextValue = {
  apiKey: string
  mapId: string
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: '',
  mapId: getGoogleMapId(),
  isLoaded: false,
  loadError: undefined,
})

/**
 * Loads the official Maps JavaScript API once.
 * Does NOT wrap children in @vis.gl APIProvider (removed — caused cascade re-renders).
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getGoogleMapsApiKey()
  const mapId = getGoogleMapId()
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | undefined>()

  useEffect(() => {
    if (!apiKey) {
      setIsLoaded(false)
      setLoadError(undefined)
      return
    }

    let cancelled = false
    setLoadError(undefined)

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (!cancelled) setIsLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setIsLoaded(false)
        setLoadError(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  const value = useMemo(
    () => ({ apiKey, mapId, isLoaded, loadError }),
    [apiKey, mapId, isLoaded, loadError],
  )

  return (
    <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
