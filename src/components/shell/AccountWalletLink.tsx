import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyWallet } from '../../api'
import { formatPrice } from '../../lib/labels'
import { marketplaceHref } from './navigation'
import { ShellIcon } from './ShellIcons'
import './AccountWalletLink.css'

type BalanceState = { status: 'loading' | 'error' } | { status: 'ready'; balance: number }

/** Mounted afresh each time the account menu opens, so a completed purchase cannot leave a cached balance. */
export function AccountWalletLink({ active, ownerId, onNavigate, itemRole = 'menuitem', className = '' }: {
  active: boolean
  /** The header menu uses menu roles; the phone account sheet is a plain list of links. */
  itemRole?: 'menuitem' | 'none'
  className?: string
  ownerId?: string
  onNavigate: () => void
}) {
  const [result, setResult] = useState<BalanceState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    void getMyWallet().then((wallet) => {
      if (!Number.isFinite(wallet.balance) || (ownerId && wallet.userId !== ownerId)) {
        throw new Error('Invalid wallet response')
      }
      if (!cancelled) setResult({ status: 'ready', balance: wallet.balance })
    }).catch(() => {
      if (!cancelled) setResult({ status: 'error' })
    })
    return () => { cancelled = true }
  }, [active, ownerId, attempt])

  const balance = result.status === 'ready' ? formatPrice(result.balance)
    : result.status === 'loading' ? 'Đang tải…' : 'Chưa tải được'

  return <div className={`hj-account__wallet${className ? ` ${className}` : ''}`} role="presentation">
    <Link to={marketplaceHref('wallet')} role={itemRole === 'none' ? undefined : itemRole}
      className="hj-account__item hj-account__wallet-link"
      aria-label={`Ví tiền. Số dư khả dụng: ${balance}`} title={`Ví tiền. Số dư khả dụng: ${balance}`} onClick={onNavigate}>
      <ShellIcon name="wallet" />
      <span className="hj-account__wallet-copy"><span>Ví tiền</span><small>Số dư khả dụng</small></span>
      <strong className="hj-account__wallet-value" aria-live="polite">{balance}</strong>
    </Link>
    {result.status === 'error' ? <button type="button" role={itemRole === 'none' ? undefined : itemRole}
      className="hj-account__wallet-retry" onClick={() => {
        setResult({ status: 'loading' })
        setAttempt((value) => value + 1)
      }}>Thử tải lại số dư</button> : null}
  </div>
}
