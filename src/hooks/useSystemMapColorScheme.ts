import { useEffect, useState } from 'react'

export type MapColorSchemeName = 'LIGHT' | 'DARK'

/** Reads OS / browser light-dark preference for Google Maps cloud styles. */
export function readSystemMapColorScheme(): MapColorSchemeName {
  if (typeof window === 'undefined') return 'LIGHT'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'DARK'
    : 'LIGHT'
}

/**
 * Tracks `prefers-color-scheme` so maps remount when the device/UI theme
 * changes. Google Maps only applies `colorScheme` at Map construction time.
 */
export function useSystemMapColorScheme(): MapColorSchemeName {
  const [scheme, setScheme] = useState<MapColorSchemeName>(readSystemMapColorScheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setScheme(mq.matches ? 'DARK' : 'LIGHT')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return scheme
}

/** Resolve Maps JS ColorScheme enum after the API script is loaded. */
export function toGoogleColorScheme(
  scheme: MapColorSchemeName,
): google.maps.ColorScheme {
  return scheme === 'DARK'
    ? google.maps.ColorScheme.DARK
    : google.maps.ColorScheme.LIGHT
}
