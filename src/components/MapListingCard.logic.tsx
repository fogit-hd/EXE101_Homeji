export function shortListingTitle(title: string, max = 48) {
  const lead = title.split(/\s*[-–—|·]\s*/)[0]?.trim() || title.trim()
  if (lead.length <= max) return lead
  return `${lead.slice(0, max - 1).trimEnd()}…`
}

export function shortListingAddress(address: string) {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length <= 2) return address
  return parts.slice(0, 2).join(', ')
}
