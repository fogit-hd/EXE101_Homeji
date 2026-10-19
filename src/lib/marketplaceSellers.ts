import type { MarketplacePost } from '../api/types'
import { MarketplaceListingType } from '../api/types'

/** Stable seller identity; display names are labels and may be shared by accounts. */
export function groupMarketplaceBySeller(posts: MarketplacePost[]) {
  const groups = new Map<string, { sellerId: string; sellerName: string; posts: MarketplacePost[] }>()
  for (const post of posts) {
    const key = post.sellerId?.trim() || `post:${post.id}`
    let group = groups.get(key)
    if (!group) {
      group = { sellerId: post.sellerId, sellerName: post.sellerDisplayName?.trim() || 'Người bán Homeji', posts: [] }
      groups.set(key, group)
    }
    group.posts.push(post)
  }
  return [...groups.values()]
}

export function marketplaceStoreUrl(sellerId: string, food = false, itemId?: string) {
  const params = new URLSearchParams({ section: 'marketplace', market: food ? 'food' : 'browse', seller: sellerId })
  if (itemId) params.set('item', itemId)
  return `/?${params}`
}

export function marketplaceItemUrl(post: MarketplacePost) {
  return marketplaceStoreUrl(post.sellerId, post.listingType === MarketplaceListingType.Food, post.id)
}
