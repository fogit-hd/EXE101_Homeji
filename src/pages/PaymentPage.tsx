import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createMomoPayment,
  createPayOsPayment,
  getPayment,
  getPaymentByOrderCode,
} from '../api'
import type { Payment } from '../api/types'
import { formatDate, formatPrice, paymentMethodLabel, paymentStatusLabel } from '../lib/labels'
import { getErrorMessage } from '../lib/errors'

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const [amount, setAmount] = useState('100000')
  const [description, setDescription] = useState('Thanh toán Homeji')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [payUrl, setPayUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const lookupId = searchParams.get('paymentId')
  const lookupOrder = searchParams.get('orderCode')

  useEffect(() => {
    if (lookupId) {
      void getPayment(lookupId).then(setPayment).catch(() => {})
    } else if (lookupOrder) {
      void getPaymentByOrderCode(lookupOrder).then(setPayment).catch(() => {})
    }
  }, [lookupId, lookupOrder])

  const handleMomo = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await createMomoPayment(Number(amount), description)
      setPayUrl(res.payUrl ?? res.deeplink ?? res.qrCodeUrl)
      setMessage('Đã tạo thanh toán MoMo.')
      const detail = await getPayment(res.paymentId)
      setPayment(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Tạo thanh toán MoMo thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const handlePayOs = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await createPayOsPayment(Number(amount), description)
      setPayUrl(res.checkoutUrl ?? null)
      setMessage('Đã tạo thanh toán PayOS.')
      const detail = await getPayment(res.paymentId)
      setPayment(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Tạo thanh toán PayOS thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const refreshPayment = async () => {
    if (!payment) return
    try {
      const detail = await getPayment(payment.id)
      setPayment(detail)
      setMessage('Đã cập nhật trạng thái.')
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tra cứu'))
    }
  }

  return (
    <div className="container page">
      <h1 className="page-title">Thanh toán</h1>
      <p className="page-subtitle">Thanh toán qua MoMo hoặc PayOS</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="payment-grid">
        <form className="card" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label">Số tiền (VND)</label>
            <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1000} />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void handleMomo()}>
              Thanh toán MoMo
            </button>
            <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void handlePayOs()}>
              Thanh toán PayOS
            </button>
          </div>
        </form>

        {(payUrl || payment) && (
          <aside className="card">
            <h2>Chi tiết giao dịch</h2>
            {payUrl && (
              <p>
                <a href={payUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  Mở trang thanh toán
                </a>
              </p>
            )}
            {payment && (
              <dl className="detail-facts">
                <div><dt>Mã đơn</dt><dd>{payment.orderCode}</dd></div>
                <div><dt>Phương thức</dt><dd>{paymentMethodLabel[payment.method]}</dd></div>
                <div><dt>Trạng thái</dt><dd>{paymentStatusLabel[payment.status]}</dd></div>
                <div><dt>Số tiền</dt><dd>{formatPrice(payment.amount)}</dd></div>
                <div><dt>Tạo lúc</dt><dd>{formatDate(payment.createdAt)}</dd></div>
              </dl>
            )}
            {payment && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshPayment()}>
                Kiểm tra trạng thái
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
