const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

/** 2800000 → "2.800.000 ₫" */
export function formatPrice(value: number): string {
  return VND.format(value)
}

const MILLIONS = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** 5200000 → "5,2 triệu" */
export function formatMillions(value: number): string {
  return `${MILLIONS.format(value / 1_000_000)} triệu`
}

/** DOM id of a listing card, shared by the card and anything that links to it. */
export function listingCardId(listingId: string): string {
  return `hx-card-${listingId}`
}

/** "Bảo Ngọc" → "BN", "Cô Lan" → "CL" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0]?.toLocaleUpperCase('vi-VN') ?? '')
    .join('')
}
