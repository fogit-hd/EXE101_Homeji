/** Public listing text search accepts Vietnamese with or without diacritics. */
export function matchesListingText(query: string, values: readonly (string | null | undefined)[]): boolean {
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const words = fold(query).split(/\s+/).filter(Boolean)
  const text = fold(values.filter(Boolean).join(' '))
  return words.every(word => text.includes(word))
}

/** Drop accidental keystrokes stored as recent searches. */
export function isUsefulSearchQuery(value: string): boolean {
  const text = value.trim()
  if (text.length < 2) return false
  const compact = text.toLowerCase().replace(/\s+/g, '')
  if (compact.length < 2) return false
  if (/^(.)\1+$/i.test(compact)) return false
  const blocked = new Set(['aaa', 'sdadsa', 'asdf', 'qwer', 'test', 'abc', 'xxx'])
  if (blocked.has(compact)) return false
  const meaningful = compact.replace(/[^0-9a-zà-ỹ]/gi, '')
  return meaningful.length >= 2
}
