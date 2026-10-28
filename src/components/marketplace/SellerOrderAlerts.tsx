import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Link, useLocation } from 'react-router-dom'
import { getMyMarketplaceOrders, getStoredSession, MarketplaceOrderStatus, NotificationType, type MarketplaceOrder, type Notification as OrderNotification } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice } from '../../lib/labels'
import { alertNeedsSound, NOTIFICATION_CONNECTED, NOTIFICATION_RECEIVED, SELLER_ALERT_POLL_MS, SELLER_ORDERS_CHANGED,
  SELLER_ORDERS_SNAPSHOT, SELLER_REMINDER_MS, sellerOrderAlerts, sellerOrderUrl } from '../../lib/sellerOrderAlerts'
import { SellerOrderSound } from '../../lib/sellerOrderSound'
import { SellerOrderDecision } from './SellerOrderDecision'
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
  const [soundState, setSoundState] = useState<'off' | 'ready' | 'blocked'>(() => readStored<unknown>(`homeji:seller-sound:${ownerId}`, true) !== false ? 'blocked' : 'off')
  const soundWanted = useRef(soundState !== 'off')
  const soundAttempt = useRef(0)
  const [filter, setFilter] = useState<'all' | 'new' | 'handoff'>('all')
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
      if (event.key === `homeji:seller-sound:${ownerId}`) {
        soundWanted.current = event.newValue !== 'false'
        // Another tab enabling sound must not cancel this tab's pending resume.
        if (!soundWanted.current) { soundAttempt.current++; sound.mute() }
        setSoundState(soundWanted.current ? (sound.ready ? 'ready' : 'blocked') : 'off')
      }
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

  const armSound = useCallback(async (preview = false) => {
    const attempt = ++soundAttempt.current
    soundWanted.current = true
    writeStored(`homeji:seller-sound:${ownerId}`, true)
    const armed = await sound.arm()
    if (getStoredSession()?.accessToken !== token || !soundWanted.current || attempt !== soundAttempt.current) return
    setSoundState(armed ? 'ready' : 'blocked')
    if (armed && preview) { sound.play(); lastChime.current = Date.now() }
  }, [ownerId, sound, token])
  useEffect(() => {
    if (!visible || soundState === 'off') return
    let active = true
    const activate = () => {
      if (!active || !soundWanted.current || (sound.ready && soundState === 'ready') || getStoredSession()?.accessToken !== token) return
      void armSound()
    }
    const gesture = (event: Event) => { if (event.isTrusted) activate() }
    // Try immediately when allowed, otherwise the next real click/key unlocks audio.
    // Arming is silent: only actionable orders or the explicit test button make sound.
    activate()
    document.addEventListener('click', gesture, true)
    document.addEventListener('keydown', gesture, true)
    const resume = () => { if (document.visibilityState === 'visible') activate() }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', activate)
    return () => {
      active = false
      document.removeEventListener('click', gesture, true)
      document.removeEventListener('keydown', gesture, true)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('focus', activate)
    }
  }, [visible, soundState, armSound, sound, token])
  const muteSound = () => {
    soundAttempt.current++
    soundWanted.current = false
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
  const detail = error ? 'Mất đồng bộ · đang thử lại, hãy kiểm tra đơn' : alerts.some(alert => alert.status === MarketplaceOrderStatus.Requested) ? 'Có yêu cầu mua mới chờ phản hồi' : alerts.length ? 'Đơn đã nhận · cần chuẩn bị giao' : 'Đồ ăn và pass đồ'
  const requested = alerts.filter(alert => alert.status === MarketplaceOrderStatus.Requested).length
  const handoff = alerts.length - requested
  const filteredAlerts = alerts.filter(alert => filter === 'all' || (filter === 'new' ? alert.status === MarketplaceOrderStatus.Requested : alert.status === MarketplaceOrderStatus.Accepted))
  const audioSupported = typeof window.AudioContext !== 'undefined'
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
    <dialog ref={dialog} id={dialogId} className="seller-watch__dialog seller-watch__dialog--workspace" data-glass-exclude aria-labelledby="seller-watch-title" onCancel={() => setOpen(false)}>
      <header data-glass-exclude><div><h2 id="seller-watch-title">Đơn bán <span aria-hidden="true">{hasLoaded ? alerts.length : '—'}</span></h2><p>Bạn chọn nhận hoặc từ chối yêu cầu mua.</p></div><button type="button" className="seller-watch__close" aria-label="Đóng theo dõi đơn bán" onClick={() => setOpen(false)}>×</button></header>
      <div className="seller-watch__toolbar">
        <button type="button" className={`seller-watch__sound${soundState === 'ready' ? ' is-ready' : ''}`} role="switch" aria-label="Âm báo đơn" aria-checked={soundState === 'ready'} disabled={!audioSupported} onClick={soundState === 'ready' ? muteSound : () => void armSound()}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m11 5-6 4H2v6h3l6 4V5Z"/>{soundState === 'ready' ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> : <path d="m16 9 5 6m0-6-5 6"/>}</svg><span>{soundState === 'ready' ? 'Âm báo bật' : !audioSupported ? 'Chưa hỗ trợ âm' : soundState === 'off' ? 'Âm báo tắt' : 'Chạm để bật âm'}</span><span className="seller-watch__toggle" aria-hidden="true" /></button>
        <button type="button" className="seller-watch__refresh" onClick={() => refreshRef.current()} aria-label="Làm mới đơn bán"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
      {soundState === 'blocked' && audioSupported && <p className="seller-watch__audio-hint" role="status">Âm báo sẽ tự bật khi bạn tương tác với trang.</p>}
      <div className="seller-watch__filters" role="group" aria-label="Lọc đơn cần xử lý">{([
        ['all', 'Tất cả', alerts.length], ['new', 'Chờ phản hồi', requested], ['handoff', 'Đã nhận', handoff],
      ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{hasLoaded ? count : '—'}</span></button>)}</div>
      <div className="seller-watch__content">
        {error && <div className="seller-watch__error" role="alert"><strong>Chưa cập nhật được đơn</strong><p>{hasLoaded ? 'Đang hiển thị danh sách lần gần nhất. Homeji sẽ thử lại.' : 'Kiểm tra kết nối và thử tải lại.'}</p><button type="button" onClick={() => refreshRef.current()}>Thử lại</button></div>}
        {!filteredAlerts.length && <div className="seller-watch__empty" role="status"><span className="seller-watch__empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14h24l3 26H9l3-26Zm5 1v-3a7 7 0 0 1 14 0v3m-15 11 5 5 10-10"/></svg></span><h3>{error && !hasLoaded ? 'Chưa tải được đơn bán' : !hasLoaded ? 'Đang kiểm tra đơn bán…' : filter === 'new' ? 'Không có yêu cầu chờ phản hồi' : filter === 'handoff' ? 'Không có đơn chờ giao' : 'Chưa có đơn cần xử lý'}</h3><p>{error && !hasLoaded ? 'Bạn có thể thử tải lại ở phía trên.' : 'Đơn mới và đơn chờ giao sẽ xuất hiện ở đây.'}</p><Link to={sellerOrderUrl()} onClick={() => setOpen(false)}>Xem tất cả đơn bán <span aria-hidden="true">→</span></Link></div>}
        {filteredAlerts.length > 0 && <ul className="seller-watch__orders">{filteredAlerts.map(alert => <li key={alert.key}>
          <Link className="seller-watch__order-main" to={sellerOrderUrl(alert.orders[0].id)} aria-label={`Xem đơn của ${alert.buyer}, ${alert.quantity} món`} onClick={() => setOpen(false)}>
            <div className="seller-watch__order-heading"><span className={`seller-watch__stage${alert.status === MarketplaceOrderStatus.Requested ? ' is-new' : ''}`}>{alert.status === MarketplaceOrderStatus.Requested ? 'Yêu cầu mua mới' : 'Đã nhận · Chờ giao'}</span><span className="seller-watch__quantity">{alert.quantity} món</span></div>
            <div className="seller-watch__order-summary"><h3>{alert.title}</h3><strong>{formatPrice(alert.total)}</strong></div>
            <p className="seller-watch__buyer">{alert.buyer}</p>
            <div className="seller-watch__order-bottom"><p className="seller-watch__pickup">Hẹn nhận: {Number.isFinite(Date.parse(alert.pickupAt)) ? new Date(alert.pickupAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Xem trong đơn'}</p><span className="seller-watch__open">Xem chi tiết <span aria-hidden="true">→</span></span></div>
          </Link>
          {alert.status === MarketplaceOrderStatus.Requested && <SellerOrderDecision key={alert.version} alert={alert} ownerId={ownerId} token={token} />}
          <div className="seller-watch__item-actions"><button type="button" disabled={!alertNeedsSound(alert, acknowledged)} onClick={() => acknowledge(alert.key, alert.version)}>{alertNeedsSound(alert, acknowledged) ? 'Dừng nhắc âm' : 'Đã dừng nhắc'}</button></div>
        </li>)}</ul>}
        {filteredAlerts.length > 0 && <p className="seller-watch__ack-hint">Dừng nhắc âm không thay đổi đơn. Với yêu cầu mới, bạn có thể nhận hoặc từ chối.</p>}
      </div>
      <footer className="seller-watch__footer"><span className={error ? 'is-stale' : ''}>{error ? 'Chưa đồng bộ' : lastSync ? `Cập nhật ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đang kết nối…'}</span><details className="seller-watch__settings"><summary data-glass-exclude>Cài đặt thông báo</summary><div className="seller-watch__settings-body"><p>{soundState === 'ready' ? 'Âm báo đang bật. Đơn chưa dừng nhắc sẽ được nhắc lại mỗi phút.' : soundState === 'off' ? 'Bạn đã tắt âm báo. Bật lại bằng công tắc phía trên.' : audioSupported ? 'Trình duyệt đang chờ tương tác để cho phép âm thanh.' : 'Trình duyệt này chưa hỗ trợ âm báo. Bạn vẫn xem được đơn trong web.'}</p><button type="button" disabled={!audioSupported} onClick={() => void armSound(true)}>Nghe thử âm báo</button>{'Notification' in window && !desktop && <button type="button" onClick={() => {
        void Notification.requestPermission().then(permission => { setDesktop(permission === 'granted'); if (permission !== 'granted') setDesktopError('Thông báo hệ thống chưa được cho phép. Bạn vẫn nhận cảnh báo trong web.') }).catch(() => setDesktopError('Chưa bật được thông báo hệ thống.'))
      }}>Bật thông báo hệ thống</button>}{desktopError && <p role="status">{desktopError}</p>}<p>Giữ Homeji mở để nhận âm báo. Khi thiết bị ngủ hoặc đóng trình duyệt, bạn cần mở lại để kiểm tra đơn.</p></div></details></footer>
    </dialog>
  </>
}
