import { FOOD_ASSETS, ESTIMATED_DELIVERY_FEE } from './foodAssets'
import { QuantityStepper } from './QuantityStepper'
import { formatPrice } from '../../../lib/labels'

export type FoodCartLine = {
  postId: string
  sellerName: string
  title: string
  price: number
  quantity: number
  availableQuantity: number
  imageUrl: string | null
}

export type NearbyKitchen = {
  sellerId: string
  sellerName: string
  address: string
  distanceKm: number | null
  preparationMinutes: number | null
  postsCount: number
  categoryHint?: string
}

type Props = {
  kitchens: NearbyKitchen[]
  cartItems: FoodCartLine[]
  cartItemCount: number
  cartTotal: number
  cartBusy: boolean
  cartNote: string
  locating: boolean
  hasUserLocation: boolean
  locationLabel: string
  locationSecondary: string
  minimumCartTotal: number
  estimatedEtaLabel: string
  onCartNoteChange: (value: string) => void
  onRequestLocation?: () => void
  onUpdateCartQuantity: (postId: string, quantity: number) => void
  onRemoveCartItem: (postId: string) => void
  onClearCart: () => void
  onCheckout: () => void
  onSelectKitchen?: (sellerId: string) => void
  compact?: boolean
}

function formatKitchenDistance(distanceKm: number | null): string {
  if (distanceKm == null) return '—'
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(distanceKm)} km`
}

export function FoodUtilityRail({
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
  estimatedEtaLabel,
  onCartNoteChange,
  onRequestLocation,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  onCheckout,
  onSelectKitchen,
  compact = false,
}: Props) {
  const deliveryFee = cartItems.length > 0 ? ESTIMATED_DELIVERY_FEE : 0
  const grandTotal = cartTotal + deliveryFee
  const canCheckout =
    !cartBusy && cartItems.length > 0 && cartTotal >= minimumCartTotal

  return (
    <aside
      className={`food-rail${compact ? ' food-rail--compact' : ''}`}
      aria-label="Vị trí, bếp gần và giỏ hàng"
    >
      <section className="food-rail__location" aria-labelledby="food-rail-location-title">
        <div className="food-rail__location-head">
          <h2 id="food-rail-location-title">Giao đến đâu?</h2>
          <button
            type="button"
            className="food-rail__locate"
            disabled={locating || !onRequestLocation}
            onClick={onRequestLocation}
          >
            <img src={FOOD_ASSETS.icons.locate} alt="" width={14} height={14} />
            {locating ? 'Đang lấy…' : 'Định vị tôi'}
          </button>
        </div>

        <button type="button" className="food-rail__address" disabled>
          <img src={FOOD_ASSETS.icons.mapPin} alt="" width={17} height={17} />
          <span className="food-rail__address-copy">
            <strong>{locationLabel}</strong>
            <small>{locationSecondary}</small>
          </span>
          <img src={FOOD_ASSETS.icons.chevronDown} alt="" width={14} height={14} />
        </button>

        <div className="food-rail__sort">
          <span>Sắp xếp</span>
          <span className="food-rail__sort-value">
            <img src={FOOD_ASSETS.icons.navigation} alt="" width={13} height={13} />
            {hasUserLocation ? 'Gần nhất trước' : 'Theo mới nhất'}
          </span>
        </div>
      </section>

      <section className="food-rail__kitchens" aria-labelledby="food-rail-kitchens-title">
        <div className="food-rail__kitchens-head">
          <h3 id="food-rail-kitchens-title">Bếp đang mở gần bạn</h3>
          <span>{kitchens.length} bếp</span>
        </div>
        <ul className="food-rail__kitchen-list">
          {kitchens.slice(0, 4).map((kitchen) => (
            <li key={kitchen.sellerId}>
              <button
                type="button"
                className="food-rail__kitchen-row"
                onClick={() => onSelectKitchen?.(kitchen.sellerId)}
              >
                <span className="food-rail__kitchen-avatar" aria-hidden="true">
                  {kitchen.sellerName.slice(0, 1).toUpperCase()}
                </span>
                <span className="food-rail__kitchen-info">
                  <strong>{kitchen.sellerName}</strong>
                  <small>
                    {kitchen.categoryHint || 'Cơm nhà'}
                    {kitchen.preparationMinutes
                      ? ` · từ ${kitchen.preparationMinutes} phút`
                      : ''}
                  </small>
                </span>
                <span className="food-rail__kitchen-dist">
                  {formatKitchenDistance(kitchen.distanceKm)}
                </span>
              </button>
            </li>
          ))}
          {kitchens.length === 0 ? (
            <li className="food-rail__empty-kitchens">Chưa có bếp gần bạn.</li>
          ) : null}
        </ul>
      </section>

      <section className="food-rail__cart" aria-labelledby="food-rail-cart-title">
        <header className="food-rail__cart-head">
          <div className="food-rail__cart-title">
            <img src={FOOD_ASSETS.icons.shoppingBagDark} alt="" width={18} height={18} />
            <h2 id="food-rail-cart-title">Giỏ hàng</h2>
            {cartItemCount > 0 ? (
              <span className="food-rail__cart-count" aria-label={`${cartItemCount} món`}>
                {cartItemCount}
              </span>
            ) : null}
          </div>
          {cartItems.length > 0 ? (
            <button
              type="button"
              className="food-rail__clear"
              disabled={cartBusy}
              onClick={onClearCart}
            >
              Xóa hết
            </button>
          ) : null}
        </header>

        {cartItems.length === 0 ? (
          <div className="food-rail__cart-empty">
            <strong>Giỏ đang trống</strong>
            <p>Chọn món từ một bếp để bắt đầu đặt hàng.</p>
          </div>
        ) : (
          <ul className="food-rail__cart-list">
            {cartItems.map((item) => (
              <li key={item.postId} className="food-rail__cart-item">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="food-rail__cart-thumb" />
                ) : (
                  <span className="food-rail__cart-thumb food-rail__cart-thumb--empty" aria-hidden="true">
                    H
                  </span>
                )}
                <div className="food-rail__cart-details">
                  <div className="food-rail__cart-item-head">
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.sellerName}</small>
                    </div>
                    <button
                      type="button"
                      className="food-rail__remove"
                      aria-label={`Xóa ${item.title}`}
                      disabled={cartBusy}
                      onClick={() => onRemoveCartItem(item.postId)}
                    >
                      <img src={FOOD_ASSETS.icons.x} alt="" width={14} height={14} />
                    </button>
                  </div>
                  <div className="food-rail__cart-item-foot">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.availableQuantity}
                      disabled={cartBusy}
                      label={`Số lượng ${item.title}`}
                      onChange={(next) => onUpdateCartQuantity(item.postId, next)}
                    />
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <label className="food-rail__note">
          <img src={FOOD_ASSETS.icons.messageSquare} alt="" width={14} height={14} />
          <input
            type="text"
            value={cartNote}
            onChange={(event) => onCartNoteChange(event.target.value)}
            placeholder="Thêm ghi chú cho các bếp..."
            aria-label="Ghi chú cho bếp"
            disabled={cartBusy}
          />
        </label>

        <div className="food-rail__plan">
          <div className="food-rail__plan-title">
            <img src={FOOD_ASSETS.icons.bike} alt="" width={15} height={15} />
            <strong>Gom món, giao một lượt</strong>
          </div>
          <p>Homeji phối hợp các bếp để món đến cùng lúc, nóng và gọn hơn.</p>
        </div>

        <footer className="food-rail__footer">
          <div className="food-rail__summary">
            <div>
              <span>Tạm tính</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>
            <div>
              <span>Phí giao dự kiến</span>
              <strong>{formatPrice(deliveryFee)}</strong>
            </div>
            <div className="food-rail__total">
              <span>Tổng cộng</span>
              <b>{formatPrice(grandTotal)}</b>
            </div>
          </div>

          {cartItems.length > 0 && cartTotal < minimumCartTotal ? (
            <p className="food-rail__min-hint" role="status">
              Thêm {formatPrice(minimumCartTotal - cartTotal)} để đạt đơn tối thiểu{' '}
              {formatPrice(minimumCartTotal)}.
            </p>
          ) : null}

          <button
            type="button"
            className="food-rail__checkout"
            disabled={!canCheckout}
            onClick={onCheckout}
          >
            <img src={FOOD_ASSETS.icons.arrowRight} alt="" width={16} height={16} />
            {cartBusy
              ? 'Đang đặt món…'
              : `Đặt món · giao ${estimatedEtaLabel}`}
          </button>
        </footer>
      </section>
    </aside>
  )
}
