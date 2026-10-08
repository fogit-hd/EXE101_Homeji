import { useEffect } from 'react'

/** Product surfaces and body-level portals share the same cool light palette. */
export function ThemeSync() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
  }, [])
  return null
}
