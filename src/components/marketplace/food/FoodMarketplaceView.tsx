import { Sk } from '../../skeletons/Skeleton'
import type { MarketplacePost } from '../../../api'
import { formatPrice } from '../../../lib/labels'
import {
  FOOD_ASSETS,
} from './foodAssets'
import { FoodCard } from './FoodCard'
import { FoodSourceDirectory } from './FoodSourceDirectory'
import {
  FoodUtilityRail,
  type FoodCartLine,
  type NearbyKitchen,
} from './FoodUtilityRail'

type Props = {
  posts: MarketplacePost[]
  kitchens: NearbyKitchen[]
  quantities: Record<string, number>
  cartItems: FoodCartLine[]
  cartItemCount: number
  cartTotal: number
  cartBusy: boolean
  cartNote: string
  cartOpen: boolean
  loading: boolean
  error: string | null
  locating: boolean
  hasUserLocation: boolean
  locationLabel: string
  locationSecondary: string
  minimumCartTotal: number
  onQuantityChange: (postId: string, quantity: number) => void
  onAddToCart: (post: MarketplacePost) => void
  onShowOnMap: (post: MarketplacePost) => void
  onRequestLocation?: () => void
  onUpdateCartQuantity: (postId: string, quantity: number) => void
  onRemoveCartItem: (postId: string) => void
  onClearCart: () => void
  onCheckout: () => void
  onCartNoteChange: (value: string) => void
  onCartOpenChange: (open: boolean) => void
  onSelectKitchen?: (sellerId: string) => void
}

function formatDistanceMeters(distanceKm: number | null): string {
  if (distanceKm == null) return 'gần bạn'
  if (distanceKm < 1) return `cách bạn ${Math.round(distanceKm * 1000)} m`
  return `cách bạn ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(distanceKm)} km`
}

function estimatedEtaFromCart(cartItems: FoodCartLine[], posts: MarketplacePost[]): string {
  const prep = cartItems.map((item) => {
    const post = posts.find((p) => p.id === item.postId)
    return post?.preparationMinutes ?? 30
  })
  const base = prep.length > 0 ? Math.max(...prep) : 30
  return `${Math.max(15, base - 5)}–${base + 5} phút`
}

