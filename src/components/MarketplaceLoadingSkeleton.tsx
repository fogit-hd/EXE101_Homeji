import type { MarketplaceTab } from '../lib/marketplaceNavigation'
import './MarketplaceLoadingSkeleton.css'

type Props = {
  tab: MarketplaceTab
  walletView?: 'topup' | 'withdraw' | 'history'
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span className={`marketplace-skeleton__block ${className}`.trim()} />
}

function SellerSkeleton() {
  return (
    <article className="marketplace-skeleton__seller">
      <SkeletonBlock className="marketplace-skeleton__avatar" />
      <div className="marketplace-skeleton__seller-copy">
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--eyebrow" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--name" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--address" />
      </div>
      <SkeletonBlock className="marketplace-skeleton__pill" />
      <SkeletonBlock className="marketplace-skeleton__chevron" />
    </article>
  )
}

function ListingSkeleton() {
  return (
    <article className="marketplace-skeleton__listing">
      <SkeletonBlock className="marketplace-skeleton__thumbnail" />
      <div className="marketplace-skeleton__listing-copy">
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--badge" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--title" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--price" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--detail" />
      </div>
    </article>
  )
}

function WalletFormSkeleton({ view }: { view: 'topup' | 'withdraw' }) {
  const fieldCount = view === 'withdraw' ? 4 : 1
  const actionCount = view === 'topup' ? 2 : 1

  return (
    <div className="marketplace-skeleton__wallet-panel">
      <div className="marketplace-skeleton__wallet-heading">
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--title" />
        <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--detail" />
      </div>
      {view === 'topup' ? (
        <div className="marketplace-skeleton__wallet-quick-amounts">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      ) : null}
      <div className="marketplace-skeleton__wallet-fields">
        {Array.from({ length: fieldCount }, (_, index) => (
          <SkeletonBlock key={index} className="marketplace-skeleton__wallet-field" />
        ))}
      </div>
      <div className="marketplace-skeleton__wallet-actions">
        {Array.from({ length: actionCount }, (_, index) => (
          <SkeletonBlock key={index} className="marketplace-skeleton__wallet-action" />
        ))}
      </div>
      {view === 'withdraw' ? (
        <div className="marketplace-skeleton__wallet-recent">
          <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--name" />
          <SkeletonBlock className="marketplace-skeleton__wallet-recent-row" />
          <SkeletonBlock className="marketplace-skeleton__wallet-recent-row" />
        </div>
      ) : null}
    </div>
  )
}

function WalletHistorySkeleton() {
  return (
    <div className="marketplace-skeleton__wallet-panel">
      <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--title" />
      <div className="marketplace-skeleton__wallet-history">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="marketplace-skeleton__wallet-transaction" key={index}>
            <div>
              <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--name" />
              <SkeletonBlock className="marketplace-skeleton__line marketplace-skeleton__line--detail" />
            </div>
            <SkeletonBlock className="marketplace-skeleton__wallet-amount" />
          </div>
        ))}
      </div>
    </div>
  )
}

function WalletSkeleton({ view }: { view: NonNullable<Props['walletView']> }) {
  return (
    <div className="marketplace-skeleton__wallet">
      <div className="marketplace-skeleton__wallet-summary">
        <SkeletonBlock className="marketplace-skeleton__wallet-balance" />
        <div className="marketplace-skeleton__wallet-stats">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
      <div className="marketplace-skeleton__wallet-tabs">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      {view === 'history' ? <WalletHistorySkeleton /> : <WalletFormSkeleton view={view} />}
    </div>
  )
}

/** Keeps the marketplace layout stable while data for the active tab is loading. */
export function MarketplaceLoadingSkeleton({ tab, walletView = 'topup' }: Props) {
  const isSellerList = tab === 'food'
  const isWallet = tab === 'wallet'
  const count = tab === 'orders' ? 2 : 4

  return (
    <div
      className={`marketplace-skeleton marketplace-skeleton--${tab}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải nội dung Chợ Homeji…</span>
      {isWallet ? (
        <WalletSkeleton view={walletView} />
      ) : isSellerList ? (
        Array.from({ length: 3 }, (_, index) => <SellerSkeleton key={index} />)
      ) : (
        Array.from({ length: count }, (_, index) => <ListingSkeleton key={index} />)
      )}
    </div>
  )
}
