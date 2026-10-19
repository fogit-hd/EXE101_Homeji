import { navigateMenu } from '../ui/menuNavigation'
import { ThemeSwitch } from '../theme/ThemeSwitch'
import { HomejiAiButton } from '../chrome/HomejiAiButton'
import { useMotionPresence } from '../motion/useMotionPresence'
import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { NotificationsSkeleton } from '../skeletons/PageSkeletons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getNotifications, NotificationType, UserRole, type Notification } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificationHub } from '../../hooks/useNotificationHub'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { notificationTargetHref } from '../../lib/notificationTarget'
import type { NotificationReadChange } from '../../pages/NotificationsPage'
import { NotificationsPage } from '../../pages/deferredPages'
import { CategoryMegaMenu } from './CategoryMegaMenu'
import { ContextualSearch } from './ContextualSearch'
import { resolveMarketplaceDestination } from '../../lib/marketplaceNavigation'
import { marketplaceHref, PRIMARY_PILLARS } from './navigation'
import { ShellIcon } from './ShellIcons'
import { AccountWalletLink } from './AccountWalletLink'

const CLOSE_DELAY_MS = 180
const COMPACT_AFTER = 80
const EXPAND_BEFORE = 32
const headerIconLabels = { heart: 'Tin đã lưu', bell: 'Thông báo', message: 'Tin nhắn' }

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
  const categoryKeyboardOpen = useRef(false)
  const [pinned, setPinned] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountFocusEdge = useRef<'first' | 'last' | null>(null)
  const [walletMenuVersion, setWalletMenuVersion] = useState(0)
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
      const reduceMotion = window.matchMedia('not all').matches
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
    if (!accountOpen || !accountFocusEdge.current) return
    const items = accountRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    items?.[accountFocusEdge.current === 'last' ? items.length - 1 : 0]?.focus()
    accountFocusEdge.current = null
  }, [accountOpen])

  useEffect(() => {
    if (!menuOpen || !categoryKeyboardOpen.current) return
    anchorRef.current?.querySelector<HTMLElement>('.hj-mega button, .hj-mega a[href]')?.focus()
    categoryKeyboardOpen.current = false
  }, [menuOpen])

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
      const accountWasOpen = accountOpen
      setMenuOpen(false)
      setPinned(false)
      setAccountOpen(false)
      setNotifyOpen(false)
      if (notifyWasOpen) {
        notifyRef.current?.querySelector<HTMLElement>('.hj-notify__trigger')?.focus()
      }
      if (accountWasOpen) accountRef.current?.querySelector<HTMLElement>('.hj-profile')?.focus()
      if (menuOpen && !notifyWasOpen && !accountWasOpen) anchorRef.current?.querySelector<HTMLElement>('.hj-menu-trigger')?.focus()
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
    setAccountOpen(false)
    setMenuOpen(true)
  }

  const toggleMenu = () => {
    setNotifyOpen(false)
    setAccountOpen(false)
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
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setMenuOpen(true)
      setPinned(true)
      setNotifyOpen(false)
      setAccountOpen(false)
      if (menuOpen) anchorRef.current?.querySelector<HTMLElement>('.hj-mega button, .hj-mega a[href]')?.focus()
      else categoryKeyboardOpen.current = true
    }
  }

  const displayName = profile?.displayName?.trim() || 'Tài khoản'
  const isAdmin = profile?.role === UserRole.Admin
  const mark = initials(displayName)
  const pillars = PRIMARY_PILLARS.map((item) => (
    item.id === 'market' ? { ...item, href: marketplaceHref('browse') } : item
  ))

  const accountLinks: { id: string; label: string; href: string; icon: 'user' | 'card' | 'search' | 'activity' | 'shield' | 'bookmark' }[] = [
    { id: 'myPosts', label: 'Quản lý tin', href: mapSectionUrl('myPosts'), icon: 'activity' },
    { id: 'saved', label: 'Tin đã lưu', href: mapSectionUrl('saved'), icon: 'bookmark' },
    { id: 'profile', label: 'Hồ sơ', href: mapSectionUrl('profile'), icon: 'user' as const },
    { id: 'subscription', label: 'Gói đăng ký', href: mapSectionUrl('payments'), icon: 'card' as const },
    { id: 'wanted', label: 'Tin tìm phòng', href: mapSectionUrl('wanted'), icon: 'search' as const },
    { id: 'activities', label: 'Nhật ký hoạt động', href: mapSectionUrl('activities'), icon: 'activity' as const },
  ]
  if (isAdmin) {
    accountLinks.unshift({ id: 'admin', label: 'Quản trị', href: '/admin', icon: 'shield' })
  }
  const accountGroups = [
    { label: 'Tài khoản & dịch vụ', items: accountLinks.filter(item => ['profile', 'subscription'].includes(item.id)) },
    { label: 'Hoạt động của bạn', items: accountLinks.filter(item => ['myPosts', 'saved', 'wanted', 'activities', 'admin'].includes(item.id)) },
  ]

  return (
    <header className="hj-header">
      <div className={`hj-bar${isAdmin ? ' hj-bar--admin' : ''}`}>
        <div
          className="hj-header__menu"
          ref={anchorRef}
          onMouseEnter={hoverOpen}
          onMouseLeave={scheduleClose}
          onBlur={event => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
              setMenuOpen(false)
              setPinned(false)
            }
          }}
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
          <img className="hj-logo__mark" src="/brand/homeji-logo2.png" alt="Homeji" width={48} height={48} />
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
          <HomejiAiButton />
          <div className="hj-notify" ref={notifyRef}>
            <button
              type="button"
              className={`hj-action hj-action--icon hj-notify__trigger${notifyOpen ? ' is-active' : ''}${unreadNotifications > 0 ? ' is-hot' : ''}`}
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
                <Suspense fallback={<NotificationsSkeleton tabs={false} />}>
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
                </Suspense>
              </div>
            ) : null}
          </div>
          <HeaderLink href={mapSectionUrl('messages')} label="" icon="message" count={unreadMessages} />
          {isAdmin ? <Link to="/admin" className="hj-post-cta hj-admin-cta" aria-current={location.pathname === '/admin' ? 'page' : undefined}>
            <ShellIcon name="shield" /><span>Quản trị</span>
          </Link> : <Link to="/posts/new" className="hj-post-cta">Đăng tin</Link>}
          <div className="hj-account" ref={accountRef} onBlur={event => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false)
          }}>
            <button
              type="button"
              className={`hj-profile${accountOpen ? ' is-open' : ''}`}
              aria-label="Menu tài khoản"
              aria-expanded={accountOpen}
              aria-controls={accountId}
              aria-haspopup="menu"
              onKeyDown={event => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
                event.preventDefault()
                accountFocusEdge.current = event.key === 'ArrowUp' ? 'last' : 'first'
                if (accountOpen) {
                  const items = accountRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
                  items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus()
                  accountFocusEdge.current = null
                  return
                }
                setNotifyOpen(false)
                setMenuOpen(false)
                setPinned(false)
                setWalletMenuVersion(version => version + 1)
                setAccountOpen(true)
              }}
              onClick={() => {
                setNotifyOpen(false)
                setMenuOpen(false)
                setPinned(false)
                if (!accountOpen) setWalletMenuVersion((version) => version + 1)
                setAccountOpen((open) => !open)
              }}
            >
              <span className="hj-profile__mark">{mark}</span>
              <BarGlyph name="chevron" size={14} turned={accountOpen} />
            </button>
            {accountPresent ? (
              <div {...accountPresence} id={accountId} className="hj-account__menu" role="menu" aria-label="Tài khoản"
                onKeyDown={event => navigateMenu(event, () => {
                  setAccountOpen(false)
                  accountRef.current?.querySelector<HTMLElement>('.hj-profile')?.focus()
                })}>
                <p className="hj-account__name">{displayName}</p>
                <p className="hj-account__role">{isAdmin ? 'Quản trị viên' : 'Tài khoản cá nhân'}</p>
                <div role="group" aria-label="Ví & thanh toán" className="hj-account__group">
                  <p className="hj-account__group-label">Ví & thanh toán</p>
                  <AccountWalletLink key={`${profile?.id ?? 'account'}:${walletMenuVersion}`}
                    active={accountOpen} ownerId={profile?.id} onNavigate={() => setAccountOpen(false)} />
                </div>
                {accountGroups.map(group => <div key={group.label} role="group" aria-label={group.label} className="hj-account__group">
                  <p className="hj-account__group-label">{group.label}</p>
                  {group.items.map((item) => (
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
                </div>)}
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
          <ThemeSwitch />
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
  const accessibleLabel = label || (icon ? headerIconLabels[icon] : '')
  const section = new URLSearchParams(location.search).get('section')
  const expected = new URLSearchParams(href.includes('?') ? href.slice(href.indexOf('?') + 1) : '').get('section')
  const active = location.pathname === '/' && expected != null && section === expected
  return (
    <Link
      to={href}
      className={`hj-action${label ? ' hj-action--text' : ' hj-action--icon'}${active ? ' is-active' : ''}${count > 0 ? ' is-hot' : ''}`}
      aria-label={count > 0 ? `${accessibleLabel}, ${count} chưa đọc` : accessibleLabel}
      aria-current={active ? 'page' : undefined}
    >
      {icon ? (
        <span className="hj-action__icon">
          <BarGlyph name={icon} />
          {count > 0 ? <span className="hj-action__badge">{count > 99 ? '99+' : count}</span> : null}
        </span>
      ) : null}
      {label ? <span className="hj-action__label">{label}</span> : null}
    </Link>
  )
}
