import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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

  const name = profile?.displayName?.trim() || 'Tài khoản'
  const initials = initialsFromName(name)
  const planTag = profile?.isPremium ? 'Premium' : 'Standard'
  const planTone = profile?.isPremium ? 'premium' : 'standard'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className="gmaps-account" ref={rootRef}>
      <button
        type="button"
        className={`gmaps-account__avatar map-motion-press${open ? ' is-open' : ''}`}
        aria-label="Tài khoản"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
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
