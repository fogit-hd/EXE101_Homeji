import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { attachPointerSpot } from '../../motion/pointerSpot'
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
  sellerGroups: (Omit<NearbyKitchen, 'postsCount'> & { posts: MarketplacePost[] })[]
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
  onRetry: () => void
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
  if (distanceKm == null) return 'Chưa rõ khoảng cách'
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
  sellerGroups,
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
  onRetry,
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
  const cartDialogRef = useRef<HTMLDialogElement>(null)
  // Dot cards: the hovered card lights the dots under the pointer.
  const dotSpotRef = useCallback((node: HTMLDivElement | null) => node ? attachPointerSpot(node, '.food-card') : undefined, [])
  const cartTitleId = useId()
  const cartDialogId = useId()
  useLayoutEffect(() => {
    const dialog = cartDialogRef.current
    if (!dialog || !cartOpen) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    dialog.scrollTop = 0
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [cartOpen])
  const etaLabel = estimatedEtaFromCart(cartItems, posts)
  const remainingKitchens = Math.max(0, kitchens.length - 3)
  const discoveryNames = kitchens
    .slice(3, 6)
    .map((k) => k.sellerName)
    .join(', ')

  const [mealCategory, setMealCategory] = useState<string>('all')
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0)

  const MEAL_TABS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'lunch', label: 'Trưa nay ăn gì?' },
    { id: 'snack', label: 'Ăn vặt chiều' },
    { id: 'late', label: 'Ăn khuya' },
    { id: 'drink', label: 'Đồ uống & Trà sữa' },
  ]

  const DISTANCE_OPTIONS = [
    { value: 0, label: 'Mọi khoảng cách' },
    { value: 0.5, label: '< 500m (Đi bộ)' },
    { value: 1.5, label: '< 1.5 km' },
  ]

  const filteredSellerGroups = useMemo(() => {
    return sellerGroups.map((seller) => {
      if (maxDistanceKm > 0 && seller.distanceKm != null && seller.distanceKm > maxDistanceKm) {
        return null
      }
      const matchingPosts = seller.posts.filter((post) => {
        if (mealCategory === 'all') return true
        const cat = (post.category || '').toLowerCase()
        const title = (post.title || '').toLowerCase()
        if (mealCategory === 'lunch') {
          return cat.includes('cơm') || cat.includes('bún') || cat.includes('phở') || cat.includes('chay') || title.includes('cơm') || title.includes('bún')
        }
        if (mealCategory === 'snack') {
          return cat.includes('vặt') || cat.includes('bánh mì') || cat.includes('xôi') || cat.includes('fastfood')
        }
        if (mealCategory === 'late') {
          return cat.includes('khuya') || cat.includes('bún') || cat.includes('bánh mì') || cat.includes('vặt')
        }
        if (mealCategory === 'drink') {
          return cat.includes('uống') || cat.includes('trà') || cat.includes('nước') || cat.includes('tráng miệng')
        }
        return true
      })
      if (matchingPosts.length === 0) return null
      return { ...seller, posts: matchingPosts }
    }).filter(Boolean) as (Omit<NearbyKitchen, 'postsCount'> & { posts: MarketplacePost[] })[]
  }, [sellerGroups, mealCategory, maxDistanceKm])

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
        {/* Bộ lọc bữa ăn sinh viên & khoảng cách */}
        <div className="food-meal-filter-bar" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="tablist" aria-label="Bộ lọc bữa ăn">
            {MEAL_TABS.map((tab) => {
              const active = mealCategory === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMealCategory(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: active ? 600 : 500,
                    border: active ? '1px solid var(--grab-green, #24543e)' : '1px solid #dbe2de',
                    background: active ? 'var(--grab-green, #24543e)' : '#fff',
                    color: active ? '#fff' : '#24382d',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#526358' }}>Bán kính:</span>
            <select
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value) || 0)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid #dbe2de',
                fontSize: '0.8rem',
                background: '#fff',
                color: '#24382d',
                cursor: 'pointer',
              }}
              aria-label="Lọc theo khoảng cách"
            >
              {DISTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="food-nearby-head">
          <div>
            <h2>Chọn quán, chọn món</h2>
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
            <button type="button" className="btn btn-secondary" onClick={onRetry}>Tải lại danh sách món</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="food-catalog__state" role="status">
            <strong>Chưa có món ăn đang bán quanh đây</strong>
            <p>Thử đổi bộ lọc, từ khóa, hoặc bật định vị để xem bếp gần bạn.</p>
          </div>
        ) : (
          <div ref={dotSpotRef} className="food-seller-list">
            {filteredSellerGroups.length === 0 ? (
              <div className="food-catalog__state" role="status">
                <strong>Không có món phù hợp bộ lọc bữa ăn đã chọn</strong>
                <p>Hãy thử chọn &quot;Tất cả&quot; hoặc đổi khoảng cách tìm kiếm.</p>
              </div>
            ) : (
              filteredSellerGroups.map((seller) => (
                <section key={seller.sellerId} className="food-seller" aria-label={`Thực đơn ${seller.sellerName}`}>
                  <header className="food-seller__header">
                    <span className="food-seller__avatar" aria-hidden="true">
                      {seller.sellerName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="food-seller__info">
                      <h3>{seller.sellerName}</h3>
                      <p>{seller.posts.length} món · {seller.distanceKm == null
                        ? locating ? 'Đang định vị…' : hasUserLocation ? 'Chưa rõ khoảng cách' : 'Chưa có vị trí'
                        : formatDistanceMeters(seller.distanceKm)}</p>
                      {seller.address ? <p>{seller.address}</p> : null}
                    </div>
                  </header>
                  <div className="food-card-grid">
                    {seller.posts.map((post) => (
                      <FoodCard
                        key={post.id}
                        post={post}
                        quantity={quantities[post.id] ?? 1}
                        inCart={cartItems.some((item) => item.postId === post.id)}
                        onQuantityChange={(next) => onQuantityChange(post.id, next)}
                        onAddToCart={() => onAddToCart(post)}
                        onShowOnMap={() => onShowOnMap(post)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        <FoodSourceDirectory />

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
        data-glass-exclude
        onClick={() => onCartOpenChange(true)}
        aria-label={`Mở giỏ hàng, ${cartItemCount} món, ${formatPrice(cartTotal)}`}
        aria-haspopup="dialog"
        aria-expanded={cartOpen}
        aria-controls={cartDialogId}
      >
        <img src={FOOD_ASSETS.icons.shoppingBagDark} alt="" width={18} height={18} />
        <span>{cartItemCount > 0 ? `Xem giỏ · ${formatPrice(cartTotal)}` : 'Giỏ hàng'}</span>
        {cartItemCount > 0 ? <strong>{cartItemCount}</strong> : null}
      </button>

      <dialog
        ref={cartDialogRef}
        id={cartDialogId}
        className="food-cart-sheet__panel"
        data-glass-exclude=""
        aria-labelledby={cartTitleId}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key !== 'Tab') return
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          )).filter(element => element.getClientRects().length > 0
            && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert]'))
          event.preventDefault()
          if (!controls.length) { event.currentTarget.focus(); return }
          const current = controls.indexOf(document.activeElement as HTMLElement)
          const next = event.shiftKey ? (current <= 0 ? controls.length - 1 : current - 1) : (current + 1) % controls.length
          controls[next].focus()
        }}
        onCancel={event => {
          event.preventDefault()
          if (!cartBusy) onCartOpenChange(false)
        }}
        onClick={event => {
          if (event.target !== event.currentTarget || cartBusy) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCartOpenChange(false)
        }}
      >
            <div className="food-cart-sheet__grab" aria-hidden="true" />
            <button
              type="button"
              className="food-cart-sheet__close"
              data-glass-exclude=""
              onClick={() => onCartOpenChange(false)}
              disabled={cartBusy}
              aria-label="Đóng giỏ hàng"
            >
              <img src={FOOD_ASSETS.icons.x} alt="" width={14} height={14} />
            </button>
            <span id={cartTitleId} className="sr-only">
              Giỏ hàng
            </span>
            <FoodUtilityRail {...railProps} compact />
      </dialog>

      {/* Thanh Giỏ Hàng Dính Đáy (Sticky Floating Cart Bar) */}
      {cartItemCount > 0 && !cartOpen ? (
        <aside
          className="food-sticky-floating-cart"
          data-glass-exclude
          aria-label="Giỏ hàng đã chọn món"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                {cartItemCount} món · {formatPrice(cartTotal)}
              </span>
            </div>
            <small style={{ fontSize: '0.74rem', opacity: 0.9, display: 'block', marginTop: '2px' }}>
              {cartTotal < minimumCartTotal
                ? `Thêm ${formatPrice(minimumCartTotal - cartTotal)} để đạt đơn tối thiểu 25k`
                : '✓ Đạt đơn tối thiểu · Sẵn sàng đặt món'}
            </small>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              background: '#fff',
              color: '#24543e',
              fontWeight: 700,
              fontSize: '0.84rem',
              borderRadius: '20px',
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => onCartOpenChange(true)}
          >
            Xem giỏ & Thanh toán →
          </button>
        </aside>
      ) : null}
    </div>
  )
}
