export type ListingSort = 'default' | 'priceAsc' | 'priceDesc' | 'areaDesc'
export type SortFacts = { price?: number | null; area?: number | null }

const known = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)

/**
 * Orders rooms by the chosen sort. Rooms without a usable price or area ("Liên hệ", 0) go last
 * in either direction; ties keep their original order. 'default' returns the input order.
 */
export function sortListings<T>(items: readonly T[], sort: ListingSort, facts: (item: T) => SortFacts): T[] {
  if (sort === 'default') return [...items]
  const key = sort === 'areaDesc' ? 'area' : 'price'
  const direction = sort === 'priceAsc' ? 1 : -1
  return items
    .map((item, index) => ({ item, index, value: known(facts(item)[key]) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) return a.value === b.value ? a.index - b.index : a.value === null ? 1 : -1
      return (a.value - b.value) * direction || a.index - b.index
    })
    .map(({ item }) => item)
}
