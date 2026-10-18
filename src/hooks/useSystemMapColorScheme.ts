import { currentTheme, THEME_EVENT } from '../lib/theme'
import { useEffect, useState } from 'react'

export type MapColorSchemeName = 'LIGHT' | 'DARK'

/** Reads OS / browser light-dark preference for Google Maps cloud styles. */
export function readSystemMapColorScheme(): MapColorSchemeName {
  if (typeof window === 'undefined') return 'LIGHT'
  return currentTheme() === 'dark'
    ? 'DARK'
    : 'LIGHT'
}

/**
 * Tracks `prefers-color-scheme` so maps remount when the device/UI theme
 * changes. Debounced on change to avoid double-mount tile storms.
 * Google Maps only applies `colorScheme` at Map construction time.
 */
export function useSystemMapColorScheme(): MapColorSchemeName {
  const [scheme, setScheme] = useState<MapColorSchemeName>(readSystemMapColorScheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    let timer = 0
    const apply = (immediate: boolean) => {
      const next: MapColorSchemeName = currentTheme() === 'dark' ? 'DARK' : 'LIGHT'
      if (immediate) {
        setScheme(next)
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setScheme(next), 280)
    }
    const onChange = () => apply(false)
    mq.addEventListener('change', onChange)
    window.addEventListener(THEME_EVENT, onChange)
    return () => {
      window.clearTimeout(timer)
      mq.removeEventListener('change', onChange)
      window.removeEventListener(THEME_EVENT, onChange)
    }
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
