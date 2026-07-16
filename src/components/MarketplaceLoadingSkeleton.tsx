import type { MarketplaceTab } from '../lib/marketplaceNavigation'
import './MarketplaceLoadingSkeleton.css'

type Props = {
  tab: MarketplaceTab
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

function WalletSkeleton() {
  return (
    <div className="marketplace-skeleton__wallet">
      <SkeletonBlock className="marketplace-skeleton__wallet-balance" />
      <div className="marketplace-skeleton__wallet-row">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    </div>
  )
}

/** Keeps the marketplace layout stable while data for the active tab is loading. */
export function MarketplaceLoadingSkeleton({ tab }: Props) {
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
        <WalletSkeleton />
      ) : isSellerList ? (
        Array.from({ length: 3 }, (_, index) => <SellerSkeleton key={index} />)
      ) : (
        Array.from({ length: count }, (_, index) => <ListingSkeleton key={index} />)
      )}
    </div>
  )
}
