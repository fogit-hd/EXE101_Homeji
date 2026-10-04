export type CatalogFilters = {
  keyword: string
  category: string
  kind: string
  status: string
  price: string
  sort: string
}

type CatalogPost = { title: string; description: string; category: string; listingType: number; status: number; price: number; distanceKm?: number | null; createdAt?: string }

/** Keep persisted category names selectable without rewriting existing listings. */
export function catalogCategories(
  posts: readonly Pick<CatalogPost, 'category' | 'listingType'>[],
  defaults: readonly string[],
  kind: number | null,
  selected: string,
): string[] {
  const observed = posts.filter(post => kind === null || post.listingType === kind)
    .map(post => post.category).filter(value => value.trim().length > 0)
  return [...new Set([...defaults, ...observed, ...(selected ? [selected] : [])])]
}

function creationTime(post: CatalogPost): number {
  const time = post.createdAt ? Date.parse(post.createdAt) : 0
  return Number.isFinite(time) ? time : 0
}

/** Filtering is independent of map selection, and never mutates the fetched list. */
export function filterCatalog<T extends CatalogPost>(posts: readonly T[], filters: CatalogFilters): T[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('vi-VN')
  const result = posts.filter((post) =>
    (!keyword || `${post.title} ${post.description}`.toLocaleLowerCase('vi-VN').includes(keyword)) &&
    (!filters.category || post.category === filters.category) &&
    (!filters.kind || post.listingType === Number(filters.kind)) &&
    (!filters.status || post.status === Number(filters.status)) &&
    (!filters.price || (filters.price === 'under100' ? post.price < 100_000 : filters.price === '100to500' ? post.price >= 100_000 && post.price <= 500_000 : post.price > 500_000)),
  )
  if (filters.sort === 'priceAsc') result.sort((a, b) => a.price - b.price)
  else if (filters.sort === 'priceDesc') result.sort((a, b) => b.price - a.price)
  else if (filters.sort === 'nearby') result.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  else if (filters.sort === 'default') result.sort((a, b) => creationTime(b) - creationTime(a))
  return result
}
