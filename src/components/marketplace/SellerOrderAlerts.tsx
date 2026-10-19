import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Link, useLocation } from 'react-router-dom'
import { getMyMarketplaceOrders, getStoredSession, MarketplaceOrderStatus, NotificationType, type MarketplaceOrder, type Notification as OrderNotification } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice } from '../../lib/labels'
import { alertNeedsSound, NOTIFICATION_CONNECTED, NOTIFICATION_RECEIVED, SELLER_ALERT_POLL_MS, SELLER_ORDERS_CHANGED,
  SELLER_ORDERS_SNAPSHOT, SELLER_REMINDER_MS, sellerOrderAlerts, sellerOrderUrl } from '../../lib/sellerOrderAlerts'
import { SellerOrderSound } from '../../lib/sellerOrderSound'
import './SellerOrderAlerts.css'

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
function writeStored(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory feedback remains available. */ } }


const SellerOrderSlotContext = createContext<((element: HTMLSpanElement | null) => void) | null>(null)

export function SellerOrderAlertsProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [host, setHost] = useState<HTMLSpanElement | null>(null)
  return <SellerOrderSlotContext.Provider value={setHost}>
    {children}
    {enabled ? <SellerOrderAlerts host={host} /> : null}
  </SellerOrderSlotContext.Provider>
}

export function SellerOrderAlertsSlot() {
  const register = useContext(SellerOrderSlotContext)
  return <span ref={register} className="seller-watch-slot" />
}

function SellerOrderAlerts({ host }: { host: HTMLSpanElement | null }) {
  const { profile, isAuthenticated } = useAuth()
  const token = isAuthenticated ? getStoredSession()?.accessToken : null
  return profile && token ? <SellerOrderMonitor key={`${profile.id}:${token}`} ownerId={profile.id} token={token} host={host} /> : null
}

