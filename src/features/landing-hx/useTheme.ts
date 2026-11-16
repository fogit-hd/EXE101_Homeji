import { useSyncExternalStore } from 'react'
import { applyTheme, currentTheme, THEME_EVENT, type Theme } from '../../lib/theme'

function subscribeTheme(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener)
  return () => window.removeEventListener(THEME_EVENT, listener)
}

/** The site theme (light/dark) and a toggle; follows changes made anywhere in the app. */
export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, (): Theme => 'light')
  return [theme, () => applyTheme(theme === 'dark' ? 'light' : 'dark', true)]
}
