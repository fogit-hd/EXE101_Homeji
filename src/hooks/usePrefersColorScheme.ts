import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark'

export function getPrefersColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Follows OS light/dark; updates when the user changes system theme. */
export function usePrefersColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => getPrefersColorScheme())

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setScheme(mq.matches ? 'dark' : 'light')
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return scheme
}

/** Keep <html data-theme> + color-scheme in sync with the device. */
export function useSyncDocumentTheme() {
  const scheme = usePrefersColorScheme()

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = scheme
    root.style.colorScheme = scheme
  }, [scheme])

  return scheme
}
