import { APIProvider } from '@vis.gl/react-google-maps'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { getGoogleMapsApiKey, getGoogleMapId } from '../lib/googleMaps'

type GoogleMapsContextValue = {
  apiKey: string
  mapId: string | undefined
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: '',
  mapId: undefined,
  isLoaded: false,
  loadError: undefined,
})

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getGoogleMapsApiKey()
  const mapId = getGoogleMapId()
  const [isLoaded, setIsLoaded] = useState(!apiKey)
  const [loadError, setLoadError] = useState<Error | undefined>()

  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider
        value={{ apiKey: '', mapId, isLoaded: true, loadError: undefined }}
      >
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <APIProvider
      apiKey={apiKey}
      language="vi"
      region="VN"
      onLoad={() => setIsLoaded(true)}
      onError={(error) => {
        setLoadError(error instanceof Error ? error : new Error(String(error)))
      }}
    >
      <GoogleMapsContext.Provider value={{ apiKey, mapId, isLoaded, loadError }}>
        {children}
      </GoogleMapsContext.Provider>
    </APIProvider>
  )
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
