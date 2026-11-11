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
  const freshnessText =
    post.freshnessBadge === 'DailyBatch'
      ? 'Mới nấu hôm nay'
      : post.freshnessBadge === 'ChilledReady'
      ? 'Ướp lạnh'
      : post.freshnessBadge === 'CookToOrder'
      ? 'Nấu theo đơn'
      : post.freshnessBadge || null

  return (
    <article data-glass-exclude className={`food-card${inCart ? ' is-in-cart' : ''}`}>
      <button
        type="button"
        className="food-card__media"
        onClick={onShowOnMap}
        aria-label={`Xem ${post.title} trên bản đồ`}
      >
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="food-card__empty">Chưa có ảnh</span>}
        {post.isSamplePhoto && (
          <span
            className="food-card__badge"
            style={{
              top: 6,
              left: 6,
              padding: '2px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              borderRadius: '4px',
            }}
          >
            [Ảnh mẫu]
          </span>
        )}
      </button>
      <div className="food-card__body">
        <h4 className="food-card__title">{post.title}</h4>
        <div className="food-card__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {freshnessText && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--food-leaf-deep, #24543e)',
                backgroundColor: 'var(--food-leaf, #e1f4e8)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              🔥 {freshnessText}
            </span>
          )}
          {post.preparationMinutes != null && post.preparationMinutes > 0 && (
            <span className="food-card__eta" style={{ fontSize: '0.72rem', color: 'var(--food-muted, #64748b)' }}>
              ⏱ {post.preparationMinutes}p
            </span>
          )}
        </div>
        {post.allergenAlerts && (
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#b45309', lineHeight: 1.3 }}>
            ⚠️ {post.allergenAlerts}
          </p>
        )}
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
