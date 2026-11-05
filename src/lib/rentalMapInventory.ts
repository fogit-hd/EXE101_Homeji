import { searchRentalPosts, type RentalPostSearchParams, type RentalPostSummary } from '../api'

/** Map inventory must not lose older owner pins when imported posts fill the first page. */
export async function searchRentalMapInventory(params: RentalPostSearchParams, options: { signal: AbortSignal }): Promise<RentalPostSummary[]> {
  const posts = new Map<string, RentalPostSummary>()
  for (let page = 1; page <= 10; page++) {
    options.signal.throwIfAborted()
    const chunk = await searchRentalPosts({ ...params, page, pageSize: 100 }, options)
    for (const post of chunk) posts.set(post.id, post)
    if (chunk.length < 100) return [...posts.values()]
  }
  throw new Error('Khu vực có quá nhiều tin để tải đủ lên bản đồ. Hãy thu hẹp khu vực tìm kiếm.')
}
