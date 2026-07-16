import type { MarketplacePost } from '../api'
import { MarketplaceListingType, MarketplacePostStatus } from '../api/types'
import { isInHomejiServiceArea } from './homejiServiceArea'

export type MarketplaceMapPin = {
  /** A map pin represents one seller, never an individual listing. */
  id: string
  sellerId: string
  title: string
  lat: number
  lng: number
  itemCount: number
  foodCount: number
  postIds: string[]
}

export function marketplacePostsToSellerPins(posts: MarketplacePost[]): MarketplaceMapPin[] {
  const sellers = new Map<string, MarketplaceMapPin>()

  for (const post of posts) {
    if (post.status != null && post.status !== MarketplacePostStatus.Active) continue
    if (!isInHomejiServiceArea(post.latitude, post.longitude)) continue

    const existing = sellers.get(post.sellerId)
    if (existing) {
      existing.itemCount += 1
      existing.foodCount += post.listingType === MarketplaceListingType.Food ? 1 : 0
      existing.postIds.push(post.id)
      continue
    }

    sellers.set(post.sellerId, {
      id: post.sellerId,
      sellerId: post.sellerId,
      title: post.sellerDisplayName?.trim() || 'Người bán Homeji',
      lat: post.latitude,
      lng: post.longitude,
      itemCount: 1,
      foodCount: post.listingType === MarketplaceListingType.Food ? 1 : 0,
      postIds: [post.id],
    })
  }

  return Array.from(sellers.values())
}
