function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Broad coverage names are context, rather than useful destination suggestions. */
export function isCoverageOnlySearch(value: string): boolean {
  const text = normalize(value).replace(/^(thanh pho|tp|quan|q|phuong|p)\s+/, '')
  return ['thu duc', '9', 'quan 9', 'truong tho', 'truong tho thu duc', 'ho chi minh', 'hcm'].includes(text)
}

export function relevantRecentLocations(items: string[], query: string): string[] {
  const input = normalize(query)
  return items.filter(item => !isCoverageOnlySearch(item) && (!input || normalize(item).includes(input))).slice(0, 6)
}

export function isConcretePlacePrediction(title: string, types: readonly string[] = []): boolean {
  if (isCoverageOnlySearch(title)) return false
  return !types.some(type => type === 'locality' || type === 'country' || type.startsWith('administrative_area_level_'))
}
