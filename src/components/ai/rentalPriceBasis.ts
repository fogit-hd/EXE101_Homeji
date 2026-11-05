import { RentalPostType, UserRole } from '../../api/types'
import { isImportedRentalPost } from '../../lib/sourcePublisherLinks'

type PricedPost = { id?: string; isImportedSource?: boolean; type: RentalPostType; ownerRole?: UserRole | null; price: number }
export type RentalPriceBasis = 'room' | 'person' | 'unknown'

/** Older roommate summaries may omit the author role: their price unit cannot be inferred safely. */
export function rentalPriceBasis(post: Pick<PricedPost, 'id' | 'isImportedSource' | 'type' | 'ownerRole'>): RentalPriceBasis {
  if (isImportedRentalPost(post)) return 'unknown'
  if (post.type !== RentalPostType.RoommateShare) return 'room'
  if (post.ownerRole === UserRole.Renter) return 'person'
  if (post.ownerRole === UserRole.Landlord) return 'room'
  return 'unknown'
}

export function rentalPriceLabel(basis: RentalPriceBasis): string {
  return basis === 'person' ? 'Chi phí dự kiến/người/tháng'
    : basis === 'room' ? 'Tiền thuê cả phòng/tháng'
      : 'Giá theo tin/tháng · chưa rõ đơn vị'
}

export function isLowestComparablePrice(post: PricedPost, posts: readonly PricedPost[]): boolean {
  const basis = rentalPriceBasis(post)
  if (basis === 'unknown' || !Number.isFinite(post.price) || post.price <= 0) return false
  const comparable = posts.filter(candidate => rentalPriceBasis(candidate) === basis
    && Number.isFinite(candidate.price) && candidate.price > 0)
  return comparable.length > 1 && comparable.every(candidate => candidate.price >= post.price)
}
