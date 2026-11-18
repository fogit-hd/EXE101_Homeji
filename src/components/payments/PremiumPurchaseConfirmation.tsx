import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPayPalQuote, type PayPalCheckoutConfig, type SubscriptionPackage } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice, formatUsd } from '../../lib/labels'
import { formatDailyEquivalentPrice } from '../../lib/subscriptionPlanDisplay'
import './PremiumPurchaseConfirmation.css'

export type PremiumPurchase = {
  plan: SubscriptionPackage
  method: 'wallet' | 'momo' | 'payos' | 'paypal'
  amountDue: number
  discount: number
  voucherId?: string
}

const methodNames = {
  wallet: 'Ví Homeji',
  momo: 'MoMo',
  payos: 'PayOS',
  paypal: 'PayPal · Google Pay · Apple Pay',
}

type QuoteState = { amountDue: number; config?: PayPalCheckoutConfig; error?: string }

export function PremiumPurchaseConfirmation({ purchase, walletBalance, busy, onCancel, onConfirm }: {
  purchase: PremiumPurchase
  walletBalance: number | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null)
  const dailyEquivalentPrice = formatDailyEquivalentPrice(purchase.amountDue, purchase.plan.durationDays)

  const isPayPal = purchase.method === 'paypal'
  const currentQuoteState = isPayPal && quoteState?.amountDue === purchase.amountDue ? quoteState : null
  const quoteLoading = isPayPal && currentQuoteState === null
  const quote = currentQuoteState?.config?.quote ?? null
  const payPalDisabled = isPayPal && currentQuoteState?.config?.enabled === false
  const quoteError = currentQuoteState?.error
    ?? (payPalDisabled ? 'Cổng PayPal chưa được cấu hình trên máy chủ.' : undefined)

  useEffect(() => {
    if (!isPayPal) return
    const controller = new AbortController()
    void getPayPalQuote(purchase.amountDue, controller.signal)
      .then((config) => {
        if (!controller.signal.aborted) {
          setQuoteState({ amountDue: purchase.amountDue, config })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setQuoteState({
            amountDue: purchase.amountDue,
            error: getErrorMessage(error, 'Chưa tải được tỷ giá USD.'),
          })
        }
      })
    return () => controller.abort()
  }, [isPayPal, purchase.amountDue])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    cancel.current?.focus()
    return () => { element.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog ref={dialog} className="premium-purchase-confirm" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel() }} data-glass-exclude>
    <h2 id={titleId}>Xác nhận mua gói Premium</h2>
    <p id={descriptionId}>Kiểm tra gói và số tiền trước khi tiếp tục thanh toán.</p>
    <dl>
      <div><dt>Gói</dt><dd>{purchase.plan.name}</dd></div>
      <div><dt>Thời hạn</dt><dd>{purchase.plan.durationDays} ngày</dd></div>
      <div><dt>Thanh toán bằng</dt><dd>{methodNames[purchase.method]}</dd></div>
      <div><dt>Giá gói</dt><dd>{formatPrice(purchase.plan.price)}</dd></div>
      {purchase.discount > 0 ? <div><dt>Voucher giảm</dt><dd>−{formatPrice(purchase.discount)}</dd></div> : null}
      {dailyEquivalentPrice ? <div><dt>Bình quân/ngày · tham khảo</dt><dd>{dailyEquivalentPrice}</dd></div> : null}
      <div className="premium-purchase-confirm__total"><dt>Tổng thanh toán</dt><dd>{formatPrice(purchase.amountDue)}</dd></div>
      {quote ? (
        <>
          <div><dt>Tỷ giá ({quote.rateSource})</dt><dd>1 USD = {formatPrice(quote.exchangeRateVnd)}</dd></div>
          <div><dt>Quy đổi gốc</dt><dd>{formatUsd(quote.baseUsd)}</dd></div>
          <div><dt>Phí chuyển đổi & cổng quốc tế</dt><dd>{formatUsd(quote.totalFeeUsd)}</dd></div>
          <div className="premium-purchase-confirm__total"><dt>Tổng thanh toán quốc tế</dt><dd>{formatUsd(quote.totalUsd)}</dd></div>
        </>
      ) : null}
    </dl>
    {quoteLoading ? <p className="premium-purchase-confirm__note" role="status">Đang lấy tỷ giá USD theo thời giá…</p> : null}
    {quoteError ? <p className="payment-inline-error" role="alert">{quoteError}</p> : null}
    <p className="premium-purchase-confirm__note">{purchase.method === 'wallet'
      ? `Sẽ trừ ${formatPrice(purchase.amountDue)} từ ví Homeji.${walletBalance === null ? '' : ` Số dư dự kiến còn ${formatPrice(Math.max(0, walletBalance - purchase.amountDue))}.`}`
      : purchase.method === 'paypal'
        ? 'Sau khi xác nhận, bạn có thể thanh toán bằng PayPal, Google Pay hoặc Apple Pay theo số tiền USD đã khóa tỷ giá.'
        : `Sau khi xác nhận, Homeji sẽ tạo yêu cầu thanh toán qua ${methodNames[purchase.method]}.`}</p>
    <div className="premium-purchase-confirm__actions">
      <button ref={cancel} type="button" className="pay-btn" disabled={busy} onClick={onCancel}>Quay lại</button>
      <button type="button" className="pay-btn pay-btn--primary" disabled={busy || quoteLoading || Boolean(quoteError)} onClick={onConfirm}>
        {busy ? 'Đang xử lý…' : quote ? `Xác nhận thanh toán ${formatUsd(quote.totalUsd)}` : `Xác nhận thanh toán ${formatPrice(purchase.amountDue)}`}
      </button>
    </div>
  </dialog>, document.body)
}
