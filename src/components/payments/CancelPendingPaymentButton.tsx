import { useRef, useState } from 'react'
import { cancelPremiumPayment, type Payment } from '../../api'
import { PaymentMethod, PaymentPurpose, PaymentStatus } from '../../api/types'
import { getErrorMessage } from '../../lib/errors'
import { confirmDialog } from '../ui/confirmDialog'

export function CancelPendingPaymentButton({ payment, className, onUpdated, onError }: {
  payment: Payment
  className: string
  onUpdated: (payment: Payment) => void
  onError: (message: string) => void
}) {
  const confirming = useRef(false)
  const [busy, setBusy] = useState(false)

  if (payment.status !== PaymentStatus.Pending
    || payment.purpose !== PaymentPurpose.PremiumSubscription
    || (payment.method !== PaymentMethod.Momo && payment.method !== PaymentMethod.PayOs)) return null

  const cancel = async () => {
    if (confirming.current) return
    confirming.current = true
    try {
      if (!await confirmDialog({
        title: 'Hủy đơn thanh toán?',
        message: payment.method === PaymentMethod.Momo
          ? 'Đơn sẽ được đóng trên Homeji. Sau khi hủy, hãy bỏ liên kết hoặc mã QR MoMo cũ. Nếu đã trả tiền, hãy giữ đơn và kiểm tra lại trạng thái.'
          : 'Homeji sẽ yêu cầu PayOS hủy liên kết thanh toán. Nếu bạn đã chuyển tiền, hãy giữ đơn và kiểm tra lại trạng thái.',
        confirmLabel: 'Xác nhận hủy',
        cancelLabel: 'Giữ đơn',
        danger: true,
      })) return
      setBusy(true)
      onUpdated(await cancelPremiumPayment(payment.id))
    } catch (error) {
      onError(getErrorMessage(error, 'Chưa thể hủy đơn. Hãy kiểm tra lại trạng thái.'))
    } finally {
      confirming.current = false
      setBusy(false)
    }
  }

  return <button type="button" className={className} disabled={busy} onClick={() => void cancel()}>
    {busy ? 'Đang hủy…' : 'Hủy đơn thanh toán'}
  </button>
}
