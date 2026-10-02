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
