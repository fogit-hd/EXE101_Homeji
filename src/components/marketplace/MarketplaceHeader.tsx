import type { PointerEvent, ReactNode, RefCallback } from 'react'
import { primaryOf, type MarketplacePrimary, type MarketplaceTab } from '../../lib/marketplaceNavigation'
import { formatAvailableBalance } from '../../lib/walletMoney'
import { SegmentedTabs } from '../motion/SegmentedTabs'
import { MotionTabs } from '../motion/MotionTabs'
import { GameLauncher } from '../games/GameLauncher'
import { useIsMobile } from '../../mobile/useIsMobile'
import { MobileTabs } from '../../mobile/MobileTabs'
import '../../mobile/market/mobile-market.css'
import './MarketplaceHeader.css'

const HEADLINES: Record<MarketplaceTab, { eyebrow: string; title: string }> = {
  food: {
    eyebrow: 'Chợ Homeji',
    title: 'Chợ Homeji',
  },
  browse: {
    eyebrow: 'Chợ Homeji',
    title: 'Đồ cũ quanh bạn',
  },
  purchases: {
    eyebrow: 'Đơn mua',
    title: 'Đơn đồ ăn và đồ cũ',
  },
  mine: {
    eyebrow: 'Cửa hàng',
    title: 'Tin của tôi',
  },
  sell: {
    eyebrow: 'Cửa hàng',
    title: 'Đăng bán',
  },
  sales: {
    eyebrow: 'Cửa hàng',
    title: 'Đơn bán',
  },
  wallet: {
    eyebrow: 'Tài khoản của bạn',
    title: 'Ví Homeji',
  },
}

const PRIMARY_TABS: { id: MarketplacePrimary; label: string }[] = [
  { id: 'shopping', label: 'Mua sắm' },
  { id: 'purchases', label: 'Đơn mua' },
  { id: 'shop', label: 'Cửa hàng' },
  { id: 'wallet', label: 'Ví Homeji' },
]

const MOBILE_PRIMARY_TABS = PRIMARY_TABS.map(item => item.id === 'wallet' ? { ...item, label: 'Ví' } : item)

const SHOPPING_TABS:{ id: MarketplaceTab; label: string }[] = [
  { id: 'food', label: 'Đồ ăn' },
  { id: 'browse', label: 'Đồ cũ' },
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
  /** Trailing filter control, outside the scroller so its panel remains unclipped. */
  subtabsExtra?: ReactNode
  quickControls?: ReactNode
  quickControlsRef?: RefCallback<HTMLDivElement>
}

function reflectUtilityAction(event: PointerEvent<HTMLButtonElement>) {
  const button = event.currentTarget
  const face = button.getBoundingClientRect()
  if (face.width) button.style.setProperty('--utility-light-x', `${Math.max(8, Math.min(92, (event.clientX - face.left) / face.width * 100))}%`)
}

export function MarketplaceHeader({
  tab,
  availableBalance,
  walletStatus,
  sellerActionCount,
  onTabChange,
  onOpenSell,
  onTopUp,
  subtabsExtra,
  quickControlsRef,
  quickControls,
}: Props) {
  const mobile = useIsMobile()
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

  if (mobile) {
    // The app header already names the page and the account sheet shows the balance, so phones get
    // only the tabs: one row of sections, then the sub-section row.
    return (
      <header className="m-market-head">
        <MobileTabs items={MOBILE_PRIMARY_TABS} value={primary} onChange={openPrimary} label="Chợ Homeji"
          idPrefix="marketplace-primary" panelId="marketplace-panel" />
        {primary === 'shopping' ? (
          <>
            <div className="m-market-head__row">
              <MobileTabs items={SHOPPING_TABS} value={tab} onChange={onTabChange} label="Mua sắm"
                idPrefix="marketplace-subtab" panelId="marketplace-panel" className="m-seg m-seg--compact" />
              {subtabsExtra}
            </div>
            <div ref={quickControlsRef} className="m-market-head__quick">{quickControls}</div>
          </>
        ) : primary === 'shop' ? (
          <MobileTabs items={SHOP_TABS} value={tab} onChange={onTabChange} label="Cửa hàng"
            idPrefix="marketplace-subtab" panelId="marketplace-panel" className="m-chips m-market-head__subtabs" buttonClassName="m-chip"
            renderLabel={(id, label) => <>
              {label}
              {id === 'sales' && sellerActionCount > 0 ? <span className="m-chip__count" aria-label={`${sellerActionCount} đơn cần xử lý`}>{sellerActionCount}</span> : null}
            </>} />
        ) : null}
      </header>
    )
  }

  return (
    <header className={`marketplace-header${tab === 'wallet' ? ' marketplace-header--wallet' : ''}`}>
      <div className="marketplace-header__summary">
        <div className="marketplace-header__title-group">
          <h1 className="marketplace-header__title">{headline.title}</h1>
        </div>
        <div className="marketplace-header__utilities">
          <PersistentWalletBalance availableBalance={availableBalance} status={walletStatus}
            onOpen={tab === 'wallet' || walletStatus === 'loading' ? undefined : onTopUp} />
          <div className="marketplace-header__utility-actions">
            <GameLauncher className="marketplace-header__utility-action marketplace-header__game" />
            {tab !== 'wallet' ? (
              <button type="button" className="marketplace-header__primary marketplace-header__utility-action"
                onPointerMove={reflectUtilityAction} onClick={onOpenSell}>
                Đăng bán
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <MotionTabs items={PRIMARY_TABS} value={primary} onChange={openPrimary} label="Chợ Homeji"
        webglGlass={false} className="marketplace-header__tabs" buttonClassName="marketplace-header__tab"
        idPrefix="marketplace-primary" panelId="marketplace-panel" />

      {subTabs ? (
        <div className="marketplace-header__subtabs">
          {primary === 'shopping' ? (
            <div className="marketplace-header__subtabs-lead">
              <div className="marketplace-header__shopping-scroll">
                <SegmentedTabs items={SHOPPING_TABS} value={tab} onChange={onTabChange} label="Mua sắm"
                  className="marketplace-header__subtabs-group" idPrefix="marketplace-subtab" panelId="marketplace-panel" />
              </div>
              <div className="marketplace-header__shopping-filters">
                <div ref={quickControlsRef} className="marketplace-header__quick-controls">{quickControls}</div>
                {subtabsExtra}
              </div>
            </div>
          ) : (
          <MotionTabs items={subTabs} value={tab} onChange={onTabChange}
            label="Cửa hàng"
            className="marketplace-header__subtabs-group" buttonClassName="marketplace-header__subtab"
            idPrefix="marketplace-subtab" panelId="marketplace-panel" renderLabel={(id, label) => <>
              {label}
              {id === 'sales' && sellerActionCount > 0 ? <span className="marketplace-header__alert" aria-label={`${sellerActionCount} đơn cần xử lý`}>{sellerActionCount}</span> : null}
            </>} />
          )}
        </div>
      ) : null}
    </header>
  )
}

function PersistentWalletBalance({
  availableBalance,
  status,
  onOpen,
}: {
  availableBalance: number | null
  status: WalletHeaderStatus
  onOpen?: () => void
}) {
  const showAmount = status === 'ready' && availableBalance != null
  const Tag = onOpen ? 'button' : 'div'
  return (
    <Tag className={`marketplace-header__wallet${onOpen ? ' is-link' : ''}`} aria-live="polite"
      {...(onOpen ? { type: 'button' as const, onClick: onOpen, title: 'Nạp tiền vào ví' } : {})}>
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
        </>
      )}
    </Tag>
  )
}
