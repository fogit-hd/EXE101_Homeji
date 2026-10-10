import { useMotionPresence } from '../motion/useMotionPresence'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getNotifications, NotificationType, UserRole, type Notification } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificationHub } from '../../hooks/useNotificationHub'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { notificationTargetHref } from '../../lib/notificationTarget'
import { NotificationsPage, type NotificationReadChange } from '../../pages/NotificationsPage'
import { CategoryMegaMenu } from './CategoryMegaMenu'
import { ContextualSearch } from './ContextualSearch'
import { resolveMarketplaceDestination } from '../../lib/marketplaceNavigation'
import { marketplaceHref, PRIMARY_PILLARS } from './navigation'
import { ShellIcon } from './ShellIcons'

const CLOSE_DELAY_MS = 180
const COMPACT_AFTER = 80
const EXPAND_BEFORE = 32

/** Logged-in home is `/` with no section and no post. Every other route stays compact. */
function isHomeBarRoute(routeKey: string): boolean {
  const split = routeKey.indexOf('?')
  const path = split === -1 ? routeKey : routeKey.slice(0, split)
  const search = split === -1 ? '' : routeKey.slice(split)
  if (path !== '/') return false
  const params = new URLSearchParams(search)
  return !params.get('section') && !params.get('post')
}

function useDrawerLayout() {
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const apply = () => setDrawer(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])
  return drawer
}

