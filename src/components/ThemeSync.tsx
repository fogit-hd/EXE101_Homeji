import { useSyncDocumentTheme } from '../hooks/usePrefersColorScheme'

/** Side-effect only — syncs OS light/dark onto <html>. */
export function ThemeSync() {
  useSyncDocumentTheme()
  return null
}
