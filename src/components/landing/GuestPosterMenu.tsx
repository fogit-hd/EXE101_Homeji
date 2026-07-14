import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './GuestPosterMenu.css'

const MANAGE_POSTS_PATH = '/my-posts'

type PanelPos = { top: number; right: number }

export function GuestPosterMenu() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 0, right: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(() => {
    setOpen(false)
    resumeGuestCoast()
  }, [])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) pauseGuestCoast()
      else resumeGuestCoast()
      return next
    })
  }

  const syncPanelPos = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setPanelPos({
      top: Math.round(rect.bottom + 10),
      right: Math.round(window.innerWidth - rect.right),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    syncPanelPos()
  }, [open, syncPanelPos])

  useEffect(() => {
    if (!open) return

    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        triggerRef.current?.focus()
      }
    }
    const onReposition = () => syncPanelPos()

    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, close, syncPanelPos])

  useEffect(() => () => resumeGuestCoast(), [])

  const openLogin = () => {
    openAuthModal({
      mode: 'login',
      intent: 'post',
      onSuccess: () => navigate(MANAGE_POSTS_PATH),
    })
  }

  const runManagePosts = () => {
    close()
    if (isAuthenticated) {
      navigate(MANAGE_POSTS_PATH)
      return
    }
    openLogin()
  }

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      runManagePosts()
    }
  }

  const panel = open ? (
    <div
      ref={panelRef}
      id={menuId}
      className="guest-poster-menu__panel"
      role="menu"
      aria-label="Quản lý tin đăng"
      style={{ top: panelPos.top, right: panelPos.right }}
      onKeyDown={onMenuKeyDown}
    >
      {!isAuthenticated ? (
        <p className="guest-poster-menu__hint">
          Cần{' '}
          <a
            href="#login"
            className="guest-poster-menu__hint-link"
            onClick={(e) => {
              e.preventDefault()
              close()
              openLogin()
            }}
          >
            đăng nhập
          </a>{' '}
          trước khi quản lý tin.
        </p>
      ) : null}

      <ul className="guest-poster-menu__list">
        <li role="none" className="guest-poster-menu__row">
          <button
            type="button"
            role="menuitem"
            className="guest-poster-menu__item"
            tabIndex={0}
            onClick={runManagePosts}
          >
            <span className="guest-poster-menu__item-label">Quản lý tin đăng</span>
          </button>
        </li>
      </ul>
    </div>
  ) : null

  return (
    <div
      className={`guest-poster-menu${open ? ' is-open' : ''}`}
      ref={rootRef}
      onKeyDown={onMenuKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="guest-poster-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        <span>Dành cho người đăng tin</span>
        <svg className="guest-poster-menu__chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.5 4.5 6 8l3.5-3.5"
          />
        </svg>
      </button>

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
