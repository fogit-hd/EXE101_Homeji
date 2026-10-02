import { getMarketplacePost } from '../api'
import { MarketplaceListingType } from '../api/types'

/** Food vs goods, resolved from the existing post endpoint. Not an order-list page. */
export type PurchaseKind = 'food' | 'goods'

export type PurchaseKindLookup = {
  kinds: Record<string, PurchaseKind>
  failedIds: string[]
}

/**
 * Classify marketplace posts that already belong to the buyer's full order list.
 * Each id is one post lookup. Failures stay unresolved so a food order is never
 * labeled as goods.
 */
export async function resolvePurchaseKinds(postIds: readonly string[]): Promise<PurchaseKindLookup> {
  const kinds: Record<string, PurchaseKind> = {}
  const failedIds: string[] = []
  await Promise.all(postIds.map(async (postId) => {
    try {
      const post = await getMarketplacePost(postId)
      kinds[postId] = post.listingType === MarketplaceListingType.Food ? 'food' : 'goods'
    } catch {
      failedIds.push(postId)
    }
  }))
  return { kinds, failedIds }
}

export function purchaseKindLabel(kind: PurchaseKind | 'mixed' | 'unknown'): string {
  if (kind === 'food') return 'Đồ ăn'
  if (kind === 'goods') return 'Đồ dùng'
  if (kind === 'mixed') return 'Đồ ăn và đồ dùng'
  return 'Chưa rõ loại'
}
