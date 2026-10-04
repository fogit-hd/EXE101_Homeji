import type { Payment } from '../../api'
import { formatDate, formatPrice, paymentMethodLabel, paymentStatusLabel } from '../../lib/labels'
import { paymentDeadline } from '../../lib/paymentLifecycle'
import { ShellIcon } from '../shell/ShellIcons'

export function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  return <span className={`payment-status is-${status}`}><i aria-hidden="true" />{paymentStatusLabel[status] ?? 'Đang xử lý'}</span>
}

export function PaymentDetails({ payment }: { payment: Payment }) {
  const deadline = paymentDeadline(payment)
  return (
    <>
      <div className="payment-detail-heading"><span className="payment-detail-icon"><ShellIcon name="receipt" /></span><h3>Chi tiết giao dịch</h3></div>
      <div className="payment-detail-total"><span>Tổng thanh toán</span><strong>{formatPrice(payment.amount)}</strong><PaymentStatusBadge status={payment.status} /></div>
      <dl className="payment-facts">
        <div><dt>Mã đơn</dt><dd>{payment.orderCode}</dd></div>
        <div><dt>Nội dung</dt><dd>{payment.description}</dd></div>
        <div><dt>Phương thức</dt><dd>{paymentMethodLabel[payment.method]}</dd></div>
        <div><dt>Tạo lúc</dt><dd>{formatDate(payment.createdAt)}</dd></div>
        {deadline !== null && <div><dt>Hạn thanh toán</dt><dd>{formatDate(new Date(deadline).toISOString())}</dd></div>}
        {payment.paidAt && <div><dt>Thanh toán lúc</dt><dd>{formatDate(payment.paidAt)}</dd></div>}
      </dl>
    </>
  )
}
