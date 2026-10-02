import type { MarketplacePost } from '../../../api'
import { formatPrice } from '../../../lib/labels'
import { QuantityStepper } from './QuantityStepper'

type Props = {
  post: MarketplacePost
  quantity: number
  inCart: boolean
  locating: boolean
  hasUserLocation: boolean
  onQuantityChange: (next: number) => void
  onAddToCart: () => void
  onShowOnMap: () => void
}

function formatDistanceLabel(
  distanceKm: number | null,
  locating: boolean,
  hasUserLocation: boolean,
): string {
  if (distanceKm == null) {
    if (locating) return 'Đang định vị…'
    return hasUserLocation ? 'Gần bạn' : 'Chưa có vị trí'
  }
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(distanceKm)} km`
}

export function FoodCard({
  post,
  quantity,
  inCart,
  locating,
  hasUserLocation,
  onQuantityChange,
  onAddToCart,
  onShowOnMap,
}: Props) {
  const thumb = post.mediaUrls?.find((url) => url && !url.endsWith('/vite.svg')) || null
  const seller = post.sellerDisplayName || 'Bếp Homeji'
  const distance = formatDistanceLabel(post.distanceKm, locating, hasUserLocation)

  return (
    <article className={`food-card${inCart ? ' is-in-cart' : ''}`}>
      <button
        type="button"
        className="food-card__media"
        onClick={onShowOnMap}
        aria-label={`Xem ${post.title} trên bản đồ`}
      >
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="food-card__empty">Chưa có ảnh</span>}
      </button>
      <div className="food-card__body">
        <h3 className="food-card__title">{post.title}</h3>
        <p className="food-card__price">{formatPrice(post.price)}</p>
        <p className="food-card__seller">{seller} · {distance}</p>
        <div className="food-card__purchase">
          <QuantityStepper
            value={quantity}
            max={Math.max(1, post.availableQuantity)}
            label={`Số lượng ${post.title}`}
            onChange={onQuantityChange}
          />
          <button
            type="button"
            className={`food-card__cart-btn${inCart ? ' is-added' : ''}`}
            aria-pressed={inCart}
            onClick={onAddToCart}
          >
            {inCart ? 'Trong giỏ' : 'Thêm'}
          </button>
        </div>
      </div>
    </article>
  )
}
