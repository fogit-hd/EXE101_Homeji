export type Theme = 'light' | 'dark'
export const THEME_KEY = 'homeji_theme'
export const THEME_EVENT = 'homeji:theme-change'
export function savedTheme(): Theme | null {
  try { const value = localStorage.getItem(THEME_KEY); return value === 'light' || value === 'dark' ? value : null }
  catch { return null }
}
export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  const value = document.documentElement.dataset.theme
  if (value === 'light' || value === 'dark') return value
  return savedTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}
export function applyTheme(theme: Theme, persist = false) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10212b' : '#f3f7fa')
  if (persist) { try { localStorage.setItem(THEME_KEY, theme) } catch { /* Storage can be blocked in private browsing. */ } }
  window.dispatchEvent(new Event(THEME_EVENT))
}