export function FoodMarketplaceView({
  posts,
  kitchens,
  quantities,
  cartItems,
  cartItemCount,
  cartTotal,
  cartBusy,
  cartNote,
  cartOpen,
  loading,
  error,
  locating,
  hasUserLocation,
  locationLabel,
  locationSecondary,
  minimumCartTotal,
  onQuantityChange,
  onAddToCart,
  onShowOnMap,
  onRequestLocation,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  onCheckout,
  onCartNoteChange,
  onCartOpenChange,
  onSelectKitchen,
}: Props) {
  const featured = posts[0] ?? null
  const featuredDistance = formatDistanceMeters(featured?.distanceKm ?? null)
  const featuredPrice = featured ? formatPrice(featured.price) : ''
  const featuredPortions = featured?.availableQuantity
  const featuredEta = featured?.preparationMinutes
    ? `${featured.preparationMinutes} phút`
    : ''
  const etaLabel = estimatedEtaFromCart(cartItems, posts)
  const remainingKitchens = Math.max(0, kitchens.length - 3)
  const discoveryNames = kitchens
    .slice(3, 6)
    .map((k) => k.sellerName)
    .join(', ')

  const railProps = {
    loading,
    kitchens,
    cartItems,
    cartItemCount,
    cartTotal,
    cartBusy,
    cartNote,
    locating,
    hasUserLocation,
    locationLabel,
    locationSecondary,
    minimumCartTotal,
    estimatedEtaLabel: etaLabel,
    onCartNoteChange,
    onRequestLocation,
    onUpdateCartQuantity,
    onRemoveCartItem,
    onClearCart,
    onCheckout,
    onSelectKitchen,
  }

  return (
    <div className="food-market-body">
      <div className="food-catalog">
        <FoodSourceDirectory />
        {loading ? (
        <section className="food-featured food-featured--loading" aria-busy="true" aria-label="Đang tải gợi ý hôm nay">
          <div className="food-featured__copy sk-stack">
            <Sk w={140} h={10} />
            <Sk w="85%" h={28} r={10} />
            <Sk w="70%" h={12} />
            <div className="sk-row" style={{ marginTop: 8 }}><Sk w={150} h={40} r={999} /><Sk w={90} h={16} /></div>
          </div>
          <div className="food-featured__media"><Sk w="100%" h="100%" r={16} style={{ minHeight: 150 }} /></div>
        </section>
        ) : (
        <section className="food-featured" aria-label="Gợi ý hôm nay">
          <div className="food-featured__copy">
            <div className="food-featured__status">
              <span className="food-featured__eyebrow">Gợi ý hôm nay</span>
              <span aria-hidden="true">•</span>
              <span>{featuredDistance}</span>
            </div>
            <h2 className="food-featured__title">
              {featured
                ? `${featured.title}${featured.sellerDisplayName ? ` — ${featured.sellerDisplayName}` : ''}`
                : 'Chưa có món nào để gợi ý'}
            </h2>
            <p className="food-featured__desc">
              {featured?.description?.trim()
                || (featured
                  ? 'Món đang mở bán quanh bạn.'
                  : 'Khi có món ăn đang bán, món đầu danh sách sẽ hiện ở đây.')}
            </p>
            <div className="food-featured__actions">
              <button
                type="button"
                className="food-featured__cta"
                disabled={!featured}
                onClick={() => featured && onShowOnMap(featured)}
              >
                Xem mâm hôm nay
              </button>
              <span className="food-featured__price">
                {featured ? `Từ ${featuredPrice}` : featuredPrice}
              </span>
            </div>
          </div>
          <div className="food-featured__media">
            {featured?.mediaUrls?.[0] ? (
              <img src={featured.mediaUrls[0]} alt="" />
            ) : (
              <span className="food-featured__empty" />
            )}
            {featured ? (
              <span className="food-featured__note">
                {featuredPortions != null ? `Còn ${featuredPortions} phần` : 'Đang mở'}
                {featuredEta ? ` · ${featuredEta}` : ''}
              </span>
            ) : null}
          </div>
        </section>
        )}

        <div className="food-nearby-head">
          <div>
            <h2>Gần bạn hôm nay</h2>
            <p className="food-nearby-head__note">
              {loading ? <Sk w={150} h={10} /> : kitchens.length > 0
                ? `${kitchens.length} bếp trong danh sách này`
                : 'Chưa có bếp trong danh sách này'}
            </p>
          </div>
          <p className="food-nearby-head__count">
            {loading ? <Sk w={110} h={12} /> : posts.length === 0 ? 'Chưa có món' : `${posts.length} món trên trang này`}
          </p>
        </div>

        {loading ? (
          <div className="food-catalog__state" role="status">
            <div className="food-skeleton-grid sk-screen" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="food-skeleton-card sk-card">
                  <Sk h={170} r={14} />
                  <Sk w="75%" h={16} />
                  <Sk w="50%" h={11} />
                  <div className="sk-row" style={{ marginTop: 'auto', justifyContent: 'space-between' }}><Sk w={90} h={18} /><Sk w={96} h={36} r={999} /></div>
                </div>
              ))}
            </div>
            <span className="sr-only">Đang tải món ăn…</span>
          </div>
        ) : error ? (
          <div className="food-catalog__state food-catalog__state--error" role="alert">
            <strong>Không tải được danh sách món</strong>
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="food-catalog__state" role="status">
            <strong>Chưa có món ăn đang bán quanh đây</strong>
            <p>Thử đổi bộ lọc, từ khóa, hoặc bật định vị để xem bếp gần bạn.</p>
          </div>
        ) : (
          <div className="food-card-grid">
            {posts.map((post) => {
              const inCart = cartItems.some((item) => item.postId === post.id)
              return (
                <FoodCard
                  key={post.id}
                  post={post}
                  quantity={quantities[post.id] ?? 1}
                  inCart={inCart}
                  locating={locating}
                  hasUserLocation={hasUserLocation}
                  onQuantityChange={(next) => onQuantityChange(post.id, next)}
                  onAddToCart={() => onAddToCart(post)}
                  onShowOnMap={() => onShowOnMap(post)}
                />
              )
            })}
          </div>
        )}

        {kitchens.length > 3 ? (
          <div className="food-discovery-bar">
            <div className="food-discovery-bar__intro">
              <span className="food-discovery-bar__avatar" aria-hidden="true">
                {kitchens[3]?.sellerName.slice(0, 1).toUpperCase() || 'B'}
              </span>
              <div>
                <strong>
                  Khám phá thêm {remainingKitchens} bếp đang mở
                </strong>
                <p>
                  {discoveryNames || 'Nhiều căn bếp quanh bạn'}
                  {remainingKitchens > 3 ? ' và nhiều hơn nữa' : ''}
                </p>
              </div>
            </div>
            <div className="food-discovery-bar__avatars" aria-hidden="true">
              {kitchens.slice(3, 6).map((kitchen, index) => (
                <span
                  key={kitchen.sellerId}
                  className={`food-discovery-bar__dot food-discovery-bar__dot--${index}`}
                >
                  {kitchen.sellerName.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="food-rail-desktop">
        <FoodUtilityRail {...railProps} />
      </div>

      <button
        type="button"
        className="food-cart-fab"
        onClick={() => onCartOpenChange(true)}
        aria-label={`Mở giỏ hàng, ${cartItemCount} món`}
      >
        <img src={FOOD_ASSETS.icons.shoppingBagDark} alt="" width={18} height={18} />
        <span>Giỏ</span>
        {cartItemCount > 0 ? <strong>{cartItemCount}</strong> : null}
      </button>

      {cartOpen ? (
        <div
          className="food-cart-sheet"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cartBusy) {
              onCartOpenChange(false)
            }
          }}
        >
          <div
            className="food-cart-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-mobile-cart-title"
          >
            <div className="food-cart-sheet__grab" aria-hidden="true" />
            <button
              type="button"
              className="food-cart-sheet__close"
              onClick={() => onCartOpenChange(false)}
              disabled={cartBusy}
              aria-label="Đóng giỏ hàng"
            >
              <img src={FOOD_ASSETS.icons.x} alt="" width={14} height={14} />
            </button>
            <span id="food-mobile-cart-title" className="sr-only">
              Giỏ hàng
            </span>
            <FoodUtilityRail {...railProps} compact />
          </div>
        </div>
      ) : null}
    </div>
  )
}
