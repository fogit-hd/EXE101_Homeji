import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createPremiumMomoPayment,
  createPremiumPayOsPayment,
  getMySubscription,
  getPayment,
  getPaymentByOrderCode,
  getPayments,
  getSubscriptionPackages,
  type MySubscription,
  type Payment,
  type SubscriptionPackage,
} from '../api'
import { PaymentStatus, SubscriptionTier } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { MapToast } from '../components/map/MapToast'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  paymentMethodLabel,
  paymentStatusLabel,
  subscriptionTierLabel,
} from '../lib/labels'
import { getPlanDisplay, sortPlansForDisplay } from '../lib/subscriptionPlanDisplay'
import './MarketplacePage.css'
import './PaymentPage.css'

type PayTab = 'plans' | 'history'

export function PaymentPage({ embedded = false }: { embedded?: boolean }) {
  const { refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<PayTab>('plans')
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [mine, setMine] = useState<MySubscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [payPickerCode, setPayPickerCode] = useState<string | null>(null)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [busyMethod, setBusyMethod] = useState<'momo' | 'payos' | null>(null)
  const [payUrl, setPayUrl] = useState<string | null>(null)
  const [activePayment, setActivePayment] = useState<Payment | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(
    null,
  )

  const lookupId = searchParams.get('paymentId')
  const lookupOrder =
    searchParams.get('orderCode') ?? searchParams.get('orderId')

  const loadFn = useCallback(async () => {
    const [pkgList, current, history] = await Promise.all([
      getSubscriptionPackages(),
      getMySubscription(),
      getPayments({ take: 30 }).catch(() => [] as Payment[]),
    ])
    setPackages(pkgList)
    setMine(current)
    setPayments(history)
    const firstPremium = pkgList.find((p) => p.tier === SubscriptionTier.Premium)
    setSelectedCode((prev) => prev ?? firstPremium?.code ?? pkgList[0]?.code ?? null)
  }, [])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(loadFn, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    const loadLookup = async () => {
      try {
        const detail = lookupId
          ? await getPayment(lookupId)
          : lookupOrder
            ? await getPaymentByOrderCode(lookupOrder)
            : null
        if (cancelled || !detail) return
        setActivePayment(detail)
        setTab('history')
        if (detail.status === PaymentStatus.Completed) {
          await refreshProfile()
          const current = await getMySubscription()
          if (!cancelled) setMine(current)
        }
      } catch {
        /* ignore return-url lookup failures */
      }
    }
    void loadLookup()
    return () => {
      cancelled = true
    }
  }, [lookupId, lookupOrder, refreshProfile])

  const showToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone })
  }

  const startCheckout = async (packageCode: string, method: 'momo' | 'payos') => {
    setBusyCode(packageCode)
    setBusyMethod(method)
    setPayUrl(null)
    try {
      let url: string | null
      let paymentId: string

      if (method === 'momo') {
        const res = await createPremiumMomoPayment(packageCode)
        url = res.payUrl ?? res.deeplink ?? res.qrCodeUrl ?? null
        paymentId = res.paymentId
      } else {
        const res = await createPremiumPayOsPayment(packageCode)
        url = res.checkoutUrl ?? null
        paymentId = res.paymentId
      }

      setPayUrl(url)
      setPayPickerCode(null)
      const detail = await getPayment(paymentId)
      setActivePayment(detail)
      setPayments((prev) => [detail, ...prev.filter((p) => p.id !== detail.id)])
      showToast(
        method === 'momo' ? 'Đã tạo thanh toán MoMo. Mở trang để hoàn tất.' : 'Đã tạo thanh toán PayOS.',
        'success',
      )
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showToast(getErrorMessage(err, 'Không tạo được thanh toán gói'), 'error')
    } finally {
      setBusyCode(null)
      setBusyMethod(null)
    }
  }

  const refreshActivePayment = async () => {
    if (!activePayment) return
    try {
      const detail = await getPayment(activePayment.id)
      setActivePayment(detail)
      setPayments((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
      if (detail.status === PaymentStatus.Completed) {
        await refreshProfile()
        setMine(await getMySubscription())
        showToast('Thanh toán thành công. Gói Premium đã được kích hoạt.', 'success')
      } else {
        showToast(`Trạng thái: ${paymentStatusLabel[detail.status] ?? 'Đang xử lý'}`, 'info')
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Không kiểm tra được giao dịch'), 'error')
    }
  }

  if (showLoader) {
    return (
      <HomejiLoader
        fullPage={!embedded}
        label="Đang tải gói đăng ký..."
        onIntroComplete={onIntroComplete}
        message={disrupted ? error : undefined}
      />
    )
  }

  const premiumPlans = packages.filter((p) => p.tier === SubscriptionTier.Premium)
  const basicPlan = packages.find((p) => p.tier === SubscriptionTier.Basic)
  const displayPlans = sortPlansForDisplay([
    ...(basicPlan ? [basicPlan] : []),
    ...premiumPlans,
  ])

  return (
    <div className={embedded ? 'map-embed payment-embed' : 'container page payment-page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Bảng giá các gói dịch vụ</h1>
          <p className="page-subtitle">Chọn gói phù hợp và thanh toán qua MoMo hoặc PayOS</p>
        </>
      ) : null}

      {error && !disrupted ? <div className="alert alert-error">{error}</div> : null}

      <section className="payment-current map-motion-fade-up">
        <div>
          <p className="payment-current__label">Gói hiện tại</p>
          <strong className="payment-current__badge">
            {mine ? subscriptionTierLabel[mine.tier] ?? mine.badge : 'Standard'}
          </strong>
          {mine?.isPremium && mine.packageName ? (
            <p className="payment-current__meta">{mine.packageName}</p>
          ) : (
            <p className="payment-current__meta">Đang dùng gói miễn phí</p>
          )}
        </div>
        <div className="payment-current__side">
          {mine?.premiumExpiresAt ? (
            <p className="payment-current__meta">Hết hạn {formatDate(mine.premiumExpiresAt)}</p>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
            Làm mới
          </button>
        </div>
      </section>

      <div
        className="tabs map-section-tabs"
        style={{ ['--map-tab-cols' as string]: 2 }}
        role="tablist"
        aria-label="Gói và giao dịch"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plans'}
          className={`tab ${tab === 'plans' ? 'active' : ''}`}
          onClick={() => setTab('plans')}
        >
          Đăng ký gói
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Giao dịch
        </button>
      </div>

      {tab === 'plans' ? (
        <div className="payment-plans map-motion-fade-up">
          <p className="payment-plans__heading">Bảng giá các gói dịch vụ</p>

          {displayPlans.map((plan) => {
            const view = getPlanDisplay(plan)
            const isPremium = plan.tier === SubscriptionTier.Premium && plan.price > 0
            const selected = selectedCode === plan.code
            const isCurrent = isPremium
              ? !!(mine?.isPremium && mine.packageCode === plan.code)
              : !mine?.isPremium
            const busy = busyCode === plan.code
            const pickingPay = payPickerCode === plan.code

            return (
              <article
                key={plan.code}
                className={[
                  'payment-plan-card',
                  isPremium ? 'is-premium' : 'is-basic',
                  selected ? 'is-selected' : '',
                  isCurrent ? 'is-current' : '',
                  view.highlight === 'popular' ? 'is-popular' : '',
                  view.highlight === 'best-value' ? 'is-best-value' : '',
                  pickingPay ? 'is-picking-pay' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="payment-plan-card__grid">
                  <div className="payment-plan-card__main">
                    <button
                      type="button"
                      className="payment-plan-card__select-head"
                      onClick={() => {
                        setSelectedCode(plan.code)
                        if (pickingPay) setPayPickerCode(null)
                      }}
                    >
                      <div className="payment-plan-card__title-row">
                        <h3>{view.title}</h3>
                        <span
                          className={`payment-plan-card__badge is-${view.tierTagTone}`}
                        >
                          {view.tierTag}
                        </span>
                        {view.highlightLabel ? (
                          <span
                            className={`payment-plan-card__highlight is-${view.highlight ?? 'popular'}`}
                          >
                            {view.highlightLabel}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    <div className="payment-plan-card__body">
                      <ul>
                        {view.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>

                    {view.note ? (
                      <p className="payment-plan-card__note">{view.note}</p>
                    ) : null}
                  </div>

                  <div className="payment-plan-card__aside">
                    <button
                      type="button"
                      className="payment-plan-card__price-block"
                      onClick={() => {
                        setSelectedCode(plan.code)
                        if (pickingPay) setPayPickerCode(null)
                      }}
                    >
                      <p className="payment-plan-card__price">
                        {view.headlinePrice}
                        {view.headlineSuffix ? (
                          <small>{view.headlineSuffix}</small>
                        ) : null}
                      </p>
                      {view.totalLine ? (
                        <p className="payment-plan-card__total">{view.totalLine}</p>
                      ) : null}
                      {view.savingsLabel ? (
                        <p className="payment-plan-card__savings">{view.savingsLabel}</p>
                      ) : null}
                    </button>

                    <div className="payment-plan-card__actions">
                      {!isPremium ? (
                        <span className="payment-plan-card__current is-free">Đang áp dụng</span>
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
                          className="btn btn-primary btn-sm payment-plan-card__buy"
                          disabled={busy}
                          onClick={() => {
                            setSelectedCode(plan.code)
                            setPayPickerCode(plan.code)
                          }}
                        >
                          Mua ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}

          {premiumPlans.length === 0 ? (
            <div className="empty-state card">Chưa có gói Premium để đăng ký.</div>
          ) : null}

          {(payUrl || activePayment) && tab === 'plans' ? (
            <aside className="payment-checkout card">
              <h3>Thanh toán đang mở</h3>
              {payUrl ? (
                <a href={payUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  Mở lại trang thanh toán
                </a>
              ) : null}
              {activePayment ? (
                <dl className="detail-facts">
                  <div>
                    <dt>Mã đơn</dt>
                    <dd>{activePayment.orderCode}</dd>
                  </div>
                  <div>
                    <dt>Phương thức</dt>
                    <dd>{paymentMethodLabel[activePayment.method]}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>{paymentStatusLabel[activePayment.status]}</dd>
                  </div>
                  <div>
                    <dt>Số tiền</dt>
                    <dd>{formatPrice(activePayment.amount)}</dd>
                  </div>
                </dl>
              ) : null}
              {activePayment ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshActivePayment()}>
                  Kiểm tra trạng thái
                </button>
              ) : null}
            </aside>
          ) : null}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="payment-history map-motion-fade-up">
          {activePayment ? (
            <aside className="payment-checkout card">
              <h3>Chi tiết giao dịch</h3>
              <dl className="detail-facts">
                <div>
                  <dt>Mã đơn</dt>
                  <dd>{activePayment.orderCode}</dd>
                </div>
                <div>
                  <dt>Phương thức</dt>
                  <dd>{paymentMethodLabel[activePayment.method]}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{paymentStatusLabel[activePayment.status]}</dd>
                </div>
                <div>
                  <dt>Số tiền</dt>
                  <dd>{formatPrice(activePayment.amount)}</dd>
                </div>
                <div>
                  <dt>Tạo lúc</dt>
                  <dd>{formatDate(activePayment.createdAt)}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshActivePayment()}>
                Kiểm tra trạng thái
              </button>
            </aside>
          ) : null}

          {payments.length === 0 ? (
            <div className="empty-state card">Chưa có giao dịch nào.</div>
          ) : (
            <ul className="payment-history__list">
              {payments.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`payment-history__row${activePayment?.id === p.id ? ' is-active' : ''}`}
                    onClick={() => setActivePayment(p)}
                  >
                    <div>
                      <strong>{formatPrice(p.amount)}</strong>
                      <small>
                        {paymentMethodLabel[p.method]} · {p.orderCode}
                      </small>
                    </div>
                    <div className="payment-history__right">
                      <span className={`payment-status is-${p.status}`}>
                        {paymentStatusLabel[p.status]}
                      </span>
                      <small>{formatDate(p.createdAt)}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <MapToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? 'info'}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
