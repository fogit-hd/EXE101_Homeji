import { searchRentalPosts, type RentalPostSearchParams, type RentalPostSummary } from '../api'

/** Map inventory must not lose older owner pins when imported posts fill the first page. */
export async function searchRentalMapInventory(params: RentalPostSearchParams, options: { signal: AbortSignal; auth?: boolean }): Promise<RentalPostSummary[]> {
  const posts = new Map<string, RentalPostSummary>()
  for (let page = 1; ; page++) {
    options.signal.throwIfAborted()
    const chunk = await searchRentalPosts({ ...params, page, pageSize: 100 }, options)
    options.signal.throwIfAborted()
    const previousSize = posts.size
    for (const post of chunk) posts.set(post.id, post)
    if (chunk.length < 100) return [...posts.values()]
    if (posts.size === previousSize) throw new Error('Không thể tải trang tin tiếp theo trên bản đồ.')
  }
}
