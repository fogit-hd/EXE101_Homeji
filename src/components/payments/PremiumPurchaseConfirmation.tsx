import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { MomoWallet, SubscriptionPackage } from '../../api'
import { PaymentMethod } from '../../api/types'
import { formatPrice } from '../../lib/labels'
import { formatDailyEquivalentPrice } from '../../lib/subscriptionPlanDisplay'
import { PaymentMethodBadges } from './PaymentMethodMarks'
import { isMomoWallet } from '../../hooks/useMomoWallets'
import './PremiumPurchaseConfirmation.css'

export type PremiumPurchase = {
  plan: SubscriptionPackage
  method: 'wallet' | 'momo' | 'payos' | MomoWallet
  amountDue: number
  discount: number
  voucherId?: string
  promotionCode?: string
  basePrice?: number
}

const methodNames = {
  wallet: 'Ví Homeji',
  momo: 'MoMo',
  payos: 'PayOS',
  'apple-pay': 'Apple Pay qua MoMo',
  'google-pay': 'Google Pay qua MoMo',
}

const methodEnumMap: Record<PremiumPurchase['method'], PaymentMethod> = {
  wallet: PaymentMethod.Wallet,
  momo: PaymentMethod.Momo,
  payos: PaymentMethod.PayOs,
  'apple-pay': PaymentMethod.Momo,
  'google-pay': PaymentMethod.Momo,
}

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
  const dailyEquivalentPrice = formatDailyEquivalentPrice(purchase.amountDue, purchase.plan.durationDays)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    cancel.current?.focus()
    return () => { element.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(
    <dialog
      ref={dialog}
      className="premium-purchase-confirm"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}
      data-glass-exclude
    >
      <header className="premium-purchase-confirm__head">
        
        <h2 id={titleId}>Xác nhận mua gói Premium</h2>
        <p id={descriptionId}>Kiểm tra gói và số tiền trước khi tiếp tục thanh toán.</p>
      </header>

      <dl className="premium-purchase-confirm__summary">
        <div><dt>Gói</dt><dd>{purchase.plan.name}</dd></div>
        <div><dt>Thời hạn</dt><dd>{purchase.plan.durationDays} ngày</dd></div>
        <div>
          <dt>Thanh toán bằng</dt>
          <dd className="premium-purchase-confirm__method">
            <span className={isMomoWallet(purchase.method) ? undefined : 'sr-only'}>{methodNames[purchase.method]}</span>
            <PaymentMethodBadges method={methodEnumMap[purchase.method]} compact />
          </dd>
        </div>
        <div><dt>Giá gói</dt><dd>{formatPrice(purchase.basePrice ?? purchase.plan.price)}</dd></div>
        {purchase.discount > 0 ? <div className="is-discount"><dt>{purchase.promotionCode ? `Mã ${purchase.promotionCode}` : 'Voucher giảm'}</dt><dd>−{formatPrice(purchase.discount)}</dd></div> : null}
        {dailyEquivalentPrice ? <div><dt>Bình quân/ngày · tham khảo</dt><dd>{dailyEquivalentPrice}</dd></div> : null}
        <div className="premium-purchase-confirm__total"><dt>Tổng thanh toán</dt><dd>{formatPrice(purchase.amountDue)}</dd></div>
      </dl>

      <p className="premium-purchase-confirm__note">{purchase.method === 'wallet'
        ? `Sẽ trừ ${formatPrice(purchase.amountDue)} từ ví Homeji.${walletBalance === null ? '' : ` Số dư dự kiến còn ${formatPrice(Math.max(0, walletBalance - purchase.amountDue))}.`}`
        : isMomoWallet(purchase.method)
          ? 'Homeji gửi email tài khoản cho MoMo để tạo đơn. Bạn xác nhận thanh toán trên trang MoMo.'
          : `Sau khi xác nhận, Homeji sẽ tạo yêu cầu thanh toán qua ${methodNames[purchase.method]}.`}</p>
      <div className="premium-purchase-confirm__actions">
        <button ref={cancel} type="button" className="pay-btn" disabled={busy} onClick={onCancel}>Quay lại</button>
        <button type="button" className="pay-btn pay-btn--primary" disabled={busy} onClick={onConfirm}>
          {busy ? 'Đang xử lý…' : `Xác nhận thanh toán ${formatPrice(purchase.amountDue)}`}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
