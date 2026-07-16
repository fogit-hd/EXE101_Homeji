import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyWallet, type Wallet } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice } from '../../lib/labels'
import { requestMarketplaceTab } from '../../lib/marketplaceNavigation'
import './MapMotion.css'
import './MapAccountMenu.css'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

type Props = {
  onOpenProfile?: () => void
}

export function MapAccountMenu({ onOpenProfile }: Props) {
  const { profile, email, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletUnavailable, setWalletUnavailable] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    let active = true
    void getMyWallet()
      .then((nextWallet) => {
        if (!active) return
        setWallet(nextWallet)
      })
      .catch(() => {
        if (!active) return
        setWalletUnavailable(true)
      })
      .finally(() => {
        if (active) setWalletLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  const name = profile?.displayName?.trim() || 'Tài khoản'
  const initials = initialsFromName(name)
  const planTag = profile?.isPremium ? 'Premium' : 'Standard'
  const planTone = profile?.isPremium ? 'premium' : 'standard'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  const handleToggleMenu = () => {
    const nextOpen = !open
    if (nextOpen) {
      setWalletLoading(true)
      setWalletUnavailable(false)
    }
    setOpen(nextOpen)
  }

  const handleOpenWallet = () => {
    setOpen(false)
    requestMarketplaceTab('wallet')
    navigate('/?section=marketplace')
  }

  return (
    <div className="gmaps-account" ref={rootRef}>
      <button
        type="button"
        className={`gmaps-account__avatar map-motion-press${open ? ' is-open' : ''}`}
        aria-label="Tài khoản"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleToggleMenu}
      >
        {profile?.avatarPath ? (
          <img src={profile.avatarPath} alt="" className="gmaps-account__avatar-img" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </button>

      <div
        className={`gmaps-account__popover${open ? ' is-visible' : ''}`}
        role="dialog"
        aria-label="Thông tin tài khoản"
        aria-hidden={!open}
      >
        <div className="gmaps-account__head">
          <span className="gmaps-account__avatar gmaps-account__avatar--lg" aria-hidden>
            {profile?.avatarPath ? (
              <img src={profile.avatarPath} alt="" className="gmaps-account__avatar-img" />
            ) : (
              initials
            )}
          </span>
          <div className="gmaps-account__meta">
            <p className="gmaps-account__name">{name}</p>
            {email ? <p className="gmaps-account__email">{email}</p> : null}
            {profile ? <span className={`gmaps-account__plan is-${planTone}`}>{planTag}</span> : null}
          </div>
        </div>

        <div className="gmaps-account__actions">
          <button
            type="button"
            className="gmaps-account__wallet map-motion-press"
            onClick={handleOpenWallet}
          >
            <span className="gmaps-account__wallet-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3h10A2.5 2.5 0 0 1 19 5.5V7h.5A2.5 2.5 0 0 1 22 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A4.5 4.5 0 0 1 2 15.5v-10A2.5 2.5 0 0 1 4.5 3H6v2H4.5a.5.5 0 0 0-.5.5c0 .83.67 1.5 1.5 1.5H17V5.5a.5.5 0 0 0-.5-.5h-10A.5.5 0 0 0 6 5.5V7h13.5a.5.5 0 0 1 .5.5V9h-3.5a3.5 3.5 0 1 0 0 7H20v1.5a.5.5 0 0 1-.5.5h-13A2.5 2.5 0 0 1 4 15.5V8.56c.45.28.97.44 1.5.44H20v5h-3.5a1.5 1.5 0 1 1 0-3H22V9.5A2.5 2.5 0 0 0 19.5 7H19V5.5A2.5 2.5 0 0 0 16.5 3h-10A2.5 2.5 0 0 0 4 5.5Z"
                />
              </svg>
            </span>
            <span className="gmaps-account__wallet-copy">
              <span className="gmaps-account__wallet-label">Ví của tôi</span>
              <span className="gmaps-account__wallet-balance" aria-live="polite">
                {walletLoading
                  ? 'Đang tải số dư…'
                  : walletUnavailable
                    ? 'Không tải được số dư'
                    : formatPrice(wallet?.balance ?? 0)}
              </span>
            </span>
            <span className="gmaps-account__wallet-chevron" aria-hidden>›</span>
          </button>
          {onOpenProfile ? (
            <button
              type="button"
              className="gmaps-account__action map-motion-press"
              onClick={() => {
                setOpen(false)
                onOpenProfile()
              }}
            >
              Hồ sơ của tôi
            </button>
          ) : null}
          <button
            type="button"
            className="gmaps-account__logout map-motion-press"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
