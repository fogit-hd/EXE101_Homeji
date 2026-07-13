/**
 * Official Google Maps JavaScript API loader.
 * Loads only from maps.googleapis.com — no third-party map wrappers.
 */
let loadPromise: Promise<void> | null = null

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (!apiKey.trim()) {
    return Promise.reject(new Error('Missing Google Maps API key'))
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'))
  }

  // Prefer already-bootstrapped Maps API (importLibrary is the modern entry).
  const mapsApi = window.google?.maps
  if (mapsApi && typeof mapsApi.importLibrary === 'function') {
    return ensureCoreLibraries()
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-homeji-maps]')
    if (existing) {
      const onLoad = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        loadPromise = null
        reject(new Error('Failed to load Google Maps JavaScript API'))
      }
      const cleanup = () => {
        existing.removeEventListener('load', onLoad)
        existing.removeEventListener('error', onError)
      }
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', onError)
      return
    }

    const callbackName = `__homejiMapsInit_${Date.now()}`
    const w = window as unknown as Window & Record<string, unknown>
    w[callbackName] = () => {
      delete w[callbackName]
      resolve()
    }

    const script = document.createElement('script')
    script.dataset.homejiMaps = '1'
    script.async = true
    script.defer = true
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly` +
      `&libraries=marker,places` +
      `&language=vi` +
      `&region=VN` +
      `&loading=async` +
      `&callback=${callbackName}`
    script.onerror = () => {
      delete w[callbackName]
      loadPromise = null
      reject(new Error('Failed to load Google Maps JavaScript API'))
    }
    document.head.appendChild(script)
  }).then(() => ensureCoreLibraries())

  return loadPromise
}

async function ensureCoreLibraries(): Promise<void> {
  await google.maps.importLibrary('maps')
  await google.maps.importLibrary('marker')
}

export async function importPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  return (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
}

export async function importMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
  return (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary
}

export async function importMapsLibrary(): Promise<google.maps.MapsLibrary> {
  return (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary
}
