/** Compact map pin label: 6.800.000 → "6,8tr" */
export function formatCompactPriceTr(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '—'
  const millions = price / 1_000_000
  if (millions >= 100) return `${Math.round(millions)}tr`
  const rounded = Math.round(millions * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',')
  return `${text}tr`
}

/** Card / preview price: 6.800.000 → "6,8 triệu" */
export function formatMillionPriceLabel(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '—'
  const millions = price / 1_000_000
  const rounded = Math.round(millions * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',')
  return `${text} triệu`
}

/** Prefer district / area token from a Vietnamese address. */
export function districtFromAddress(address: string): string {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  // Skip trailing city/province when present
  const tail = parts[parts.length - 1]
  if (/^(TP\.?|Thành phố|Tỉnh)/i.test(tail) && parts.length >= 2) {
    return parts[parts.length - 2]
  }
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
}

export function listingMetaLine(options: {
  area?: number | null
  highlightTag?: string | null
  extras?: string[]
}): string {
  const bits: string[] = []
  if (options.area && options.area > 0) {
    bits.push(`${Math.round(options.area)} m²`)
  }
  if (options.highlightTag?.trim()) {
    bits.push(options.highlightTag.trim())
  }
  for (const extra of options.extras ?? []) {
    if (extra.trim()) bits.push(extra.trim())
  }
  return bits.join(' · ')
}
