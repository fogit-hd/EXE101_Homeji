import { ChoicePicker } from '../components/ui/ChoicePicker'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
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
import { PaymentsSkeleton } from '../components/skeletons/PageSkeletons'
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
import { RevealText } from '../components/motion/RevealText'

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
        <PaymentsSkeleton />
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

  const pendingPayment = payments.find((payment) => payment.status === PaymentStatus.Pending) ?? null
  const planName = (payment: Payment) =>
    payment.packageCode ? packages.find((plan) => plan.code === payment.packageCode)?.name ?? payment.description : payment.description

  return (
    <div className={`payment-page pay-v2${embedded ? ' payment-embed map-embed' : ' container page'}`}>
      <header className="pay-head">
        <RevealText as="h1" className="pay-head__title" text="Gói thành viên" />
        <p className="pay-head__lead">
          {tab === 'history'
            ? 'Theo dõi thanh toán và quản lý gói thành viên ở cùng một nơi.'
            : 'Nâng cấp khi bạn cần thêm lợi thế trong hành trình tìm nhà — không ràng buộc dài hạn.'}
        </p>
      </header>

      <PageNotice message={error && !disrupted ? error : ''} tone="error" />
      <PageNotice message={subscriptionError} tone="error" />

      <section className="pay-current" aria-label="Gói hiện tại">
        <span className="pay-current__icon" aria-hidden="true"><ShellIcon name="shield" /></span>
        <div className="pay-current__copy">
          <p className="pay-label">Gói hiện tại</p>
          <p className="pay-current__name">
            <strong>{currentLabel}</strong>
            <span className={`pay-pill${current.premium === null ? '' : ' is-green'}`}>
              {current.premium === null ? 'Chưa tải được' : 'Đang dùng'}
            </span>
          </p>
          <p className="pay-current__meta">
            {mine?.premiumExpiresAt
              ? `Hết hạn ${formatDate(mine.premiumExpiresAt)}`
              : mine?.isPremium
                ? 'Quyền lợi Premium đang được kích hoạt cho tài khoản của bạn.'
                : 'Chọn gói Premium để bài đăng được ưu tiên và có badge Cao cấp.'}
          </p>
        </div>
        <button type="button" className="pay-btn" onClick={() => void reload()}>Làm mới</button>
      </section>

      <div className="pay-tabs" role="tablist" aria-label="Gói và giao dịch">
        {(['plans', 'history'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'is-active' : ''}
            onClick={() => setTab(value)}
          >
            {tab === value ? (
              <motion.span layoutId="pay-tab-pill" className="pay-tabs__pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            ) : null}
            <span className="pay-tabs__text">
              {value === 'plans' ? 'Đăng ký gói' : 'Giao dịch'}
              {value === 'history' && pendingCount > 0 ? <em>{pendingCount}</em> : null}
            </span>
          </button>
        ))}
      </div>

      {tab === 'plans' ? (
        <div className="pay-plans">
          <div className="pay-plan-grid" style={{ ['--pay-cols' as string]: String(Math.max(1, Math.min(4, displayPlans.length))) }}>
            {displayPlans.map((plan, index) => {
              const view = getPlanDisplay(plan)
              const isPremium = plan.tier === SubscriptionTier.Premium && plan.price > 0
              const isCurrent = isPremium
                ? !!(current.premium && current.code === plan.code.trim().toUpperCase())
                : current.premium === false
              const busy = busyCode !== null
              const pickingPay = payPickerCode === plan.code
              const featured = view.highlight === 'popular'

              return (
                <motion.article
                  key={plan.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={[
                    'pay-plan',
                    featured ? 'is-featured' : '',
                    selectedCode === plan.code ? 'is-selected' : '',
                    isCurrent ? 'is-current' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {view.highlightLabel ? (
                    <span className={`pay-plan__ribbon${featured ? '' : ' is-dark'}`}>{view.highlightLabel}</span>
                  ) : null}
                  <h3>{plan.name}</h3>
                  <p className="pay-plan__duration">
                    {isPremium ? `${plan.durationDays} ngày` : view.note ?? 'Mặc định cho mọi tài khoản'}
                  </p>
                  <p className="pay-plan__price">
                    {isPremium ? view.headlinePrice : '0 ₫'}
                    <small>{isPremium ? view.headlineSuffix || '/ tháng' : '/ mãi mãi'}</small>
                  </p>
                  <p className="pay-plan__total">
                    {isPremium ? (
                      <>
                        Thanh toán {formatPrice(plan.price)}
                        {view.savingsLabel ? <> · <b>{view.savingsLabel}</b></> : null}
                      </>
                    ) : '\u00a0'}
                  </p>
                  <ul>
                    {view.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                  </ul>

                  <div className="pay-plan__actions">
                    {!isPremium ? (
                      <span className="pay-btn pay-btn--current">{isCurrent ? '✓ Gói hiện tại' : 'Gói miễn phí'}</span>
                    ) : isCurrent ? (
                      <span className="pay-btn pay-btn--current">✓ Đang dùng</span>
                    ) : pickingPay ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pay-plan__methods"
                        role="group"
                        aria-label="Chọn hình thức thanh toán"
                      >
                        <div>
                          <button type="button" className="pay-method is-momo" disabled={busy} onClick={() => void startCheckout(plan.code, 'momo')}>
                            {busy && busyMethod === 'momo' ? 'Đang tạo…' : 'MoMo'}
                          </button>
                          <button type="button" className="pay-method is-payos" disabled={busy} onClick={() => void startCheckout(plan.code, 'payos')}>
                            {busy && busyMethod === 'payos' ? 'Đang tạo…' : 'PayOS'}
                          </button>
                        </div>
                        <button type="button" className="pay-plan__cancel" disabled={busy} onClick={() => setPayPickerCode(null)}>
                          Hủy
                        </button>
                      </motion.div>
                    ) : (
                      <button
                        type="button"
                        className="pay-btn pay-btn--primary"
                        disabled={busy}
                        onClick={() => {
                          setSelectedCode(plan.code)
                          setPayPickerCode(plan.code)
                        }}
                      >
                        Chọn gói
                      </button>
                    )}
                  </div>
                </motion.article>
              )
            })}
          </div>

          {premiumPlans.length === 0 ? (
            <div className="pay-empty-line">Chưa có gói Premium để đăng ký.</div>
          ) : null}

          <section className="pay-compare" aria-labelledby="pay-compare-title">
            <h2 id="pay-compare-title" className="sr-only">So sánh quyền lợi</h2>
            <table>
              <thead>
                <tr><th scope="col">Quyền lợi</th><th scope="col">Standard</th><th scope="col">Premium</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Tìm kiếm &amp; lưu phòng</th><td>Không giới hạn</td><td>Không giới hạn</td></tr>
                <tr><th scope="row">Thông báo phòng mới</th><td>1 khu vực</td><td className="is-accent">10 khu vực</td></tr>
                <tr><th scope="row">So sánh phòng</th><td>3 phòng</td><td className="is-accent">Không giới hạn</td></tr>
              </tbody>
            </table>
          </section>
          <p className="pay-foot"><ShellIcon name="shield" />Thanh toán qua MoMo hoặc PayOS · Đơn chưa thanh toán tự hủy sau 15 phút</p>
        </div>
      ) : null}

      {tab === 'history' ? (
        <section className="pay-history" aria-label="Lịch sử giao dịch">
          {pendingPayment ? (
            <div className="pay-pending">
              <span className="pay-pill is-amber">Chờ thanh toán</span>
              <p>
                <strong>{planName(pendingPayment)} · {formatPrice(pendingPayment.amount)}</strong>
                <span> — tự hủy sau 15 phút kể từ lúc tạo</span>
              </p>
              <Link className="pay-btn pay-btn--primary" to={paymentWaitingUrl(pendingPayment.id)}>Tiếp tục thanh toán →</Link>
            </div>
          ) : null}

          <div className="pay-stats">
            <div><span className="pay-label">Đã thanh toán</span><strong>{historyError ? '—' : formatPrice(paidTotal)}</strong><small>{historyError ? 'Chưa cập nhật được dữ liệu' : `${paidPayments.length} giao dịch hoàn tất`}</small></div>
            <div><span className="pay-label">Chờ thanh toán</span><strong>{historyError ? '—' : String(pendingCount)}</strong><small>Tự hủy sau 15 phút</small></div>
            <div><span className="pay-label">Gần đây</span><strong>{historyError ? '—' : String(payments.length)}</strong><small>Tối đa 30 giao dịch mới nhất</small></div>
          </div>

          <div className={`pay-history__layout${activePayment ? '' : ' is-single'}`}>
            <div className="pay-history__card">
              <div className="pay-history__toolbar">
                <h2>Lịch sử giao dịch</h2>
                <label className="pay-filter">
                  <span className="sr-only">Lọc trạng thái giao dịch</span>
                  <ChoicePicker value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value={PaymentStatus.Pending}>Chờ thanh toán</option>
                    <option value={PaymentStatus.Completed}>Hoàn tất</option>
                    <option value={PaymentStatus.Cancelled}>Đã hủy</option>
                    <option value={PaymentStatus.Failed}>Thất bại</option>
                    <option value={PaymentStatus.Expired}>Hết hạn</option>
                  </ChoicePicker>
                </label>
              </div>
              {historyError && <p className="payment-inline-error" role="alert">{historyError}</p>}
              {historyError && payments.length === 0 ? (
                <div className="pay-empty"><ShellIcon name="receipt" /><h3>Chưa thể tải giao dịch</h3><p>Không thể xác định lịch sử trong lần kiểm tra này.</p><button type="button" className="pay-btn pay-btn--primary" onClick={() => void reload()}>Thử lại</button></div>
              ) : filteredPayments.length === 0 ? (
                <div className="pay-empty"><ShellIcon name="receipt" /><h3>{payments.length === 0 ? 'Chưa có giao dịch' : 'Không có giao dịch phù hợp'}</h3><p>{payments.length === 0 ? 'Giao dịch sẽ xuất hiện tại đây khi bạn đăng ký gói.' : 'Thử chọn một trạng thái khác để xem giao dịch.'}</p>{payments.length === 0 && <button type="button" className="pay-btn pay-btn--primary" onClick={() => setTab('plans')}>Khám phá các gói</button>}</div>
              ) : (
                <div className="pay-table" role="list">
                  <div className="pay-table__head" aria-hidden="true">
                    <span>Gói</span><span>Phương thức</span><span>Thời gian</span><span className="is-num">Số tiền</span><span>Trạng thái</span>
                  </div>
                  {filteredPayments.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="listitem"
                      className={`pay-table__row${activePayment?.id === p.id ? ' is-active' : ''}`}
                      onClick={() => setActiveId(p.id)}
                      aria-pressed={activePayment?.id === p.id}
                    >
                      <span className="pay-table__plan"><strong>{planName(p)}</strong><small>{p.orderCode}</small></span>
                      <span className="pay-table__method"><i className={`pay-logo is-${p.method}`} aria-hidden="true">{p.method === 1 ? 'M' : 'P'}</i>{paymentMethodLabel[p.method]}</span>
                      <span className="pay-table__time">{formatDate(p.createdAt)}</span>
                      <span className="pay-table__amount">{formatPrice(p.amount)}</span>
                      <span className="pay-table__status"><PaymentStatusBadge status={p.status} /></span>
                    </button>
                  ))}
                </div>
              )}
              <p className="pay-foot is-left"><ShellIcon name="shield" />Trạng thái thanh toán được xác nhận bởi hệ thống. Chọn một giao dịch để xem chi tiết.</p>
            </div>
            {activePayment && (
              <aside className="payment-detail-card pay-detail">
                <PaymentDetails payment={activePayment} />
                {activePayment.status === PaymentStatus.Pending ? (
                  <>
                    <div className="payment-detail-note is-pending"><p>Đơn tự hủy nếu chưa thanh toán trong 15 phút kể từ lúc tạo.</p></div>
                    <Link className="pay-btn pay-btn--primary" to={paymentWaitingUrl(activePayment.id)}>Tiếp tục thanh toán →</Link>
                  </>
                ) : activePayment.status === PaymentStatus.Cancelled || activePayment.status === PaymentStatus.Expired ? (
                  <div className="payment-detail-note"><p>{activePayment.providerMessage || 'Đơn đã hủy. Bạn có thể tạo một giao dịch mới.'}</p></div>
                ) : null}
                <button type="button" className="pay-btn" disabled={checking} onClick={() => void refreshActivePayment()}>
                  {checking ? 'Đang kiểm tra…' : 'Cập nhật trạng thái'}
                </button>
              </aside>
            )}
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
