import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './GuestPosterMenu.css'

type PosterAction = {
  id: string
  label: string
  path: string
}

type PosterGroup = {
  id: string
  title: string
  icon: 'home' | 'people'
  items: PosterAction[]
}

const GROUPS: PosterGroup[] = [
  {
    id: 'landlord',
    title: 'Dành cho chủ trọ',
    icon: 'home',
    items: [
      {
        id: 'landlord-create',
        label: 'Đăng tin cho thuê phòng',
        path: '/posts/new?type=vacant',
      },
      {
        id: 'landlord-manage',
        label: 'Quản lý danh sách phòng',
        path: '/my-posts?type=vacant',
      },
    ],
  },
  {
    id: 'roommate',
    title: 'Dành cho tìm ở ghép',
    icon: 'people',
    items: [
      {
        id: 'roommate-create',
        label: 'Đăng tin tìm người ở cùng',
        path: '/posts/new?type=roommate',
      },
      {
        id: 'roommate-manage',
        label: 'Quản lý tin ở ghép',
        path: '/my-posts?type=roommate',
      },
    ],
  },
]

function GroupIcon({ kind }: { kind: PosterGroup['icon'] }) {
  if (kind === 'people') {
    return (
      <svg className="guest-poster-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 12a3.5 3.5 0 1 0-3.48-3.9A4.75 4.75 0 0 0 8 12.75V14h1.5v-.75A3.25 3.25 0 0 1 12.75 10h.08A3.49 3.49 0 0 0 16.5 12Zm-9-1A3 3 0 1 0 4.5 8a3 3 0 0 0 3 3Zm0 1.5c-2.5 0-4.5 1.4-4.5 3.25V17H8v-1.25c0-.7.28-1.34.75-1.85A6.1 6.1 0 0 0 7.5 13.5Zm9 1.25c0-1.3.95-2.4 2.35-3.05A4.4 4.4 0 0 1 21 15.75V17h-4.5v-2.25Z"
        />
      </svg>
    )
  }

  return (
    <svg className="guest-poster-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2 3.5 10.2V21h6.2v-5.4h4.6V21h6.2V10.2L12 3.2Zm0 2.3 6.3 5.2V19.2h-2.8v-5.4H8.5v5.4H5.7v-8.5L12 5.5Z"
      />
    </svg>
  )
}

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
  const flatItems = GROUPS.flatMap((g) => g.items)
  const [focusIndex, setFocusIndex] = useState(-1)

  const close = useCallback(() => {
    setOpen(false)
    setFocusIndex(-1)
    resumeGuestCoast()
  }, [])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        pauseGuestCoast()
        setFocusIndex(0)
      } else {
        resumeGuestCoast()
        setFocusIndex(-1)
      }
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

  const runAction = (path: string) => {
    close()
    if (isAuthenticated) {
      navigate(path)
      return
    }
    openAuthModal({
      mode: 'login',
      intent: 'post',
      onSuccess: () => navigate(path),
    })
  }

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!open || flatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex((i) => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusIndex(flatItems.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (focusIndex >= 0) {
        e.preventDefault()
        runAction(flatItems[focusIndex].path)
      }
    }
  }

  useEffect(() => {
    if (!open || focusIndex < 0) return
    const el = panelRef.current?.querySelector<HTMLButtonElement>(
      `[data-poster-index="${focusIndex}"]`,
    )
    el?.focus()
  }, [open, focusIndex])

  const panel = open ? (
    <div
      ref={panelRef}
      id={menuId}
      className="guest-poster-menu__panel"
      role="menu"
      aria-label="Tác vụ đăng tin"
      style={{ top: panelPos.top, right: panelPos.right }}
      onKeyDown={onMenuKeyDown}
    >
      <p className="guest-poster-menu__hint">
        {isAuthenticated
          ? 'Chọn việc bạn muốn làm tiếp.'
          : 'Cần đăng nhập trước khi đăng tin hoặc quản lý tin.'}
      </p>

      {GROUPS.map((group, groupIndex) => {
        const offset = GROUPS.slice(0, groupIndex).reduce((n, g) => n + g.items.length, 0)
        return (
          <div
            key={group.id}
            className={`guest-poster-menu__group${groupIndex > 0 ? ' guest-poster-menu__group--divided' : ''}`}
          >
            <div className="guest-poster-menu__group-head">
              <span className={`guest-poster-menu__badge guest-poster-menu__badge--${group.icon}`}>
                <GroupIcon kind={group.icon} />
              </span>
              <span className="guest-poster-menu__group-title">{group.title}</span>
            </div>
            <ul className="guest-poster-menu__list">
              {group.items.map((item, itemIndex) => {
                const index = offset + itemIndex
                return (
                  <li key={item.id} role="none" className="guest-poster-menu__row">
                      <button
                        type="button"
                        role="menuitem"
                        className="guest-poster-menu__item"
                        data-poster-index={index}
                        tabIndex={open && focusIndex === index ? 0 : -1}
                        onMouseEnter={() => setFocusIndex(index)}
                        onClick={() => runAction(item.path)}
                      >
                        <span className="guest-poster-menu__item-label">{item.label}</span>
                      </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
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
