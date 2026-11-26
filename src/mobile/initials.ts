/** Two-letter avatar fallback from a display name. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HJ'
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}
