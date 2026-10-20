import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PaymentPurpose, PaymentStatus } from '../api/types'
import { PaymentWaitSkeleton } from '../components/skeletons/PageSkeletons'
import { PaymentDetails } from '../components/payments/PaymentDetails'
import { ShellIcon } from '../components/shell/ShellIcons'
import { usePaymentTracking } from '../hooks/usePaymentTracking'
import { formatPrice, paymentMethodLabel } from '../lib/labels'
import { formatPaymentCountdown, PAYMENT_LIFETIME_MS, paymentSecondsLeft, safeCheckoutUrl } from '../lib/paymentLifecycle'
import { paymentResultState, paymentReturnHint } from '../lib/paymentReturn'
import './PaymentPage.css'
import './PaymentResultPage.css'

const states = {
  success: { title: 'Thanh toán thành công', symbol: '✓', label: 'ĐÃ XÁC NHẬN', tone: 'success' },
  cancelled: { title: 'Thanh toán đã hủy', symbol: '×', label: 'ĐÃ KẾT THÚC', tone: 'neutral' },
  'cancel-return': { title: 'Bạn đã hủy thanh toán', symbol: '×', label: 'ĐÃ TRỞ VỀ TỪ CỔNG THANH TOÁN', tone: 'neutral' },
  failed: { title: 'Thanh toán không thành công', symbol: '!', label: 'GIAO DỊCH THẤT BẠI', tone: 'error' },
  'failed-return': { title: 'Chưa hoàn tất thanh toán', symbol: '!', label: 'CẦN KIỂM TRA TRẠNG THÁI', tone: 'error' },
  expired: { title: 'Đơn thanh toán đã hết hạn', symbol: '◷', label: 'ĐÃ KẾT THÚC', tone: 'neutral' },
  'expired-return': { title: 'Liên kết thanh toán đã hết hạn', symbol: '◷', label: 'CẦN KIỂM TRA TRẠNG THÁI', tone: 'neutral' },
  overdue: { title: 'Đã hết thời gian thanh toán', symbol: '◷', label: 'ĐANG ĐỐI CHIẾU', tone: 'neutral' },
  verifying: { title: 'Đang xác minh thanh toán', symbol: '↻', label: 'ĐANG ĐỐI CHIẾU', tone: 'info' },
  pending: { title: 'Chờ bạn thanh toán', symbol: '↗', label: 'SẴN SÀNG THANH TOÁN', tone: 'info' },
} as const

