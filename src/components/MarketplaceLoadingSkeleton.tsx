import type { ReactNode } from 'react'
import type { MarketplaceTab } from '../lib/marketplaceNavigation'
import { Sk, SkCard } from './skeletons/Skeleton'
import './MarketplaceLoadingSkeleton.css'

type Props = {
  tab: MarketplaceTab
  walletView?: 'topup' | 'withdraw' | 'history'
}

const MS = 'marketplace-skeleton__'
const cls = (k: string) => `${MS}${k}`
const n = (count: number) => Array.from({ length: count }, (_, i) => i)

function B({ k = '' }: { k?: string }) {
  return <span className={k ? `${MS}block ${cls(k)}` : `${MS}block`} />
}

function L({ v }: { v: 'badge' | 'name' | 'title' | 'price' | 'detail' }) {
  return <B k={`line ${MS}line--${v}`} />
}

function Box({ k, children }: { k: string; children: ReactNode }) {
  return <div className={cls(k)}>{children}</div>
}

export function FoodCatalogSkeleton() {
  return (
    <div className="food-skeleton-grid sk-screen" aria-hidden="true">
      {n(2).map(s => (
        <section key={s} className="food-seller sk-food-seller">
          <header className="food-seller__header">
            <Sk w={44} h={44} r={12} />
            <div className="sk-stack" style={{ gap: 6 }}>
              <Sk w={s === 0 ? 176 : 152} h={16} />
              <Sk w={216} h={11} className="sk-max" />
            </div>
          </header>
          <div className="food-card-grid">
            {n(2).map(d => (
              <div key={d} className="food-skeleton-card sk-card">
                <Sk w={84} h={84} r={10} className="sk-food-card__media" />
                <div className="sk-stack" style={{ gap: 7 }}>
                  <Sk w="78%" h={15} />
                  <Sk w="52%" h={11} />
                  <Sk w="34%" h={14} />
                  <div className="sk-row" style={{ marginTop: 'auto', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <Sk w={74} h={28} r={999} />
                    <Sk w={88} h={34} r={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ListingSkeleton() {
  return (
    <article className={cls('listing')}>
      <B k="thumbnail" />
      <Box k="listing-copy">
        <L v="badge" /><L v="title" /><L v="price" /><L v="detail" />
      </Box>
    </article>
  )
}

function OrderGroupSkeleton() {
  return (
    <article className={cls('order')}>
      <Box k="order-head">
        <B k="avatar" />
        <Box k="listing-copy"><L v="badge" /><L v="title" /><L v="detail" /></Box>
        <B k="order-status" />
      </Box>
      <Box k="order-steps">{n(4).map(i => <B key={i} k="order-step" />)}</Box>
      <Box k="order-summary">{n(2).map(i => <B key={i} k="wallet-field" />)}</Box>
      <Box k="order-item">
        <B k="order-thumb" />
        <Box k="listing-copy"><L v="name" /><L v="detail" /></Box>
        <B k="wallet-amount" />
      </Box>
      <Box k="order-actions">{n(2).map(i => <B key={i} k="order-action" />)}</Box>
    </article>
  )
}

function SellFormSkeleton() {
  return (
    <Box k="sell">
      <Box k="wallet-heading"><L v="badge" /><L v="title" /><L v="detail" /></Box>
      <B k="wallet-field" />
      <B k="sell-textarea" />
      <Box k="wallet-fields">{n(4).map(i => <B key={i} k="wallet-field" />)}</Box>
      <B k="sell-media" />
      <B k="sell-submit" />
    </Box>
  )
}

function WalletFormSkeleton({ view }: { view: 'topup' | 'withdraw' }) {
  const withdraw = view === 'withdraw'
  return (
    <Box k="wallet-panel">
      <Box k="wallet-heading"><L v="title" /><L v="detail" /></Box>
      {!withdraw ? <Box k="wallet-quick-amounts">{n(3).map(i => <B key={i} />)}</Box> : null}
      <Box k="wallet-fields">{n(withdraw ? 4 : 1).map(i => <B key={i} k="wallet-field" />)}</Box>
      <Box k="wallet-actions">{n(withdraw ? 1 : 2).map(i => <B key={i} k="wallet-action" />)}</Box>
      {withdraw ? (
        <Box k="wallet-recent">
          <L v="name" />
          <B k="wallet-recent-row" />
          <B k="wallet-recent-row" />
        </Box>
      ) : null}
    </Box>
  )
}

function WalletHistorySkeleton() {
  return (
    <Box k="wallet-panel">
      <L v="title" />
      <Box k="wallet-history">
        {n(4).map(i => (
          <div className={cls('wallet-transaction')} key={i}>
            <div><L v="name" /><L v="detail" /></div>
            <B k="wallet-amount" />
          </div>
        ))}
      </Box>
    </Box>
  )
}

function WalletSkeleton({ view }: { view: NonNullable<Props['walletView']> }) {
  return (
    <Box k="wallet">
      <Box k="wallet-overview">
        <Box k="wallet-summary">
          <L v="badge" />
          <B k="wallet-balance" />
          <L v="detail" />
          <Box k="wallet-stats"><B /><B /></Box>
        </Box>
      </Box>
      <Box k="wallet-workspace">
        <Box k="wallet-tabs">{n(3).map(i => <B key={i} />)}</Box>
        {view === 'history' ? <WalletHistorySkeleton /> : <WalletFormSkeleton view={view} />}
      </Box>
    </Box>
  )
}

/** Keeps the marketplace layout stable while data for the active tab is loading. */
export function MarketplaceLoadingSkeleton({ tab, walletView = 'topup' }: Props) {
  return (
    <div
      className={`marketplace-skeleton marketplace-loading-skeleton marketplace-skeleton--${tab}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only sk-sr">Đang tải nội dung Chợ Homeji…</span>
      {tab === 'wallet' ? (
        <WalletSkeleton view={walletView} />
      ) : tab === 'browse' ? (
        <div className="marketplace-list marketplace-list--grid sk-screen">
          {n(6).map(i => (
            <SkCard key={i} style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
              <Sk h={148} r={0} />
              <div className="sk-stack" style={{ padding: 12 }}>
                <Sk w={70} h={18} r={999} />
                <Sk w="80%" h={15} />
                <Sk w={110} h={18} />
                <Sk w="60%" h={10} />
              </div>
            </SkCard>
          ))}
        </div>
      ) : tab === 'food' ? (
        <FoodCatalogSkeleton />
      ) : tab === 'sell' ? (
        <SellFormSkeleton />
      ) : tab === 'purchases' || tab === 'sales' ? (
        n(2).map(i => <OrderGroupSkeleton key={i} />)
      ) : (
        n(3).map(i => <ListingSkeleton key={i} />)
      )}
    </div>
  )
}
