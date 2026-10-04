import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  createPremiumMomoPayment,
  createPremiumPayOsPayment,
  getMySubscription,
  getPayment,
  getPayments,
  getSubscriptionPackages,
  type MySubscription,
  type Payment,
  type SubscriptionPackage,
} from '../api'
import { PaymentStatus, SubscriptionTier } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { MapToast } from '../components/map/MapToast'
import { PaymentDetails, PaymentStatusBadge } from '../components/payments/PaymentDetails'
import { ShellIcon } from '../components/shell/ShellIcons'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  paymentMethodLabel,
} from '../lib/labels'
import { getPlanDisplay, sortPlansForDisplay } from '../lib/subscriptionPlanDisplay'
import { paymentWaitingUrl } from '../lib/paymentLifecycle'
import { currentSubscription } from '../lib/currentSubscription'
import './MarketplacePage.css'
import './PaymentPage.css'

type PayTab = 'plans' | 'history'

export function PaymentPage({ embedded = false }: { embedded?: boolean }) {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: PayTab = searchParams.get('tab') === 'history' ? 'history' : 'plans'
  const setTab = (value: PayTab) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous)
    next.set('tab', value)
    return next
  }, { replace: true })
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [mine, setMine] = useState<MySubscription | null>(null)
  const [subscriptionError, setSubscriptionError] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [payPickerCode, setPayPickerCode] = useState<string | null>(null)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [busyMethod, setBusyMethod] = useState<'momo' | 'payos' | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [checking, setChecking] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(
    null,
  )

  const lookupId = searchParams.get('paymentId')
  const lookupOrder =
    searchParams.get('orderCode') ?? searchParams.get('orderId')

  const loadFn = useCallback(async () => {
    const [catalog, current, history] = await Promise.allSettled([
      getSubscriptionPackages(),
      getMySubscription(),
      getPayments({ take: 30 }),
    ])
    if (catalog.status === 'fulfilled') {
      setPackages(catalog.value)
      const firstPremium = catalog.value.find((p) => p.tier === SubscriptionTier.Premium)
      setSelectedCode((prev) => prev ?? firstPremium?.code ?? catalog.value[0]?.code ?? null)
    }
    if (current.status === 'fulfilled') {
      setMine(current.value)
      setSubscriptionError('')
    } else {
      setMine(null)
      setSubscriptionError('Chưa kiểm tra được gói hiện tại. Vui lòng làm mới; hệ thống không tự coi tài khoản là Free.')
    }
    if (history.status === 'fulfilled') {
      setPayments(history.value)
      setHistoryError('')
    }
    else setHistoryError('Chưa tải được lịch sử thanh toán. Gói hiện tại vẫn được kiểm tra riêng.')
    if (catalog.status === 'rejected') throw catalog.reason
  }, [])

  useEffect(() => {
    let disposed = false
    let checkingSubscription = false
    const check = async () => {
      if (checkingSubscription || document.hidden) return
      checkingSubscription = true
      try {
        const snapshot = await getMySubscription()
        if (!disposed) {
          setMine(snapshot)
          setSubscriptionError('')
          await refreshProfile()
        }
      } catch {
        if (!disposed) setSubscriptionError('Không thể cập nhật gói. Thông tin bên dưới là lần kiểm tra gần nhất.')
      } finally { checkingSubscription = false }
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => { disposed = true; window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  }, [refreshProfile])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(loadFn, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (lookupId || lookupOrder) {
      const params = new URLSearchParams()
      if (lookupId) params.set('paymentId', lookupId)
      else if (lookupOrder) params.set('orderCode', lookupOrder)
      navigate(`/payments/wait?${params.toString()}`, { replace: true })
    }
  }, [lookupId, lookupOrder, navigate])

  const hasPending = payments.some((payment) => payment.status === PaymentStatus.Pending)
  useEffect(() => {
    if (tab !== 'history' || !hasPending) return
    let disposed = false
    let inFlight = false
    const update = async () => {
      if (inFlight || document.visibilityState !== 'visible') return
      inFlight = true
      try {
        const history = await getPayments({ take: 30 })
        if (!disposed) {
          setPayments(history)
          setHistoryError('')
        }
      } catch (err) {
        if (!disposed) setHistoryError(getErrorMessage(err, 'Chưa thể cập nhật giao dịch.'))
      } finally {
        inFlight = false
      }
    }
    const timer = window.setInterval(() => void update(), 10000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('online', update)
    return () => {
      disposed = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('online', update)
    }
  }, [tab, hasPending])

  const showToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone })
  }

  const startCheckout = async (packageCode: string, method: 'momo' | 'payos') => {
    if (busyCode) return
    setBusyCode(packageCode)
    setBusyMethod(method)
    try {
      const res = method === 'momo'
        ? await createPremiumMomoPayment(packageCode)
        : await createPremiumPayOsPayment(packageCode)
      setPayPickerCode(null)
      navigate(paymentWaitingUrl(res.paymentId))
    } catch (err) {
      showToast(getErrorMessage(err, 'Không tạo được thanh toán gói'), 'error')
    } finally {
      setBusyCode(null)
      setBusyMethod(null)
    }
  }

  const refreshActivePayment = async () => {
    if (!activePayment || checking) return
    setChecking(true)
    try {
      const detail = await getPayment(activePayment.id)
      setPayments((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
      setHistoryError('')
      if (detail.status === PaymentStatus.Completed) {
        await refreshProfile()
        setMine(await getMySubscription())
        showToast('Thanh toán thành công. Gói Premium đã được kích hoạt.', 'success')
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Không kiểm tra được giao dịch'), 'error')
    } finally {
      setChecking(false)
    }
  }

  if (showLoader) {
    return disrupted ? (
      <HomejiLoader
        fullPage={!embedded}
        label="Đang tải gói đăng ký..."
        onIntroComplete={onIntroComplete}
        message={error}
      />
    ) : (
      <main className={embedded ? 'map-embed payment-embed' : 'container page payment-page'}>
        <ContentSkeleton variant="dashboard" count={3} label="Đang tải gói đăng ký…" />
      </main>
    )
  }

  const premiumPlans = packages.filter((p) => p.tier === SubscriptionTier.Premium)
  const basicPlan = packages.find((p) => p.tier === SubscriptionTier.Basic)
  const displayPlans = sortPlansForDisplay([
    ...(basicPlan ? [basicPlan] : []),
    ...premiumPlans,
  ])

  const current = currentSubscription(mine)
  const currentLabel = current.label

  const filteredPayments = payments.filter((payment) => statusFilter === 'all' || String(payment.status) === statusFilter)
  const activePayment = filteredPayments.find((payment) => payment.id === activeId) ?? filteredPayments[0] ?? null
  const pendingCount = payments.filter((payment) => payment.status === PaymentStatus.Pending).length
  const paidPayments = payments.filter((payment) => payment.status === PaymentStatus.Completed)
  const paidTotal = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className={`payment-page${embedded ? ' payment-embed map-embed' : ' container page'}`}>
      <header className="payment-page-header">
        <span className="payment-page-eyebrow">HOMEJI MEMBERSHIP</span>
        <h1 className="payment-page-title">{tab === 'history' ? 'Giao dịch của bạn' : 'Tìm nhanh hơn. Chọn tự tin hơn.'}</h1>
        <p className="payment-page-lead">
          {tab === 'history' ? 'Theo dõi thanh toán và quản lý gói thành viên ở cùng một nơi.' : 'Nâng cấp khi bạn cần thêm lợi thế trong hành trình tìm nhà — không ràng buộc dài hạn.'}
        </p>
      </header>

      <PageNotice message={error && !disrupted ? error : ''} tone="error" />
      <PageNotice message={subscriptionError} tone="error" />

      <section className="payment-current map-motion-fade-up">
        <div className="payment-current__left">
          <p className="payment-current__label">GÓI HIỆN TẠI</p>
          <div className="payment-current__name-row">
            <strong className="payment-current__badge">{currentLabel}</strong>
            <span className="payment-current__live">{current.premium === null ? 'CHƯA TẢI ĐƯỢC' : 'ĐANG DÙNG'}</span>
          </div>
          {mine?.premiumExpiresAt ? (
            <p className="payment-current__meta">Hết hạn {formatDate(mine.premiumExpiresAt)}</p>
          ) : null}
        </div>
        <div className="payment-current__benefit"><ShellIcon name="shield" /><p>{mine?.isPremium ? 'Quyền lợi Premium đang được kích hoạt cho tài khoản của bạn.' : 'Chọn gói phù hợp để có thêm lợi thế khi tìm nhà.'}</p></div>
        <button type="button" className="payment-current__refresh" onClick={() => void reload()}>
          Làm mới
        </button>
      </section>

      <div
        className="payment-tabs"
        role="tablist"
        aria-label="Gói và giao dịch"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plans'}
          className={tab === 'plans' ? 'is-active' : ''}
          onClick={() => setTab('plans')}
        >
          Đăng ký gói
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'is-active' : ''}
          onClick={() => setTab('history')}
        >
          Giao dịch
        </button>
      </div>

      {tab === 'plans' ? (
        <div className="payment-plans map-motion-fade-up">
          <div className="payment-plan-grid">
          {displayPlans.map((plan) => {
            const view = getPlanDisplay(plan)
            const isPremium = plan.tier === SubscriptionTier.Premium && plan.price > 0
            const selected = selectedCode === plan.code
            const isCurrent = isPremium
              ? !!(current.premium && current.code === plan.code.trim().toUpperCase())
              : current.premium === false
            const busy = busyCode !== null
            const pickingPay = payPickerCode === plan.code
            const featured = view.highlight === 'popular' || (isPremium && !view.highlight)

            return (
              <article
                key={plan.code}
                className={[
                  'payment-plan-card',
                  isPremium ? 'is-premium' : 'is-basic',
                  featured ? 'is-featured' : '',
                  selected ? 'is-selected' : '',
                  isCurrent ? 'is-current' : '',
                  view.highlight === 'popular' ? 'is-popular' : '',
                  view.highlight === 'best-value' ? 'is-best-value' : '',
                  pickingPay ? 'is-picking-pay' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {featured || view.highlightLabel ? (
                  <span className="payment-plan-card__ribbon">
                    {view.highlightLabel || 'ĐƯỢC CHỌN NHIỀU'}
                  </span>
                ) : null}

                <h3>{plan.name}</h3>
                <p className="payment-plan-card__price">
                  {isPremium ? (
                    <>
                      {view.headlinePrice}
                      <small>{view.headlineSuffix || '/ tháng'}</small>
                    </>
                  ) : (
                    <>0đ <small>/ mãi mãi</small></>
                  )}
                </p>
                {view.savingsLabel ? (
                  <p className="payment-plan-card__savings">{view.savingsLabel}</p>
                ) : view.totalLine ? (
                  <p className="payment-plan-card__total">{view.totalLine}</p>
                ) : isPremium ? (
                  <p className="payment-plan-card__total">Tiết kiệm khi trả theo năm</p>
                ) : null}

                <ul>
                  {view.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>

                <div className="payment-plan-card__actions">
                  {!isPremium ? (
                    <span className="payment-plan-card__current is-free">{isCurrent ? '✓ Gói hiện tại' : 'Gói miễn phí'}</span>
                  ) : isCurrent ? (
                    <span className="payment-plan-card__current">Đang dùng</span>
                  ) : pickingPay ? (
                    <div
                      className="payment-plan-card__pay-options"
                      role="group"
                      aria-label="Chọn hình thức thanh toán"
                    >
                      <button
                        type="button"
                        className="btn btn-sm payment-plan-card__momo"
                        disabled={busy}
                        onClick={() => void startCheckout(plan.code, 'momo')}
                      >
                        {busy && busyMethod === 'momo' ? 'Đang tạo…' : 'MoMo'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => void startCheckout(plan.code, 'payos')}
                      >
                        {busy && busyMethod === 'payos' ? 'Đang tạo…' : 'PayOS'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => setPayPickerCode(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="payment-plan-card__buy"
                      disabled={busy}
                      onClick={() => {
                        setSelectedCode(plan.code)
                        setPayPickerCode(plan.code)
                      }}
                    >
                      Nâng cấp lên Pro
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          <aside className="payment-insight-card" aria-label="Pro Insight">
            <span className="payment-insight-card__tag">PRO INSIGHT</span>
            <h3>Biết phòng tốt ngay khi vừa xuất hiện</h3>
            <div className="payment-insight-card__mock">
              <strong>96% match</strong>
              <p>Phòng mới tại Bình Thạnh · 6,5 triệu</p>
            </div>
            <p className="payment-insight-card__foot">Hủy bất kỳ lúc nào · Thanh toán an toàn</p>
          </aside>
          </div>

          {premiumPlans.length === 0 ? (
            <div className="empty-state card">Chưa có gói Premium để đăng ký.</div>
          ) : null}

          <section className="payment-compare" aria-label="So sánh quyền lợi">
            <h2>So sánh quyền lợi</h2>
            <div className="payment-compare__table" role="table">
              <div className="payment-compare__row" role="row">
                <span role="cell">Tìm kiếm &amp; lưu phòng</span>
                <span role="cell">Không giới hạn</span>
                <span role="cell">Không giới hạn</span>
              </div>
              <div className="payment-compare__row" role="row">
                <span role="cell">Thông báo phòng mới</span>
                <span role="cell">1 khu vực</span>
                <span role="cell" className="is-accent">10 khu vực</span>
              </div>
              <div className="payment-compare__row" role="row">
                <span role="cell">So sánh phòng</span>
                <span role="cell">3 phòng</span>
                <span role="cell" className="is-accent">Không giới hạn</span>
              </div>
            </div>
          </section>

        </div>
      ) : null}

      {tab === 'history' ? (
        <section className="payment-history map-motion-fade-up" aria-label="Lịch sử giao dịch">
          <div className="payment-summary">
            <div><span className="payment-summary__icon"><ShellIcon name="wallet" /></span><span>Đã thanh toán<strong>{historyError ? '—' : formatPrice(paidTotal)}</strong><small>{historyError ? 'Chưa cập nhật được dữ liệu' : `${paidPayments.length} giao dịch hoàn tất`}</small></span></div>
            <div><span className="payment-summary__icon is-pending"><ShellIcon name="card" /></span><span>Chờ thanh toán<strong>{historyError ? '—' : String(pendingCount)}</strong><small>Tự hủy sau 15 phút</small></span></div>
            <div><span className="payment-summary__icon"><ShellIcon name="receipt" /></span><span>Giao dịch gần đây<strong>{historyError ? '—' : String(payments.length)}</strong><small>Tối đa 30 giao dịch mới nhất</small></span></div>
          </div>
          <div className="payment-history-layout">
            <div className="payment-history-card">
              <div className="payment-history-toolbar">
                <div><h2>Lịch sử giao dịch</h2><p>Chọn giao dịch để xem chi tiết.</p></div>
                <label className="payment-filter"><span className="sr-only">Lọc trạng thái giao dịch</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">Tất cả trạng thái</option><option value={PaymentStatus.Pending}>Chờ thanh toán</option><option value={PaymentStatus.Completed}>Hoàn tất</option><option value={PaymentStatus.Cancelled}>Đã hủy</option><option value={PaymentStatus.Failed}>Thất bại</option><option value={PaymentStatus.Expired}>Hết hạn</option>
                </select></label>
              </div>
              {historyError && <p className="payment-inline-error" role="alert">{historyError}</p>}
              {historyError && payments.length === 0 ? (
                <div className="payment-empty"><ShellIcon name="receipt" /><h3>Chưa thể tải giao dịch</h3><p>Không thể xác định lịch sử trong lần kiểm tra này.</p><button type="button" className="payment-button" onClick={() => void reload()}>Thử lại</button></div>
              ) : filteredPayments.length === 0 ? (
                <div className="payment-empty"><ShellIcon name="receipt" /><h3>{payments.length === 0 ? 'Chưa có giao dịch' : 'Không có giao dịch phù hợp'}</h3><p>{payments.length === 0 ? 'Giao dịch sẽ xuất hiện tại đây khi bạn đăng ký gói.' : 'Thử chọn một trạng thái khác để xem giao dịch.'}</p>{payments.length === 0 && <button className="payment-button" onClick={() => setTab('plans')}>Khám phá các gói</button>}</div>
              ) : (
                <ul className="payment-history__list">
                  {filteredPayments.map((p) => (
                    <li key={p.id}>
                      <button type="button" className={`payment-history__row${activePayment?.id === p.id ? ' is-active' : ''}`} onClick={() => setActiveId(p.id)} aria-pressed={activePayment?.id === p.id}>
                        <span className={`payment-provider is-${p.method}`} aria-hidden="true">{p.method === 1 ? 'M' : 'P'}</span>
                        <span className="payment-history__identity"><strong>{p.packageCode ? packages.find((plan) => plan.code === p.packageCode)?.name ?? p.description : p.description}</strong><small>{paymentMethodLabel[p.method]} · {p.orderCode}</small><small>{formatDate(p.createdAt)}</small></span>
                        <span className="payment-history__right"><strong>{formatPrice(p.amount)}</strong><PaymentStatusBadge status={p.status} /></span>
                        <span className="payment-history__arrow" aria-hidden="true">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="payment-history-caption"><ShellIcon name="shield" />Trạng thái thanh toán được xác nhận bởi hệ thống.</p>
            </div>
            {activePayment && <aside className="payment-detail-card"><PaymentDetails payment={activePayment} />
              {activePayment.status === PaymentStatus.Pending ? <>
                <div className="payment-detail-note is-pending"><p>Đơn tự hủy nếu chưa thanh toán trong 15 phút kể từ lúc tạo.</p></div>
                <Link className="payment-button" to={paymentWaitingUrl(activePayment.id)}>Tiếp tục thanh toán →</Link>
              </> : activePayment.status === PaymentStatus.Cancelled || activePayment.status === PaymentStatus.Expired ? <div className="payment-detail-note"><p>{activePayment.providerMessage || 'Đơn đã hủy. Bạn có thể tạo một giao dịch mới.'}</p></div> : null}
              <button type="button" className="payment-button is-secondary" disabled={checking} onClick={() => void refreshActivePayment()}>{checking ? 'Đang kiểm tra…' : 'Cập nhật trạng thái'}</button>
            </aside>}
          </div>
        </section>
      ) : null}

      <MapToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? 'info'}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
