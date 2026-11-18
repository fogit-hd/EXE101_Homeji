import { useCallback, useEffect, useRef, useState } from 'react'
import {
  capturePayPalPayment,
  createPayPalPaymentWalletOrder,
  getPayPalPaymentWallets,
} from '../../api'
import { ApiRequestError } from '../../api/client'
import { PaymentStatus, type PayPalCheckoutConfig } from '../../api/types'
import { formatPrice, formatUsd } from '../../lib/labels'
import {
  createApplePayButton,
  createGooglePayButton,
  loadPayPalWalletSdk,
  type Authorize,
} from '../../lib/paypalSandboxWalletSdk'

type WalletState = {
  paymentId: string
  config?: PayPalCheckoutConfig
  walletAvailability?: 'checking' | 'hidden' | 'ready' | 'unavailable'
  error?: string
}

export function PayPalCheckoutWallets({
  paymentId,
  onCompleted,
}: {
  paymentId: string
  onCompleted: () => void
}) {
  const googleHost = useRef<HTMLDivElement>(null)
  const appleHost = useRef<HTMLDivElement>(null)
  const locked = useRef(false)
  const pendingTicket = useRef<string | null>(null)
  const onCompletedRef = useRef(onCompleted)
  const [state, setState] = useState<WalletState | null>(null)
  const [busy, setBusy] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>()

  useEffect(() => {
    onCompletedRef.current = onCompleted
  }, [onCompleted])

  const currentState = state?.paymentId === paymentId ? state : null
  const loading = currentState === null
  const config = currentState?.config
  const quote = config?.quote ?? null
  const walletAvailability = currentState?.walletAvailability ?? (loading ? 'checking' : 'hidden')

  const start = useCallback((payment: () => Promise<void>) => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setNotice(undefined)
    void (async () => {
      try {
        await payment()
      } catch {
        setNotice({ text: 'Không thể hoàn tất thanh toán ví. Vui lòng thử lại.', error: true })
      } finally {
        locked.current = false
        setBusy(false)
      }
    })()
  }, [])

  const capture = useCallback(async (ticket: string) => {
    try {
      const confirmed = await capturePayPalPayment(paymentId, { ticket })
      if (confirmed.status === PaymentStatus.Completed) {
        pendingTicket.current = null
        setCanRetry(false)
        setNotice({ text: 'PayPal đã xác nhận giao dịch thành công.' })
        onCompletedRef.current()
        return true
      }

      if (
        confirmed.status === PaymentStatus.Failed
        || confirmed.status === PaymentStatus.Cancelled
        || confirmed.status === PaymentStatus.Expired
      ) {
        pendingTicket.current = null
        setCanRetry(false)
        setNotice({ text: 'PayPal báo giao dịch chưa thành công.', error: true })
        onCompletedRef.current()
        return false
      }

      setNotice({ text: 'PayPal chưa xác nhận giao dịch. Bạn có thể kiểm tra lại.' })
      return false
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        pendingTicket.current = null
        setCanRetry(false)
        setNotice({ text: 'Giao dịch không còn khả dụng. Vui lòng tạo đơn mới.', error: true })
      } else {
        setNotice({ text: 'Chưa nhận được kết quả từ PayPal. Hãy kiểm tra lại giao dịch ví.', error: true })
      }
      return false
    }
  }, [paymentId])

  const authorize = useCallback<Authorize>(async (wallet, confirm) => {
    try {
      if (pendingTicket.current) return await capture(pendingTicket.current)
      const order = await createPayPalPaymentWalletOrder(paymentId, wallet)
      await confirm(order.orderId)
      pendingTicket.current = order.ticket
      setCanRetry(true)
      return await capture(order.ticket)
    } catch {
      setNotice({ text: 'Ví chưa xác thực đơn hàng. Bạn có thể thử lại hoặc thanh toán qua PayPal.', error: true })
      return false
    }
  }, [capture, paymentId])

  useEffect(() => {
    pendingTicket.current = null
    const controller = new AbortController()
    const googleContainer = googleHost.current
    const appleContainer = appleHost.current

    void (async () => {
      try {
        const fetched = await getPayPalPaymentWallets(paymentId, controller.signal)
        if (controller.signal.aborted) return

        if (!fetched.enabled || !fetched.clientId || (!fetched.googlePay && !fetched.applePay)) {
          setState({ paymentId, config: fetched, walletAvailability: 'hidden' })
          return
        }

        setState({ paymentId, config: fetched, walletAvailability: 'checking' })
        await loadPayPalWalletSdk({
          clientId: fetched.clientId,
          googlePay: fetched.googlePay,
          applePay: fetched.applePay,
          mode: fetched.mode,
        })
        if (controller.signal.aborted) return

        const totalPrice = fetched.quote ? fetched.quote.totalUsd.toFixed(2) : '1.00'
        const googleEnvironment = fetched.mode === 'live' ? 'PRODUCTION' : 'TEST'

        const [google, apple] = await Promise.allSettled([
          fetched.googlePay
            ? createGooglePayButton(start, authorize, { environment: googleEnvironment, totalPrice })
            : null,
          fetched.applePay
            ? createApplePayButton(start, authorize, { totalPrice, label: 'Homeji' })
            : null,
        ])
        if (controller.signal.aborted) return

        const googleButton = google.status === 'fulfilled' ? google.value : null
        const appleButton = apple.status === 'fulfilled' ? apple.value : null
        if (googleButton) googleContainer?.append(googleButton)
        if (appleButton) appleContainer?.append(appleButton)

        setState({
          paymentId,
          config: fetched,
          walletAvailability: googleButton || appleButton ? 'ready' : 'unavailable',
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            paymentId,
            walletAvailability: error instanceof ApiRequestError && error.status === 404 ? 'hidden' : 'unavailable',
          })
        }
      }
    })()

    return () => {
      controller.abort()
      googleContainer?.replaceChildren()
      appleContainer?.replaceChildren()
    }
  }, [authorize, paymentId, start])

  return (
    <div className="payment-paypal-wallets">
      {quote ? (
        <dl className="payment-paypal-quote" aria-label="Chi tiết quy đổi USD">
          <div>
            <dt>Tỷ giá thời giá ({quote.rateSource})</dt>
            <dd>1 USD = {formatPrice(quote.exchangeRateVnd)}</dd>
          </div>
          <div>
            <dt>Quy đổi gốc</dt>
            <dd>{formatUsd(quote.baseUsd)}</dd>
          </div>
          <div>
            <dt>Phí chuyển đổi ngoại tệ NH ({(quote.bankFeePercent * 100).toFixed(1)}%)</dt>
            <dd>{formatUsd(quote.bankFeeUsd)}</dd>
          </div>
          <div>
            <dt>
              Phí cổng quốc tế ({(quote.gatewayFeePercent * 100).toFixed(1)}% + {formatUsd(quote.gatewayFixedFeeUsd)})
            </dt>
            <dd>{formatUsd(quote.gatewayFeeUsd)}</dd>
          </div>
          <div className="payment-paypal-quote__total">
            <dt>Tổng thu quốc tế</dt>
            <dd>{formatUsd(quote.totalUsd)}</dd>
          </div>
        </dl>
      ) : null}

      <div hidden={walletAvailability === 'hidden'}>
        {walletAvailability === 'checking' && <p role="status">Đang kiểm tra Google Pay và Apple Pay…</p>}
        {walletAvailability === 'unavailable' && (
          <p className="payment-paypal-wallets__note" role="status">
            Google Pay / Apple Pay chưa khả dụng trên thiết bị này. Bạn có thể thanh toán trực tiếp qua nút PayPal ở trên.
          </p>
        )}
        <div className="payment-sandbox-wallets" inert={busy || canRetry} hidden={walletAvailability !== 'ready'}>
          <div ref={googleHost} />
          <div ref={appleHost} />
        </div>
        {busy && <p role="status">Đang xử lý giao dịch ví…</p>}
        {notice && (
          <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'payment-inline-error' : undefined}>
            {notice.text}
          </p>
        )}
        {canRetry && (
          <button
            type="button"
            className="payment-button"
            disabled={busy}
            onClick={() => start(async () => {
              if (pendingTicket.current) await capture(pendingTicket.current)
            })}
          >
            Kiểm tra lại giao dịch ví
          </button>
        )}
      </div>
    </div>
  )
}
