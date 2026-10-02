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
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
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

  const currentLabel = mine?.isPremium
    ? mine.packageName || subscriptionTierLabel[mine.tier] || 'Pro'
    : 'Homeji Free'

  return (
    <div className={`payment-page${embedded ? ' payment-embed map-embed' : ' container page'}`}>
      <header className="payment-page-header">
        <span className="payment-page-eyebrow">HOMEJI MEMBERSHIP</span>
        <h1 className="payment-page-title">Tìm nhanh hơn. Chọn tự tin hơn.</h1>
        <p className="payment-page-lead">
          Nâng cấp khi bạn cần thêm lợi thế trong hành trình tìm nhà — không ràng buộc dài hạn.
        </p>
      </header>

      <PageNotice message={error && !disrupted ? error : ''} tone="error" />

      <section className="payment-current map-motion-fade-up">
        <div className="payment-current__left">
          <p className="payment-current__label">GÓI HIỆN TẠI</p>
          <div className="payment-current__name-row">
            <strong className="payment-current__badge">{currentLabel}</strong>
            <span className="payment-current__live">ĐANG DÙNG</span>
          </div>
          {mine?.premiumExpiresAt ? (
            <p className="payment-current__meta">Hết hạn {formatDate(mine.premiumExpiresAt)}</p>
          ) : null}
        </div>
        <div className="payment-current__meters" aria-hidden={!mine}>
          <div className="payment-current__meter">
            <span>Phòng đã lưu</span>
            <strong>9 / 12</strong>
            <i style={{ width: '75%' }} />
          </div>
          <div className="payment-current__meter">
            <span>Thông báo khu vực</span>
            <strong>1 / 1</strong>
            <i className="is-full" style={{ width: '100%' }} />
          </div>
          <div className="payment-current__meter">
            <span>Lượt so sánh</span>
            <strong>2 / 3</strong>
            <i style={{ width: '66%' }} />
          </div>
        </div>
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
              ? !!(mine?.isPremium && mine.packageCode === plan.code)
              : !mine?.isPremium
            const busy = busyCode === plan.code
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

                <h3>{isPremium ? (view.title.includes('Pro') ? view.title : 'Pro') : 'Free'}</h3>
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
                    <span className="payment-plan-card__current is-free">✓ Gói hiện tại</span>
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
