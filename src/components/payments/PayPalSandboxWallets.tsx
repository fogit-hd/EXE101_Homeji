import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError, apiRequest } from '../../api/client'
import {
  createApplePayButton, createGooglePayButton, extractWalletErrorMessage, loadPayPalWalletSdk,
} from '../../lib/paypalSandboxWalletSdk'
import type { Authorize, WalletConfig } from '../../lib/paypalSandboxWalletSdk'

const sandboxPath = '/api/payments/paypal-sandbox'
type WalletOrder = { orderId: string; ticket: string }
type Capture = { status: 'completed' | 'pending' | 'failed' | 'unconfirmed'; captureId: string | null }

export function PayPalSandboxWallets({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const googleHost = useRef<HTMLDivElement>(null)
  const appleHost = useRef<HTMLDivElement>(null)
  const locked = useRef(false)
  const pendingTicket = useRef<string | null>(null)
  const [availability, setAvailability] = useState<'checking' | 'hidden' | 'ready' | 'unavailable'>('checking')
  const [busy, setBusy] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>()

  const start = useCallback((payment: () => Promise<void>) => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    onBusyChange(true)
    setNotice(undefined)
    void (async () => {
      try {
        await payment()
      } catch (error) {
        setNotice({ text: extractWalletErrorMessage(error, 'Không thể hoàn tất thanh toán thử. Vui lòng thử lại.'), error: true })
      } finally {
        locked.current = false
        setBusy(false)
        onBusyChange(false)
      }
    })()
  }, [onBusyChange])

  const capture = useCallback(async (ticket: string) => {
    try {
      const confirmed = await apiRequest<Capture>(sandboxPath + '/capture', {
        method: 'POST',
        body: { ticket },
      })
      switch (confirmed.status) {
        case 'completed':
          pendingTicket.current = null
          setCanRetry(false)
          setNotice({ text: `PayPal đã xác nhận giao dịch thử. Mã giao dịch: ${confirmed.captureId}.` })
          return true
        case 'failed':
          pendingTicket.current = null
          setCanRetry(false)
          setNotice({ text: 'PayPal báo giao dịch thử không thành công.', error: true })
          return false
        case 'pending':
        case 'unconfirmed':
          setNotice({ text: 'PayPal chưa xác nhận giao dịch thử. Bạn có thể kiểm tra lại.' })
          return false
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        pendingTicket.current = null
        setCanRetry(false)
        setNotice({ text: 'Đơn thử không còn khả dụng. Bạn có thể tạo đơn mới.', error: true })
      } else {
        setNotice({ text: 'Chưa nhận được kết quả từ PayPal. Hãy kiểm tra lại đơn thử này.', error: true })
      }
      return false
    }
  }, [])

  const authorize = useCallback<Authorize>(async (wallet, confirm) => {
    try {
      if (pendingTicket.current) return await capture(pendingTicket.current)
      const order = await apiRequest<WalletOrder>(`${sandboxPath}/wallets/${wallet}/orders`, { method: 'POST' })
      await confirm(order.orderId)
      pendingTicket.current = order.ticket
      setCanRetry(true)
      return await capture(order.ticket)
    } catch {
      setNotice({ text: 'Ví chưa xác thực đơn thử. Bạn có thể thử lại hoặc dùng PayPal Sandbox.', error: true })
      return false
    }
  }, [capture])

  useEffect(() => {
    const controller = new AbortController()
    const googleContainer = googleHost.current
    const appleContainer = appleHost.current
    void (async () => {
      try {
        const config = await apiRequest<WalletConfig | undefined>(sandboxPath + '/wallets', {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (!config) {
          setAvailability('hidden')
          return
        }
        await loadPayPalWalletSdk(config)
        if (controller.signal.aborted) return
        const [google, apple] = await Promise.allSettled([
          config.googlePay ? createGooglePayButton(start, authorize) : null,
          config.applePay ? createApplePayButton(start, authorize) : null,
        ])
        if (controller.signal.aborted) return
        const googleButton = google.status === 'fulfilled' ? google.value : null
        const appleButton = apple.status === 'fulfilled' ? apple.value : null
        if (googleButton) googleContainer?.append(googleButton)
        if (appleButton) appleContainer?.append(appleButton)
        setAvailability(googleButton || appleButton ? 'ready' : 'unavailable')
      } catch (error) {
        if (!controller.signal.aborted) {
          setAvailability(error instanceof ApiRequestError && error.status === 404 ? 'hidden' : 'unavailable')
        }
      }
    })()
    return () => {
      controller.abort()
      googleContainer?.replaceChildren()
      appleContainer?.replaceChildren()
    }
  }, [authorize, start])

  return (
    <div className="payment-paypal-wallets" data-glass-exclude hidden={availability === 'hidden'}>
      <div className="payment-express-box">
        <div className="payment-express-box__head">
          <span>Ví thử nghiệm trên thiết bị</span>
        </div>
        {availability === 'checking' && <p className="payment-paypal-wallets__status" role="status">Đang kiểm tra Google Pay và Apple Pay…</p>}
        {availability === 'unavailable' && <p className="payment-paypal-wallets__note" role="status">Ví thử chưa khả dụng trên thiết bị này hoặc chưa được PayPal bật.</p>}
        <div className="payment-sandbox-wallets" data-glass-exclude inert={busy || canRetry} hidden={availability !== 'ready'}>
          <div ref={googleHost} data-glass-exclude />
          <div ref={appleHost} data-glass-exclude />
        </div>
        {busy && <p className="payment-paypal-wallets__status" role="status">Đang xử lý giao dịch thử…</p>}
        {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'payment-inline-error' : 'payment-paypal-wallets__status'}>{notice.text}</p>}
        {canRetry && (
          <button type="button" className="payment-button payment-button--retry" disabled={busy} onClick={() => start(async () => {
            if (pendingTicket.current) await capture(pendingTicket.current)
          })}>
            Kiểm tra lại giao dịch ví
          </button>
        )}
      </div>
    </div>
  )
}