export function PaymentWaitingPage() {
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId')
  const orderCode = params.get('orderCode') ?? params.get('orderId')
  const { payment, busy, error, refresh } = usePaymentTracking(paymentId, orderCode)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (payment?.status !== PaymentStatus.Pending) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [payment?.status])
  const historyUrl = payment?.purpose === PaymentPurpose.WalletTopUp ? '/?section=marketplace&market=wallet&wallet=history' : '/?section=payments&tab=history'
  if (!paymentId && !orderCode) return <div className="payment-wait-page payment-result-page"><section className="payment-wait-card"><h1>Chưa có đơn thanh toán</h1><p>Chọn một giao dịch để xem trạng thái thanh toán.</p><Link className="payment-button" to={historyUrl}>Xem giao dịch</Link></section></div>
  if (!payment) return <div className="payment-wait-page payment-result-page"><Link className="payment-back" to={historyUrl}>← Lịch sử giao dịch</Link>{error ? <section className="payment-wait-card"><h1>Chưa tải được giao dịch</h1><p role="alert">{error}</p><p>Chưa thể xác nhận kết quả. Nếu bạn đã trả tiền, hãy kiểm tra lại giao dịch trước khi thử thanh toán thêm.</p><button type="button" className="payment-button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang tải…' : 'Thử lại'}</button></section> : <PaymentWaitSkeleton />}</div>

  const seconds = paymentSecondsLeft(payment, now)
  const state = paymentResultState(payment.status, paymentReturnHint(params, payment.method), seconds === 0)
  const view = states[state]
  const pending = payment.status === PaymentStatus.Pending
  const topup = payment.purpose === PaymentPurpose.WalletTopUp
  const premium = payment.purpose === PaymentPurpose.PremiumSubscription
  const homeUrl = topup ? '/?section=marketplace&market=wallet' : premium ? '/?section=payments' : historyUrl
  const retryUrl = topup ? '/?section=marketplace&market=wallet&wallet=deposit' : premium ? '/?section=payments&tab=plans' : historyUrl
  const provider = paymentMethodLabel[payment.method] ?? 'cổng thanh toán'
  const url = safeCheckoutUrl(payment.paymentUrl)
  const message = state === 'success'
    ? topup ? 'Tiền nạp đã được hệ thống xác nhận. Mở ví để xem số dư mới nhất.' : premium ? 'Thanh toán gói đã được xác nhận. Mở mục gói của tôi để kiểm tra quyền lợi hiện tại.' : 'Homeji đã xác nhận giao dịch của bạn.'
    : state === 'cancel-return' ? `Bạn đã trở về từ thao tác hủy trên ${provider}. Homeji đang đối chiếu trạng thái giao dịch; trang này sẽ không yêu cầu bạn tiếp tục trả tiền.`
      : state === 'failed-return' ? `${provider} trả về thông báo chưa hoàn tất. Homeji đang kiểm tra kết quả cuối cùng. Nếu tài khoản đã bị trừ tiền, hãy kiểm tra trạng thái trước khi tạo giao dịch mới.`
        : state === 'verifying' ? `Đang chờ xác nhận cuối cùng từ hệ thống thanh toán ${provider}. Bạn chưa cần thanh toán lại; kết quả sẽ tự cập nhật tại đây.`
          : state === 'cancelled' ? 'Giao dịch này đã được hệ thống ghi nhận hủy. Đơn cũ không còn được dùng để thanh toán.'
            : state === 'expired' || state === 'expired-return' || state === 'overdue' ? 'Không tiếp tục dùng liên kết hoặc mã QR của đơn này. Nếu đã trả tiền, hãy kiểm tra trạng thái trước khi tạo đơn khác.'
              : state === 'failed' ? 'Hệ thống ghi nhận giao dịch chưa thành công. Kiểm tra tài khoản thanh toán trước khi thử lại nếu bạn thấy có khoản tiền bị trừ.'
                : `Tiếp tục qua ${provider} để hoàn tất giao dịch. Homeji chỉ ghi nhận thành công sau khi máy chủ xác nhận.`
  return <div className="payment-wait-page payment-result-page" data-payment-state={state}>
    <Link className="payment-back" to={historyUrl}>← Lịch sử giao dịch</Link>
    <div className="payment-wait-layout">
      <section className={`payment-wait-card payment-result-card is-${view.tone}`} aria-labelledby="payment-wait-title">
        <div className="payment-result-topline"><span>HOMEJI · {topup ? 'NẠP VÍ' : premium ? 'GÓI THÀNH VIÊN' : 'THANH TOÁN'}</span><strong>{provider}</strong></div>
        <div className="payment-result-symbol" aria-hidden="true">{view.symbol}</div>
        <span className="payment-result-label">{view.label}</span>
        <h1 id="payment-wait-title">{view.title}</h1>
        <p className="payment-wait-description" role="status">{message}</p>
        <div className="payment-result-total"><span>{state === 'success' ? 'Số tiền đã thanh toán' : 'Số tiền giao dịch'}</span><strong>{formatPrice(payment.amount)}</strong><small>Mã đơn {payment.orderCode}</small></div>
        {state === 'pending' && <div className="payment-countdown"><span>Thời gian còn lại</span><strong role="timer" aria-label="Thời gian còn lại để thanh toán">{seconds === null ? '--:--' : formatPaymentCountdown(seconds)}</strong><progress max={PAYMENT_LIFETIME_MS / 1000} value={seconds ?? 0} aria-label="Thời gian thanh toán còn lại" /></div>}
        {pending && state !== 'pending' && <p className="payment-result-reconciling"><ShellIcon name="shield" />Trạng thái máy chủ: đang đối chiếu. Thông báo trả về từ cổng chưa phải xác nhận ghi nhận tiền.</p>}
        {error && <p className="payment-inline-error" role="alert">{error} Thông tin trên là lần kiểm tra gần nhất.</p>}
        <div className="payment-wait-actions">
          {state === 'pending' && url && <a className="payment-button" href={url} target="_blank" rel="noopener noreferrer">Thanh toán qua {provider} ↗</a>}
          {state === 'pending' && !url && <p role="alert">Chưa có liên kết thanh toán hợp lệ. Vui lòng kiểm tra trạng thái.</p>}
          {pending && <button type="button" className={`payment-button${state === 'pending' ? ' is-secondary' : ''}`} disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}</button>}
          {!pending && <Link className="payment-button" to={state === 'success' ? homeUrl : retryUrl}>{state === 'success' ? topup ? 'Về ví Homeji' : premium ? 'Xem gói của tôi' : 'Xem giao dịch' : topup ? 'Tạo giao dịch nạp mới' : premium ? 'Chọn gói và thử lại' : 'Về lịch sử giao dịch'}</Link>}
          <Link className="payment-result-secondary" to={pending ? homeUrl : historyUrl}>{pending ? topup ? 'Về ví Homeji' : 'Quay lại Homeji' : 'Lịch sử giao dịch'}</Link>
        </div>
        <p className="payment-wait-foot"><ShellIcon name="shield" /><span>{pending ? 'Bạn có thể rời trang và kiểm tra lại từ lịch sử giao dịch.' : 'Kết quả được lấy từ giao dịch đã lưu trên máy chủ Homeji.'}</span></p>
      </section>
      <aside className="payment-detail-card payment-result-details"><PaymentDetails payment={payment} /><details><summary>Cần hỗ trợ giao dịch?</summary><p>Giữ mã đơn và biên nhận từ ngân hàng hoặc ví điện tử. Nếu đã bị trừ tiền nhưng trạng thái chưa thành công, kiểm tra lại trước khi tạo giao dịch mới.</p><Link to="/receipts">Biên nhận của tôi →</Link></details></aside>
    </div>
  </div>
}
