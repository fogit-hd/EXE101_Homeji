import { useChangedInputs } from '../hooks/useChangedInputs'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { getGoogleMapId, getGoogleMapsApiKey } from '../lib/googleMaps'
import { loadGoogleMaps } from '../lib/loadGoogleMaps'
import { GoogleMapsContext } from "./GoogleMapsProvider.logic"

/**
 * Loads the official Maps JavaScript API once, the first time something asks for it.
 * Does NOT wrap children in @vis.gl APIProvider (removed — caused cascade re-renders).
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getGoogleMapsApiKey()
  const mapId = getGoogleMapId()
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | undefined>()
  const [requested, setRequested] = useState(false)
  const requestLoad = useCallback(() => setRequested(true), [])

  if (useChangedInputs([apiKey])) {
    setIsLoaded(false)
    setLoadError(undefined)
  }
  useEffect(() => {
    if (!apiKey || !requested) return
    let cancelled = false

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
  }, [apiKey, requested])

  const value = useMemo(
    () => ({ apiKey, mapId, isLoaded, loadError, requestLoad }),
    [apiKey, mapId, isLoaded, loadError, requestLoad],
  )

  return (
    <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>
  )
}
