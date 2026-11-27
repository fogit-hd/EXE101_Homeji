import { searchMarketplacePosts } from '../../../api'
import { getRentalSourceCatalog } from '../../../api/rentalSources'
import { searchRentalMapInventory } from '../../../lib/rentalMapInventory'
import { filterRentalSourcesForList, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import { listingQueryToMarketplaceParams, listingQueryToSearchParams, type ListingQuery } from './listingAdapters'

/** Count every matching page, never just the results already loaded behind the dialog. */
export async function countFilterResults(query: ListingQuery, signal: AbortSignal): Promise<number> {
  if (query.catalog === 'market') {
    const ids = new Set<string>()
    for (let page = 1; ; page++) {
      signal.throwIfAborted()
      const rows = await searchMarketplacePosts({ ...listingQueryToMarketplaceParams(query), page, pageSize: 100 }, { signal })
      signal.throwIfAborted()
      const before = ids.size
      for (const row of rows) ids.add(row.id)
      if (rows.length < 100) return ids.size
      if (ids.size === before) throw new Error('Không tải được trang kết quả tiếp theo.')
    }
  }
  const [native, sources] = await Promise.all([
    searchRentalMapInventory(listingQueryToSearchParams({ ...query, page: 1 }), { signal, auth: false }),
    sourceHasUnsupportedFilters(query) ? Promise.resolve([]) : getRentalSourceCatalog(),
  ])
  signal.throwIfAborted()
  const ids = new Set(native.map(row => row.id))
  return ids.size + filterRentalSourcesForList(sources, query).filter(row => !ids.has(row.id)).length
}
