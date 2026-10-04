import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PaymentPurpose, PaymentStatus } from '../api/types'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { PaymentDetails } from '../components/payments/PaymentDetails'
import { ShellIcon } from '../components/shell/ShellIcons'
import { usePaymentTracking } from '../hooks/usePaymentTracking'
import { paymentMethodLabel } from '../lib/labels'
import { formatPaymentCountdown, PAYMENT_LIFETIME_MS, paymentSecondsLeft, safeCheckoutUrl } from '../lib/paymentLifecycle'
import './PaymentPage.css'

export function PaymentWaitingPage() {
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId')
  const orderCode = params.get('orderCode') ?? params.get('orderId')
  const { payment, busy, error, refresh } = usePaymentTracking(paymentId, orderCode)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const historyUrl = '/?section=payments&tab=history'
  if (!paymentId && !orderCode) return (
    <div className="payment-wait-page"><div className="payment-wait-card"><h1>Chưa có đơn thanh toán</h1><p>Chọn một giao dịch để xem trạng thái thanh toán.</p><Link className="payment-button" to={historyUrl}>Xem giao dịch</Link></div></div>
  )
  if (!payment) return (
    <div className="payment-wait-page">
      <Link className="payment-back" to={historyUrl}>← Quay lại giao dịch</Link>
      {error ? <div className="payment-wait-card"><h1>Chưa tải được giao dịch</h1><p role="alert">{error}</p><button className="payment-button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang tải…' : 'Thử lại'}</button></div> : <ContentSkeleton variant="dashboard" count={2} label="Đang tải thanh toán…" />}
    </div>
  )

  const pending = payment.status === PaymentStatus.Pending
  const paid = payment.status === PaymentStatus.Completed
  const cancelled = payment.status === PaymentStatus.Cancelled || payment.status === PaymentStatus.Expired
  const seconds = paymentSecondsLeft(payment, now)
  const overdue = seconds === 0
  const url = safeCheckoutUrl(payment.paymentUrl)
  const title = paid ? 'Thanh toán thành công!' : cancelled ? 'Đơn thanh toán đã hủy' : pending ? overdue ? 'Đã hết thời gian thanh toán' : 'Chờ bạn hoàn tất thanh toán' : 'Thanh toán chưa thành công'
  const message = paid
    ? payment.purpose === PaymentPurpose.PremiumSubscription ? 'Gói thành viên của bạn đã được kích hoạt. Bắt đầu khám phá những quyền lợi mới nhé.' : 'Thanh toán đã được xác nhận. Bạn có thể quay lại để kiểm tra giao dịch.'
    : cancelled ? 'Đơn này không còn hiệu lực. Bạn có thể chọn gói và tạo một đơn thanh toán mới.'
      : overdue ? 'Đang xác nhận trạng thái cuối cùng với hệ thống. Vui lòng không thanh toán đơn này.'
        : pending ? `Hoàn tất thanh toán qua ${paymentMethodLabel[payment.method]}. Homeji sẽ tự cập nhật ngay khi nhận được xác nhận.`
          : 'Giao dịch chưa được hoàn tất. Bạn có thể tạo đơn mới để thử lại.'

  return (
    <div className="payment-wait-page">
      <Link className="payment-back" to={historyUrl}>← Quay lại giao dịch</Link>
      <div className="payment-wait-layout">
        <section className={`payment-wait-card${paid ? ' is-paid' : ''}`} aria-labelledby="payment-wait-title">
          <span className="payment-page-eyebrow">HOMEJI · THANH TOÁN</span>
          <div className={`payment-wait-symbol${paid ? ' is-success' : cancelled || overdue ? ' is-ended' : ''}`} aria-hidden="true">{paid ? '✓' : cancelled || overdue ? '×' : <ShellIcon name="card" />}</div>
          <h1 id="payment-wait-title">{title}</h1>
          <p className="payment-wait-description" role="status">{message}</p>
          {pending && <div className={`payment-countdown${overdue ? ' is-ended' : ''}`}>
            <span>{overdue ? 'Thời gian đã hết' : 'Thời gian còn lại'}</span>
            <strong role="timer" aria-label="Thời gian còn lại để thanh toán">{seconds === null ? '--:--' : formatPaymentCountdown(seconds)}</strong>
            <progress max={PAYMENT_LIFETIME_MS / 1000} value={seconds ?? 0} aria-label="Thời gian thanh toán còn lại" />
            <p>Đơn chưa thanh toán sẽ tự hủy sau 15 phút.</p>
          </div>}
          {error && <p className="payment-inline-error" role="alert">{error}</p>}
          <div className="payment-wait-actions">
            {pending && !overdue && url && <a className="payment-button" href={url} target="_blank" rel="noopener noreferrer">Thanh toán qua {paymentMethodLabel[payment.method]} ↗</a>}
            {pending && !overdue && !url && <p className="payment-inline-error">Chưa có liên kết thanh toán hợp lệ. Vui lòng kiểm tra lại trạng thái.</p>}
            {pending && <button className="payment-button is-secondary" disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang kiểm tra…' : 'Tôi đã thanh toán · Kiểm tra lại'}</button>}
            {!pending && <Link className="payment-button" to={paid ? '/?section=payments' : '/?section=payments&tab=plans'}>{paid ? 'Xem gói của tôi' : 'Chọn gói và thanh toán lại'}</Link>}
          </div>
          <div className="payment-wait-foot"><ShellIcon name="shield" /><span>{pending ? 'Bạn có thể rời trang và quay lại từ lịch sử giao dịch.' : 'Trạng thái được xác nhận bởi hệ thống thanh toán.'}</span></div>
        </section>
        <aside className="payment-detail-card"><PaymentDetails payment={payment} /><div className="payment-detail-note"><ShellIcon name="shield" /><p>Chỉ thanh toán qua cổng chính thức. Homeji không yêu cầu mật khẩu hoặc mã OTP của bạn.</p></div></aside>
      </div>
    </div>
  )
}
