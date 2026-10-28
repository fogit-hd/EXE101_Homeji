import type { MarketplacePost } from '../../../api'
import { formatPrice } from '../../../lib/labels'
import { QuantityStepper } from './QuantityStepper'

type Props = {
  post: MarketplacePost
  quantity: number
  inCart: boolean
  onQuantityChange: (next: number) => void
  onAddToCart: () => void
  onShowOnMap: () => void
}

export function FoodCard({
  post,
  quantity,
  inCart,
  onQuantityChange,
  onAddToCart,
  onShowOnMap,
}: Props) {
  const thumb = post.mediaUrls?.find((url) => url && !url.endsWith('/vite.svg')) || null

  return (
    <article data-glass-exclude className={`food-card${inCart ? ' is-in-cart' : ''}`}>
      <button
        type="button"
        className="food-card__media"
        onClick={onShowOnMap}
        aria-label={`Xem ${post.title} trên bản đồ`}
      >
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="food-card__empty">Chưa có ảnh</span>}
      </button>
      <div className="food-card__body">
        <h4 className="food-card__title">{post.title}</h4>
        <p className="food-card__price">{formatPrice(post.price)}</p>
        <p className="food-card__seller">{post.availableQuantity > 0 ? `Còn ${post.availableQuantity} phần` : 'Hết phần'}</p>
        <div className="food-card__purchase">
          <QuantityStepper
            value={quantity}
            max={Math.max(1, post.availableQuantity)}
            disabled={post.availableQuantity <= 0}
            label={`Số lượng ${post.title}`}
            onChange={onQuantityChange}
          />
          <button
            type="button"
            className={`food-card__cart-btn${inCart ? ' is-added' : ''}`}
            aria-label={`${inCart ? 'Bỏ khỏi giỏ' : 'Thêm vào giỏ'}: ${post.title}`}
            aria-pressed={inCart}
            disabled={!inCart && post.availableQuantity <= 0}
            onClick={onAddToCart}
          >
            {inCart ? 'Bỏ khỏi giỏ' : post.availableQuantity <= 0 ? 'Hết phần' : 'Thêm'}
          </button>
        </div>
      </div>
    </article>
  )
}
