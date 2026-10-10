import { primaryOf, type MarketplacePrimary, type MarketplaceTab } from '../../lib/marketplaceNavigation'
import { formatAvailableBalance } from '../../lib/walletMoney'
import { MotionTabs } from '../motion/MotionTabs'
import './MarketplaceHeader.css'

const HEADLINES: Record<MarketplaceTab, { eyebrow: string; title: string }> = {
  food: {
    eyebrow: 'Bữa ăn quanh nhà',
    title: 'Bữa ngon, tử tế từ căn bếp quanh nhà.',
  },
  browse: {
    eyebrow: 'Chợ đồ quanh khu phố',
    title: 'Đồ tử tế, giá vừa túi, gần ngay bạn.',
  },
  purchases: {
    eyebrow: 'Đơn mua',
    title: 'Theo dõi đơn đồ ăn và đồ dùng.',
  },
  mine: {
    eyebrow: 'Gian hàng của bạn',
    title: 'Tin đã đăng, rõ ràng và dễ quản lý.',
  },
  sell: {
    eyebrow: 'Chia sẻ món ngon & đồ tốt',
    title: 'Đăng bán nhanh, người gần nhà tìm thấy.',
  },
  sales: {
    eyebrow: 'Quản lý cửa hàng',
    title: 'Theo dõi đơn bán, xác nhận và giao hàng.',
  },
  wallet: {
    eyebrow: 'Số dư Homeji',
    title: 'Ví Homeji, rõ ràng từng khoản.',
  },
}

const PRIMARY_TABS: { id: MarketplacePrimary; label: string }[] = [
  { id: 'shopping', label: 'Mua sắm' },
  { id: 'purchases', label: 'Đơn mua' },
  { id: 'shop', label: 'Quản lý cửa hàng' },
  { id: 'wallet', label: 'Số dư' },
]

const SHOPPING_TABS: { id: MarketplaceTab; label: string }[] = [
  { id: 'food', label: 'Đồ ăn' },
  { id: 'browse', label: 'Chợ đồ' },
]

const SHOP_TABS: { id: MarketplaceTab; label: string }[] = [
  { id: 'mine', label: 'Tin của tôi' },
  { id: 'sell', label: 'Đăng bán' },
  { id: 'sales', label: 'Đơn bán' },
]

export type WalletHeaderStatus = 'loading' | 'ready' | 'error'

type Props = {
  tab: MarketplaceTab
  availableBalance: number | null
  walletStatus: WalletHeaderStatus
  sellerActionCount: number
  onTabChange: (tab: MarketplaceTab) => void
  onOpenSell: () => void
  onTopUp: () => void
}

export function MarketplaceHeader({
  tab,
  availableBalance,
  walletStatus,
  sellerActionCount,
  onTabChange,
  onOpenSell,
  onTopUp,
}: Props) {
  const headline = HEADLINES[tab]
  const primary = primaryOf(tab)
  const subTabs = primary === 'shopping' ? SHOPPING_TABS : primary === 'shop' ? SHOP_TABS : null

  const openPrimary = (id: MarketplacePrimary) => {
    if (id === 'shopping') {
      if (primary !== 'shopping') onTabChange('food')
    } else if (id === 'purchases') onTabChange('purchases')
    else if (id === 'shop') {
      if (primary !== 'shop') onTabChange('mine')
    } else onTabChange('wallet')
  }

  return (
    <header className="marketplace-header">
      <div className="marketplace-header__summary">
        <div className="marketplace-header__title-group">
          <p className="marketplace-header__eyebrow">{headline.eyebrow}</p>
          <h1 className="marketplace-header__title">{headline.title}</h1>
        </div>
        <div className="marketplace-header__utilities">
          <PersistentWalletBalance
            availableBalance={availableBalance}
            status={walletStatus}
            onTopUp={onTopUp}
          />
          {tab !== 'wallet' ? (
            <>
              <span className="marketplace-header__utilities-divider" aria-hidden="true" />
              <button type="button" className="marketplace-header__primary" onClick={onOpenSell}>
                Đăng bán
              </button>
            </>
          ) : null}
        </div>
      </div>

      <MotionTabs items={PRIMARY_TABS} value={primary} onChange={openPrimary} label="Chợ Homeji"
        className="marketplace-header__tabs" buttonClassName="marketplace-header__tab"
        idPrefix="marketplace-primary" panelId="marketplace-panel" />

      {subTabs ? (
        <div className="marketplace-header__subtabs">
          <MotionTabs items={subTabs} value={tab} onChange={onTabChange}
            label={primary === 'shopping' ? 'Mua sắm' : 'Quản lý cửa hàng'}
            className="marketplace-header__subtabs-group" buttonClassName="marketplace-header__subtab"
            idPrefix="marketplace-subtab" panelId="marketplace-panel" renderLabel={(id, label) => <>
              {label}
              {id === 'sales' && sellerActionCount > 0 ? <span className="marketplace-header__alert" aria-label={`${sellerActionCount} đơn cần xử lý`}>{sellerActionCount}</span> : null}
            </>} />
          {primary === 'shopping' && tab === 'browse' ? (
            <p className="marketplace-header__subhint">Đơn bán thuộc Quản lý cửa hàng</p>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

function PersistentWalletBalance({
  availableBalance,
  status,
  onTopUp,
}: {
  availableBalance: number | null
  status: WalletHeaderStatus
  onTopUp: () => void
}) {
  const showAmount = status === 'ready' && availableBalance != null
  return (
    <div className="marketplace-header__wallet" aria-live="polite">
      {status === 'loading' ? (
        <span className="marketplace-header__wallet-skeleton" aria-label="Đang tải số dư" />
      ) : (
        <>
          <span className="marketplace-header__wallet-label">Ví Homeji</span>
          {showAmount ? (
            <strong className="marketplace-header__wallet-amount">
              {formatAvailableBalance(availableBalance)}
            </strong>
          ) : (
            <strong className="marketplace-header__wallet-error">Không thể tải số dư</strong>
          )}
          <button type="button" className="marketplace-header__topup" onClick={onTopUp}>
            Nạp tiền
          </button>
        </>
      )}
    </div>
  )
}
