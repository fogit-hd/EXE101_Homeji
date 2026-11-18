import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiRequestError, apiRequest } from '../api/client'
import { PayPalSandboxWallets } from '../components/payments/PayPalSandboxWallets'
import { getErrorMessage } from '../lib/errors'
import { safeCheckoutUrl } from '../lib/paymentLifecycle'
import './PaymentPage.css'
import './PaymentResultPage.css'

const orderStorageKey = 'homeji-paypal-sandbox-order'
const ordersPath = '/api/payments/paypal-sandbox'

type SandboxOrder = { orderId: string; approvalUrl: string; ticket: string }
type SandboxCapture = {
  status: 'completed' | 'pending' | 'failed' | 'unconfirmed'
  captureId: string | null
}

const resultMessages: Record<SandboxCapture['status'], string> = {
  completed: 'PayPal đã xác nhận giao dịch thử thành công.',
  pending: 'PayPal đang xử lý giao dịch. Bạn có thể kiểm tra lại.',
  failed: 'PayPal báo giao dịch thử không thành công.',
  unconfirmed: 'PayPal chưa xác nhận giao dịch. Bạn có thể kiểm tra lại.',
}

export function PayPalSandboxPage() {
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [walletBusy, setWalletBusy] = useState(false)
  const [error, setError] = useState('')
  const [capture, setCapture] = useState<SandboxCapture | null>(null)
  const returned = params.get('paypal') === 'return'
  const cancelled = params.get('paypal') === 'cancel'
  const canRetryCapture = returned && capture?.status !== 'completed' && capture?.status !== 'failed'

  async function createOrder() {
    setBusy(true)
    setError('')
    try {
      const order = await apiRequest<SandboxOrder>(ordersPath + '/orders', { method: 'POST' })
      const checkoutUrl = safeCheckoutUrl(order.approvalUrl)
      if (!checkoutUrl || new URL(checkoutUrl).host !== 'www.sandbox.paypal.com') {
        setError('Homeji chưa nhận được liên kết PayPal Sandbox hợp lệ.')
        return
      }
      sessionStorage.setItem(orderStorageKey, JSON.stringify({ orderId: order.orderId, ticket: order.ticket }))
      window.location.assign(checkoutUrl)
    } catch (err) {
      setError(err instanceof ApiRequestError && err.status === 404
        ? 'PayPal Sandbox chưa khả dụng cho tài khoản này.'
        : getErrorMessage(err, 'Không thể mở PayPal Sandbox.'))
    } finally {
      setBusy(false)
    }
  }

  async function captureOrder() {
    setBusy(true)
    setError('')
    try {
      const savedOrder = sessionStorage.getItem(orderStorageKey)
      const order = savedOrder ? JSON.parse(savedOrder) as Partial<SandboxOrder> : null
      if (order?.orderId !== params.get('token') || typeof order?.ticket !== 'string') {
        setError('Không tìm thấy đơn thử trong tab này. Quay lại trang thanh toán để tạo đơn mới.')
        return
      }
      setCapture(await apiRequest<SandboxCapture>(ordersPath + '/capture', {
        method: 'POST',
        body: { ticket: order.ticket },
      }))
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa thể xác nhận giao dịch với PayPal Sandbox.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="payment-wait-page payment-result-page">
      <Link className="payment-back" to="/payments">← Thanh toán Homeji</Link>
      <section className="payment-wait-card payment-result-card" aria-labelledby="sandbox-title">
        <h1 id="sandbox-title">Thử thanh toán quốc tế</h1>
        <p className="payment-wait-description">Dùng tài khoản hoặc thẻ thử để thanh toán. Các giao dịch trên trang này chỉ chạy trong Sandbox.</p>
        <div className="payment-result-total">
          <span>Số tiền thử</span>
          <strong>1,00 USD</strong>
          {capture?.captureId && <small>Mã giao dịch PayPal {capture.captureId}</small>}
        </div>
        {cancelled && <p role="status">Bạn đã quay về từ màn hình hủy của PayPal.</p>}
        {capture && <p role="status">{resultMessages[capture.status]}</p>}
        {error && <p className="payment-inline-error" role="alert">{error}</p>}
        <div className="payment-wait-actions">
          {canRetryCapture ? (
            <button type="button" className="payment-button" disabled={busy} onClick={() => void captureOrder()}>
              {busy ? 'Đang xác nhận…' : capture ? 'Kiểm tra lại' : 'Xác nhận giao dịch thử'}
            </button>
          ) : !returned ? (
            <button type="button" className="payment-button" disabled={busy || walletBusy} onClick={() => void createOrder()}>
              {busy ? 'Đang tạo đơn…' : 'Mở PayPal Sandbox'}
            </button>
          ) : (
            <Link className="payment-button" reloadDocument to="/payments/sandbox">Tạo đơn thử mới</Link>
          )}
        </div>
        {!returned && <div inert={busy}><PayPalSandboxWallets onBusyChange={setWalletBusy} /></div>}
      </section>
    </div>
  )
}
