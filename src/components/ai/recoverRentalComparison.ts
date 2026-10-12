import { RentalPostStatus, type CompareRentalPostItem, type RentalPost } from '../../api/types'

/** Only explicit 404 or a successfully read inactive status proves a selected listing unavailable. */
export async function recoverRentalComparison(
  ids: readonly string[], readPost: (id: string) => Promise<RentalPost>, isNotFound: (reason: unknown) => boolean,
): Promise<{ posts: CompareRentalPostItem[]; removedCount: number; unresolvedCount: number }> {
  const refreshed = await Promise.allSettled(ids.map(id => readPost(id)))
  const posts: CompareRentalPostItem[] = []
  let removedCount = 0
  let unresolvedCount = 0
  for (const result of refreshed) {
    if (result.status === 'rejected') {
      if (isNotFound(result.reason)) removedCount++
      else unresolvedCount++
    } else if (result.value.status === RentalPostStatus.Active) {
      posts.push({ post: result.value, averageRating: 0, reviewCount: 0 })
    } else removedCount++
  }
  // A partial response with unknown visibility is not a verified comparison.
  return { posts: unresolvedCount ? [] : posts, removedCount, unresolvedCount }
}
