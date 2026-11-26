/**
 * Turns a raw database id (UUID or 32-hex) into the short code members see, e.g. "HJ-3K9…".
 * Same encoding as listing codes, so support can still map it back to the record.
 * Anything that is already a human code (order numbers, provider codes) is returned unchanged.
 */
export function humanReference(value: string | null | undefined): string {
  const text = value?.trim() ?? ''
  if (!text) return ''
  // Same encoding as listingReference() (kept inline so node tests can load this file on its own).
  const hex = text.replace(/^HJ-/i, '').replace(/-/g, '')
  if (!/^[a-f0-9]{32}$/i.test(hex) || /^0+$/.test(hex)) return text
  return `HJ-${BigInt(`0x${hex}`).toString(36).toUpperCase()}`
}
