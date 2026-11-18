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
  extractWalletErrorMessage,
  loadPayPalWalletSdk,
  WalletUnavailableError,
  type Authorize,
} from '../../lib/paypalSandboxWalletSdk'
import { ApplePayLogo, GooglePayLogo, PayPalLogo } from './PaymentMethodMarks'

type WalletState = {
  paymentId: string
  config?: PayPalCheckoutConfig
  walletAvailability?: 'checking' | 'hidden' | 'ready' | 'unavailable'
  unavailableReason?: string
  error?: string
}

export function PayPalCheckoutWallets({
  paymentId,
  checkoutUrl,
  onCompleted,
}: {
  paymentId: string
  checkoutUrl?: string | null
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
      } catch (error) {
        setNotice({
          text: extractWalletErrorMessage(error, 'Không thể hoàn tất thanh toán ví. Vui lòng thử lại.'),
          error: true,
        })
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
    } catch (error) {
      setNotice({
        text: extractWalletErrorMessage(error, 'Ví chưa xác thực đơn hàng. Bạn có thể thử lại hoặc thanh toán qua PayPal.'),
        error: true,
      })
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

        const unavailableReasons = [google, apple]
          .filter((result): result is PromiseRejectedResult =>
            result.status === 'rejected' && result.reason instanceof WalletUnavailableError)
          .map(result => (result.reason as WalletUnavailableError).message)

        setState({
          paymentId,
          config: fetched,
          walletAvailability: googleButton || appleButton ? 'ready' : 'unavailable',
          unavailableReason: unavailableReasons[0],
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

  const walletsVisible = walletAvailability !== 'hidden'

  return (
    <div className="payment-paypal-wallets" data-glass-exclude>
      {quote ? (
        <dl className="payment-paypal-quote" aria-label="Chi tiết quy đổi USD">
          <div className="payment-paypal-quote__header">
            <dt>Tỷ giá · {quote.rateSource}</dt>
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

      <div className="payment-checkout-panel" data-glass-exclude>
        <div className="payment-express-box" hidden={!walletsVisible}>
          <div className="payment-express-box__head">
            <span>Thanh toán nhanh trên thiết bị</span>
            <span className="payment-express-box__logos" aria-hidden="true">
              <GooglePayLogo compact />
              <ApplePayLogo compact />
            </span>
          </div>
          {walletAvailability === 'checking' && (
            <p className="payment-paypal-wallets__status" role="status">
              Đang kiểm tra Google Pay và Apple Pay…
            </p>
          )}
          {walletAvailability === 'unavailable' && (
            <p className="payment-paypal-wallets__note" role="status">
              {currentState?.unavailableReason ?? 'Google Pay / Apple Pay chưa khả dụng trên thiết bị này. Bạn có thể thanh toán trực tiếp qua nút PayPal bên dưới.'}
            </p>
          )}
          <div
            className="payment-sandbox-wallets"
            data-glass-exclude
            inert={busy || canRetry}
            hidden={walletAvailability !== 'ready'}
          >
            <div ref={googleHost} data-glass-exclude />
            <div ref={appleHost} data-glass-exclude />
          </div>
          {walletAvailability === 'ready' && currentState?.unavailableReason && (
            <p className="payment-paypal-wallets__note" role="status">{currentState.unavailableReason}</p>
          )}
          {busy && <p className="payment-paypal-wallets__status" role="status">Đang xử lý giao dịch ví…</p>}
          {notice && (
            <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'payment-inline-error' : 'payment-paypal-wallets__status'}>
              {notice.text}
            </p>
          )}
          {canRetry && (
            <button
              type="button"
              className="payment-button payment-button--retry"
              disabled={busy}
              onClick={() => start(async () => {
                if (pendingTicket.current) await capture(pendingTicket.current)
              })}
            >
              Kiểm tra lại giao dịch ví
            </button>
          )}
        </div>

        {walletsVisible && checkoutUrl ? (
          <div className="payment-checkout-divider" aria-hidden="true">
            <span>hoặc thanh toán qua cổng web</span>
          </div>
        ) : null}

        {checkoutUrl ? (
          <a
            className="payment-button payment-button--paypal"
            href={checkoutUrl}
          >
            <PayPalLogo compact />
            <span>{walletsVisible ? 'Thanh toán qua PayPal →' : 'Thanh toán qua PayPal · Thẻ quốc tế →'}</span>
          </a>
        ) : (
          <p className="payment-inline-error" role="alert">
            Chưa có liên kết thanh toán hợp lệ. Vui lòng kiểm tra trạng thái.
          </p>
        )}
      </div>
    </div>
  )
}