function SellerOrderMonitor({ ownerId, token, host }: { ownerId: string; token: string; host: HTMLSpanElement | null }) {
  const location = useLocation()
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [soundState, setSoundState] = useState<'off' | 'ready' | 'blocked'>(() => readStored(`homeji:seller-sound:${ownerId}`, false) ? 'blocked' : 'off')
  const [acknowledged, setAcknowledged] = useState<Record<string, string>>(() => {
    const value = readStored<unknown>(`homeji:seller-ack:${ownerId}`, {})
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).filter(([key, version]) => key.length < 400 && typeof version === 'string')) : {}
  })
  const [desktop, setDesktop] = useState(() => 'Notification' in window && Notification.permission === 'granted')
  const [desktopError, setDesktopError] = useState('')
  const sound = useMemo(() => new SellerOrderSound(), [])
  const dialogId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const refreshRef = useRef<() => void>(() => {})
  const lastChime = useRef(0)
  const desktopNotice = useRef<Notification | null>(null)
  const lastDesktop = useRef('')
  const alerts = useMemo(() => sellerOrderAlerts(orders, ownerId), [orders, ownerId])
  const outstanding = alerts.filter(alert => alertNeedsSound(alert, acknowledged))
  const fingerprint = outstanding.map(alert => alert.version).sort().join(';')
  const sellerScreen = location.pathname === '/' && new URLSearchParams(location.search).get('section') === 'marketplace'
    && ['sales', 'sell', 'mine'].includes(new URLSearchParams(location.search).get('market') || '')
  const hasSellerOrders = orders.some(order => order.sellerId === ownerId)
  const visible = sellerScreen || hasSellerOrders || alerts.length > 0

  useEffect(() => {
    let active = true, inFlight = false, rerun = false
    let debounce: ReturnType<typeof setTimeout> | undefined
    const current = () => active && getStoredSession()?.accessToken === token
    const refresh = async () => {
      if (!current()) return
      if (inFlight) { rerun = true; return }
      inFlight = true
      try {
        const result = await getMyMarketplaceOrders()
        if (!current()) return
        setOrders(result)
        window.dispatchEvent(new CustomEvent(SELLER_ORDERS_SNAPSHOT, { detail: { ownerId, orders: result } }))
        setHasLoaded(true)
        setError(false)
        setLastSync(new Date())
      } catch {
        // A failed read must not erase pending orders or pretend they were handled.
        if (current()) setError(true)
      } finally {
        inFlight = false
        if (rerun && current()) { rerun = false; schedule() }
      }
    }
    const schedule = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => { void refresh() }, 200)
    }
    refreshRef.current = schedule
    const onNotification = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId: string; notification: OrderNotification }>).detail
      if ((!detail?.ownerId || detail.ownerId === ownerId) && detail?.notification?.type === NotificationType.MarketplaceOrderUpdated) schedule()
    }
    const onOrderChange = (event: Event) => {
      if ((event as CustomEvent<{ ownerId: string }>).detail?.ownerId === ownerId) schedule()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') schedule() }
    const poll = setInterval(() => { void refresh(); setNow(Date.now()) }, SELLER_ALERT_POLL_MS)
    window.addEventListener(NOTIFICATION_RECEIVED, onNotification)
    window.addEventListener(NOTIFICATION_CONNECTED, schedule)
    window.addEventListener(SELLER_ORDERS_CHANGED, onOrderChange)
    window.addEventListener('focus', schedule)
    window.addEventListener('online', schedule)
    document.addEventListener('visibilitychange', onVisible)
    void refresh()
    return () => {
      active = false
      clearInterval(poll)
      clearTimeout(debounce)
      window.removeEventListener(NOTIFICATION_RECEIVED, onNotification)
      window.removeEventListener(NOTIFICATION_CONNECTED, schedule)
      window.removeEventListener(SELLER_ORDERS_CHANGED, onOrderChange)
      window.removeEventListener('focus', schedule)
      window.removeEventListener('online', schedule)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ownerId, token])

  useEffect(() => () => { sound.dispose(); desktopNotice.current?.close() }, [sound])
  useEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    element.showModal()
    return () => element.close()
  }, [open])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === `homeji:seller-sound:${ownerId}` && event.newValue === 'false') { sound.mute(); setSoundState('off') }
      if (event.key === `homeji:seller-ack:${ownerId}`) {
        try {
          const value: unknown = JSON.parse(event.newValue || '{}')
          if (value && typeof value === 'object' && !Array.isArray(value)) setAcknowledged(Object.fromEntries(Object.entries(value).filter(([, version]) => typeof version === 'string')))
        } catch { /* Ignore malformed values from another tab. */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [ownerId, sound])

  useEffect(() => {
    if (!fingerprint || !visible || error) return
    const current = () => getStoredSession()?.accessToken === token
    let active = true
    const signal = async () => {
      if (!active || !current()) return
      // One browser profile chimes per account, even if several tabs receive the event.
      const claim = () => {
        if (!active || !current() || soundState !== 'ready') return
        const key = `homeji:seller-chime:${ownerId}`
        const previous = readStored<{ at: number; fingerprint: string } | null>(key, null)
        const at = Date.now()
        if (at - lastChime.current < 3000 || (previous && at - previous.at < 3000)) return
        if (previous?.fingerprint === fingerprint && at - previous.at < SELLER_REMINDER_MS) return
        if (!sound.play()) { setSoundState('blocked'); return }
        lastChime.current = at
        writeStored(key, { at, fingerprint })
      }
      if (navigator.locks) await navigator.locks.request(`homeji-seller-chime:${ownerId}`, claim)
      else claim()
      if (!active || !current() || !desktop || document.visibilityState === 'visible' || lastDesktop.current === fingerprint) return
      try {
        desktopNotice.current?.close()
        const notice = new Notification('Homeji · Đơn bán cần xử lý', {
          body: `${outstanding.length} đơn đang chờ. Mở Homeji để xác nhận hoặc chuẩn bị giao hàng.`,
          tag: `homeji-seller:${ownerId}`, silent: true,
        })
        desktopNotice.current = notice
        notice.onclick = () => { if (current()) { window.focus(); setOpen(true) } notice.close() }
        lastDesktop.current = fingerprint
      } catch { setDesktopError('Trình duyệt chưa hỗ trợ thông báo hệ thống tại đây; thông báo trong web vẫn hoạt động.') }
    }
    void signal()
    return () => { active = false }
    // Fingerprint is the canonical set of outstanding order versions.
  }, [fingerprint, now, soundState, desktop, error, ownerId, sound, token, visible, outstanding.length])

  const armSound = async () => {
    const armed = await sound.arm()
    if (getStoredSession()?.accessToken !== token) return
    setSoundState(armed ? 'ready' : 'blocked')
    writeStored(`homeji:seller-sound:${ownerId}`, true)
    if (armed) { sound.play(); lastChime.current = Date.now() }
  }
  const muteSound = () => {
    sound.mute(); setSoundState('off'); writeStored(`homeji:seller-sound:${ownerId}`, false)
  }
  const acknowledge = (key: string, version: string) => {
    const next = { ...acknowledged, [key]: version }
    // Bound persisted acknowledgements to current action items.
    const bounded = Object.fromEntries(alerts.filter(alert => next[alert.key] === alert.version).map(alert => [alert.key, alert.version]))
    setAcknowledged(bounded)
    writeStored(`homeji:seller-ack:${ownerId}`, bounded)
  }
  if (!visible) return null

  const status = alerts.length ? `${alerts.length} đơn bán cần xử lý` : hasLoaded ? 'Đang theo dõi đơn bán' : 'Đang tải đơn bán…'
  const detail = error ? 'Mất đồng bộ · đang thử lại, hãy kiểm tra đơn' : alerts.some(alert => alert.status === MarketplaceOrderStatus.Requested) ? 'Có đơn mới chờ xác nhận' : alerts.length ? 'Đơn đã nhận · cần chuẩn bị giao' : 'Đồ ăn và pass đồ'
  return <>
    <span className="seller-watch__live" role="status" aria-live="polite" aria-atomic="true">{status}. {detail}</span>
    {host ? createPortal(<button type="button" className={`hj-action seller-watch__trigger${alerts.length ? ' has-orders' : ''}`}
      onClick={() => setOpen(true)} aria-label={alerts.length ? `Đơn bán, ${alerts.length} cần xử lý` : 'Đơn bán'}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId} title={error ? 'Đơn bán · mất đồng bộ, đang thử lại' : status}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 7h14l1 14H4L5 7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      <span className="seller-watch__label">Đơn bán</span>
      {alerts.length > 0 ? <span className="seller-watch__count" aria-hidden="true">{alerts.length > 99 ? '99+' : alerts.length}</span> : null}
      {error ? <span className="seller-watch__sync-dot" aria-hidden="true" /> : null}
    </button>, host) : null}
    <dialog ref={dialog} id={dialogId} className="seller-watch__dialog" aria-labelledby="seller-watch-title" onCancel={() => setOpen(false)}>
      <header><div><h2 id="seller-watch-title">Đơn bán cần xử lý</h2><p>Thông báo trực tiếp cho đồ ăn và pass đồ</p></div>
        <button type="button" className="btn btn-secondary" aria-label="Đóng theo dõi đơn bán" onClick={() => setOpen(false)}>×</button></header>
      <div className="seller-watch__content">
    <div className="seller-watch__summary">
      <strong>{alerts.length ? `${alerts.length} đơn bán cần xử lý` : hasLoaded ? 'Đang theo dõi đơn bán' : 'Đang tải đơn bán…'}</strong>
      <span>{detail}</span>
    </div>
        <div className="seller-watch__actions">
          <button type="button" className="btn btn-secondary" onClick={soundState === 'ready' ? muteSound : () => void armSound()} aria-pressed={soundState === 'ready'}>
            {soundState === 'ready' ? 'Âm đơn: Bật' : soundState === 'blocked' ? 'Chạm để bật lại âm' : 'Bật âm báo đơn'}
          </button>
        </div>
        <details className="seller-watch__settings" open={alerts.length === 0 || undefined}>
          <summary data-glass-exclude="">Âm thanh và đồng bộ</summary>
          <p>{soundState === 'ready' ? 'Âm báo đang bật. Đơn chưa ghi nhận sẽ được nhắc lại mỗi phút.' : soundState === 'blocked' ? 'Cần chạm để cho phép âm thanh trong lần mở web này.' : 'Âm báo đang tắt. Bật để nghe khi có đơn mới hoặc đơn cần giao.'}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void armSound()}>Bật / nghe thử âm báo</button>
          {soundState === 'ready' && <button type="button" className="btn btn-secondary" onClick={muteSound}>Tắt âm báo</button>}
          {'Notification' in window && !desktop && <button type="button" className="btn btn-secondary" onClick={() => {
            void Notification.requestPermission().then(permission => { setDesktop(permission === 'granted'); if (permission !== 'granted') setDesktopError('Thông báo hệ thống chưa được cho phép. Bạn vẫn nhận cảnh báo trong web.') }).catch(() => setDesktopError('Chưa bật được thông báo hệ thống.'))
          }}>Bật thông báo hệ thống</button>}
          {desktopError && <p role="status">{desktopError}</p>}
          <p>Giữ Homeji mở để nhận trực tiếp. Khi đóng trình duyệt hoặc thiết bị ngủ, âm báo không được bảo đảm; đơn chưa xử lý sẽ được kiểm tra lại khi bạn mở web.</p>
          <p>{error ? 'Chưa cập nhật được đơn. Danh sách bên dưới có thể chưa mới nhất.' : lastSync ? `Đồng bộ lúc ${lastSync.toLocaleTimeString('vi-VN')}` : 'Đang kiểm tra đơn…'}</p>
          <button type="button" className="btn btn-secondary" onClick={() => refreshRef.current()}>Kiểm tra lại đơn</button>
        </details>
        {!alerts.length && <p role="status">{error ? 'Chưa xác nhận được có đơn cần xử lý hay không.' : 'Không có đơn chờ xác nhận hoặc chờ giao.'}</p>}
        <ul className="seller-watch__orders">{alerts.map(alert => <li key={alert.key}>
          <span className={`seller-watch__stage${alert.status === MarketplaceOrderStatus.Requested ? ' is-new' : ''}`}>{alert.status === MarketplaceOrderStatus.Requested ? 'Đơn mới · chờ xác nhận' : 'Đã nhận · chuẩn bị giao / bàn giao'}</span>
          <h3>{alert.buyer} · {alert.quantity} món</h3>
          <p>{alert.title}</p><strong>{formatPrice(alert.total)}</strong>
          <p>Hẹn nhận: {Number.isFinite(Date.parse(alert.pickupAt)) ? new Date(alert.pickupAt).toLocaleString('vi-VN') : 'Kiểm tra trong đơn hàng'}</p>
          <div className="seller-watch__item-actions">
            <Link className="btn btn-primary" to={sellerOrderUrl(alert.orders[0].id)} onClick={() => setOpen(false)}>Mở đơn để xử lý</Link>
            <button type="button" className="btn btn-secondary" disabled={!alertNeedsSound(alert, acknowledged)} onClick={() => acknowledge(alert.key, alert.version)}>{alertNeedsSound(alert, acknowledged) ? 'Đã ghi nhận · dừng nhắc âm' : 'Đã ghi nhận'}</button>
          </div><small>Ghi nhận chỉ dừng nhắc âm ở bước này. Đơn vẫn ở đây đến khi bạn xử lý.</small>
        </li>)}</ul>
      </div>
    </dialog>
  </>
}
