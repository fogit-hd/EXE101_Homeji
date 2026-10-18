import { createContext, useContext } from 'react'
import type { Theme } from '../lib/theme'
export const ThemeContext = createContext<{ theme: Theme; busy: boolean; toggle: (element: HTMLElement) => void } | null>(null)
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requires ThemeSync')
  return context
}