export function GlobalHeader() {
  const { profile, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const drawer = useDrawerLayout()
  const menuId = useId()
  const accountId = useId()
  const notifyId = useId()
  const anchorRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const notifyRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { present: accountPresent, ...accountPresence } = useMotionPresence(accountOpen)
  const [notifyOpen, setNotifyOpen] = useState(() => sectionIsNotifications(location.search))
  const { present: notifyPresent, ...notifyPresence } = useMotionPresence(notifyOpen)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const routeKey = `${location.pathname}${location.search}`
  const [menuRoute, setMenuRoute] = useState(routeKey)
  if (menuRoute !== routeKey) {
    setMenuRoute(routeKey)
    setMenuOpen(false)
    setPinned(false)
    setAccountOpen(false)
    setNotifyOpen(sectionIsNotifications(location.search))
  }

  const searchHeld = useRef(false)
  const holdRef = useRef(false)
  const compactWanted = useRef(false)
  const syncBarRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    const shell = document.querySelector('.hj-shell')
    if (!(shell instanceof HTMLElement)) return
    const main = document.querySelector('.app-main')
    let compact = shell.classList.contains('is-compact')
    let frame = 0
    let lock = 0
    let cancelled = false

    const scroller = () => {
      const winY = window.scrollY || document.documentElement.scrollTop || 0
      const mainScrolls = main instanceof HTMLElement && main.scrollHeight > main.clientHeight + 8
      const mainY = mainScrolls ? main.scrollTop : 0
      if (main instanceof HTMLElement && mainScrolls && mainY >= winY) {
        return {
          get: () => main.scrollTop,
          set: (y: number) => {
            main.scrollTop = y
          },
        }
      }
      return {
        get: () => window.scrollY || document.documentElement.scrollTop || 0,
        set: (y: number) => {
          window.scrollTo(0, y)
        },
      }
    }

    const homeBar = isHomeBarRoute(routeKey)
    const commit = (next: boolean, pinThreshold = true) => {
      if (next === compact) return
      const box = scroller()
      const yBefore = box.get()
      const heightBefore = shell.getBoundingClientRect().height
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const field = reduceMotion ? null : shell.querySelector('.hj-search__field')
      const fieldFrom = field instanceof HTMLElement ? field.getBoundingClientRect() : null
      lock = 2
      const root = document.documentElement
      const previousAnchor = root.style.overflowAnchor
      root.style.overflowAnchor = 'none'
      compact = next
      shell.classList.toggle('is-compact', next)
      const heightAfter = shell.getBoundingClientRect().height
      const delta = heightBefore - heightAfter
      const yNow = box.get()
      // scrollY += measured height delta cancels the engine's opposite shift.
      // If the engine did not move scroll, keep the position that crossed the line.
      const compensated = yNow + delta
      const target = Math.abs(compensated - yBefore) <= 1.5
        ? Math.max(0, compensated)
        : Math.max(0, yBefore)
      const safe = !pinThreshold
        ? Math.max(0, target)
        : next
          ? Math.max(target, COMPACT_AFTER + 1)
          : Math.min(target, EXPAND_BEFORE - 1)
      if (Math.abs(safe - yNow) > 0.5) box.set(Math.max(0, safe))
      if (field instanceof HTMLElement && fieldFrom) {
        const fieldTo = field.getBoundingClientRect()
        const dx = fieldFrom.left - fieldTo.left
        const dy = fieldFrom.top - fieldTo.top
        if (Math.hypot(dx, dy) > 1) {
          field.getAnimations().forEach((anim) => anim.cancel())
          field.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
          )
        }
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (cancelled) {
            root.style.overflowAnchor = previousAnchor
            return
          }
          root.style.overflowAnchor = previousAnchor
          window.requestAnimationFrame(() => {
            if (cancelled) return
            const settled = scroller()
            const y = settled.get()
            const drifted = pinThreshold && (next ? y <= COMPACT_AFTER : y >= EXPAND_BEFORE)
            if (drifted) settled.set(Math.max(0, safe))
            lock = 0
          })
        })
      })
    }

    const apply = () => {
      frame = 0
      if (lock || cancelled) return
      if (!homeBar) {
        compactWanted.current = true
        if (!compact) commit(true, false)
        return
      }
      const y = scroller().get()
      const next = compact ? y >= EXPAND_BEFORE : y > COMPACT_AFTER
      compactWanted.current = next
      if (holdRef.current || next === compact) return
      commit(next)
    }

    const onScroll = () => {
      if (lock || frame) return
      frame = window.requestAnimationFrame(apply)
    }
    const onFocusIn = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.closest('.hj-search')) return
      searchHeld.current = true
      holdRef.current = true
    }
    const onFocusOut = (event: Event) => {
      const next = event instanceof FocusEvent ? event.relatedTarget : null
      if (next instanceof HTMLElement && next.closest('.hj-search')) return
      searchHeld.current = false
      const menuHeld = shell.querySelector('.hj-menu-trigger')?.getAttribute('aria-expanded') === 'true'
        || shell.querySelector('.hj-profile')?.getAttribute('aria-expanded') === 'true'
        || shell.querySelector('.hj-notify__trigger')?.getAttribute('aria-expanded') === 'true'
      holdRef.current = menuHeld
      if (!menuHeld) apply()
    }
    syncBarRef.current = apply
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    main?.addEventListener('scroll', onScroll, { passive: true })
    shell.addEventListener('focusin', onFocusIn)
    shell.addEventListener('focusout', onFocusOut)
    return () => {
      cancelled = true
      syncBarRef.current = () => {}
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      main?.removeEventListener('scroll', onScroll)
      shell.removeEventListener('focusin', onFocusIn)
      shell.removeEventListener('focusout', onFocusOut)
    }
  }, [routeKey])

  useEffect(() => {
    holdRef.current = menuOpen || accountOpen || notifyOpen || searchHeld.current
    if (holdRef.current) return
    syncBarRef.current()
  }, [menuOpen, accountOpen, notifyOpen])

  useNotificationHub({
    enabled: isAuthenticated,
    onNotification: (notification: Notification) => {
      setRefreshKey((key) => key + 1)
      if (notification.isRead) return
      const isMessage =
        notification.type === NotificationType.NewMessage ||
        notification.type === NotificationType.DirectMessage
      if (isMessage) setUnreadMessages((count) => count + 1)
      else setUnreadNotifications((count) => count + 1)
    },
  })

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void getNotifications(true)
      .then((list) => {
        if (cancelled) return
        let messages = 0
        let other = 0
        for (const item of list) {
          if (item.isRead) continue
          const isMessage =
            item.type === NotificationType.NewMessage || item.type === NotificationType.DirectMessage
          if (isMessage) messages += 1
          else other += 1
        }
        setUnreadMessages(messages)
        setUnreadNotifications(other)
      })
      .catch(() => {
        /* keep the live counters */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, refreshKey, location.pathname, location.search])

  useEffect(() => {
    if (!notifyOpen) return
    notifyRef.current?.querySelector<HTMLElement>('.hj-notify__pop')?.focus()
  }, [notifyOpen])

  useEffect(() => {
    if (!menuOpen && !accountOpen && !notifyOpen) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuOpen && !anchorRef.current?.contains(target)) {
        setMenuOpen(false)
        setPinned(false)
      }
      if (accountOpen && !accountRef.current?.contains(target)) setAccountOpen(false)
      if (notifyOpen && !notifyRef.current?.contains(target)) setNotifyOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const notifyWasOpen = notifyOpen
      setMenuOpen(false)
      setPinned(false)
      setAccountOpen(false)
      setNotifyOpen(false)
      if (notifyWasOpen) {
        notifyRef.current?.querySelector<HTMLElement>('.hj-notify__trigger')?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, accountOpen, notifyOpen])

  const clearCloseTimer = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    if (drawer || pinned) return
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), CLOSE_DELAY_MS)
  }

  const hoverOpen = () => {
    if (drawer) return
    clearCloseTimer()
    setNotifyOpen(false)
    setMenuOpen(true)
  }

  const toggleMenu = () => {
    setNotifyOpen(false)
    if (drawer) {
      setPinned(false)
      setMenuOpen((open) => !open)
      return
    }
    if (pinned) {
      setPinned(false)
      setMenuOpen(false)
      return
    }
    setPinned(true)
    setMenuOpen(true)
  }

  const onTriggerKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' && menuOpen) {
      event.preventDefault()
      const first = anchorRef.current?.querySelector<HTMLAnchorElement>('.hj-mega a[href]')
      first?.focus()
    }
  }

  const displayName = profile?.displayName?.trim() || 'Tài khoản'
  const mark = initials(displayName)
  const pillars = PRIMARY_PILLARS.map((item) => (
    item.id === 'market' ? { ...item, href: marketplaceHref('browse') } : item
  ))

  const accountLinks: { id: string; label: string; href: string; icon: 'user' | 'card' | 'search' | 'activity' | 'shield' }[] = [
    { id: 'profile', label: 'Hồ sơ', href: mapSectionUrl('profile'), icon: 'user' as const },
    { id: 'subscription', label: 'Gói đăng ký', href: mapSectionUrl('payments'), icon: 'card' as const },
    { id: 'wanted', label: 'Tin tìm phòng', href: mapSectionUrl('wanted'), icon: 'search' as const },
    { id: 'activities', label: 'Nhật ký hoạt động', href: mapSectionUrl('activities'), icon: 'activity' as const },
  ]
  if (profile?.role === UserRole.Admin) {
    accountLinks.push({ id: 'admin', label: 'Admin', href: '/admin', icon: 'shield' })
  }

  return (
    <header className="hj-header">
      <div className="hj-bar">
        <div
          className="hj-header__menu"
          ref={anchorRef}
          onMouseEnter={hoverOpen}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            className={`hj-menu-trigger${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Đóng danh mục' : 'Mở danh mục'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-haspopup="true"
            onClick={toggleMenu}
            onKeyDown={onTriggerKey}
          >
            <BarGlyph name={menuOpen ? 'close' : 'menu'} />
            <span>Danh mục</span>
          </button>
          <CategoryMegaMenu
            open={menuOpen}
            drawer={drawer}
            menuId={menuId}
            onNavigate={() => {
              setMenuOpen(false)
              setPinned(false)
            }}
          />
        </div>
        <Link to="/" className="hj-logo" aria-label="Homeji — Trang chủ">
          <img className="hj-logo__mark" src="/bar/homeji-logo.png" alt="Homeji" width={48} height={48} />
          <span className="hj-logo__word">Homeji</span>
        </Link>
        <nav className="hj-primary" aria-label="Điều hướng chính">
          {pillars.map((item) => {
            const active = pillarActive(item.id, location.search)
            return (
              <Link key={item.id} to={item.href} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <ContextualSearch />
        <div className="hj-actions">
          <HeaderLink href={mapSectionUrl('saved')} label="" icon="heart" />
          <div className="hj-notify" ref={notifyRef}>
            <button
              type="button"
              className={`hj-action hj-notify__trigger${notifyOpen ? ' is-active' : ''}${unreadNotifications > 0 ? ' is-hot' : ''}`}
              aria-label={
                unreadNotifications > 0
                  ? `Thông báo, ${unreadNotifications} chưa đọc`
                  : 'Thông báo'
              }
              aria-expanded={notifyOpen}
              aria-controls={notifyId}
              aria-haspopup="dialog"
              onClick={() => {
                setMenuOpen(false)
                setPinned(false)
                setAccountOpen(false)
                setNotifyOpen((open) => !open)
              }}
            >
              <span className="hj-action__icon">
                <BarGlyph name="bell" />
                {unreadNotifications > 0 ? (
                  <span className="hj-action__badge">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                ) : null}
              </span>
            </button>
            {notifyPresent ? (
              <div
                id={notifyId}
                {...notifyPresence}
                className="hj-notify__pop"
                role="dialog"
                aria-modal="false"
                aria-labelledby={`${notifyId}-title`}
                tabIndex={-1}
              >
                <NotificationsPage
                  surface="popup"
                  headingId={`${notifyId}-title`}
                  refreshKey={refreshKey}
                  onOpenRelated={(notification) => {
                    const href = notificationTargetHref(notification)
                    if (!href) return
                    setNotifyOpen(false)
                    navigate(href)
                  }}
                  onReadStateChange={(change: NotificationReadChange) => {
                    if (change.kind === 'all') {
                      setUnreadMessages(0)
                      setUnreadNotifications(0)
                      return
                    }
                    const isMessage =
                      change.notification.type === NotificationType.NewMessage ||
                      change.notification.type === NotificationType.DirectMessage
                    if (isMessage) setUnreadMessages((count) => Math.max(0, count - 1))
                    else setUnreadNotifications((count) => Math.max(0, count - 1))
                  }}
                />
              </div>
            ) : null}
          </div>
          <HeaderLink href={mapSectionUrl('messages')} label="" icon="message" count={unreadMessages} />
          <HeaderLink href={mapSectionUrl('myPosts')} label="Quản lý tin" />
          <Link to="/posts/new" className="hj-post-cta">Đăng tin</Link>
          <div className="hj-account" ref={accountRef}>
            <button
              type="button"
              className={`hj-profile${accountOpen ? ' is-open' : ''}`}
              aria-label="Menu tài khoản"
              aria-expanded={accountOpen}
              aria-controls={accountId}
              aria-haspopup="menu"
              onClick={() => {
                setNotifyOpen(false)
                setAccountOpen((open) => !open)
              }}
            >
              <span className="hj-profile__mark">{mark}</span>
              <BarGlyph name="chevron" size={14} turned={accountOpen} />
            </button>
            {accountPresent ? (
              <div {...accountPresence} id={accountId} className="hj-account__menu" role="menu">
                <p className="hj-account__name">{displayName}</p>
                <p className="hj-account__role">Tài khoản cá nhân</p>
                {accountLinks.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    role="menuitem"
                    className="hj-account__item"
                    onClick={() => setAccountOpen(false)}
                  >
                    <ShellIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  className="hj-account__item hj-account__item--danger"
                  onClick={() => {
                    setAccountOpen(false)
                    logout()
                    navigate('/login')
                  }}
                >
                  <ShellIcon name="user" />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

function sectionIsNotifications(search: string): boolean {
  return new URLSearchParams(search).get('section') === 'notifications'
}

function pillarActive(id: string, search: string): boolean {
  const params = new URLSearchParams(search)
  const section = params.get('section')
  if (id === 'explore') return section === 'listings' || Boolean(params.get('post'))
  if (id === 'roommate') return section === 'invitations'
  if (id === 'market') {
    const marketTab = resolveMarketplaceDestination(params).tab
    return section === 'marketplace' && (marketTab === 'browse' || marketTab === 'purchases')
  }
  return false
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HJ'
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

function BarGlyph({ name, size = 20, turned = false }: { name: 'menu' | 'close' | 'heart' | 'bell' | 'message' | 'chevron' | 'search'; size?: number; turned?: boolean }) {
  return (
    <img
      className={turned ? 'hj-glyph is-up' : 'hj-glyph'}
      src={`/bar/${name}.svg`}
      alt=""
      width={size}
      height={size}
    />
  )
}

function HeaderLink({
  href,
  label,
  icon,
  count = 0,
}: {
  href: string
  label: string
  icon?: 'heart' | 'bell' | 'message'
  count?: number
}) {
  const location = useLocation()
  const section = new URLSearchParams(location.search).get('section')
  const expected = new URLSearchParams(href.includes('?') ? href.slice(href.indexOf('?') + 1) : '').get('section')
  const active = location.pathname === '/' && expected != null && section === expected
  return (
    <Link
      to={href}
      className={`hj-action${active ? ' is-active' : ''}${count > 0 ? ' is-hot' : ''}`}
      aria-label={count > 0 ? `${label}, ${count} chưa đọc` : label}
      aria-current={active ? 'page' : undefined}
    >
      {icon ? (
        <span className="hj-action__icon">
          <BarGlyph name={icon} />
          {count > 0 ? <span className="hj-action__badge">{count > 99 ? '99+' : count}</span> : null}
        </span>
      ) : null}
      <span className="hj-action__label">{label}</span>
    </Link>
  )
}
