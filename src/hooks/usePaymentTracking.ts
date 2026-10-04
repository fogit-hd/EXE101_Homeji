import { useCallback, useEffect, useRef, useState } from 'react'
import { getPayment, getPaymentByOrderCode, type Payment } from '../api'
import { PaymentStatus } from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'

export function usePaymentTracking(paymentId: string | null, orderCode: string | null) {
  const { refreshProfile } = useAuth()
  const [result, setResult] = useState<{ key: string; payment: Payment } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const key = paymentId ?? orderCode ?? ''

  useEffect(() => {
    if (!key) return
    let disposed = false
    let inFlight = false
    let timer: number | undefined
    let current: Payment | null = null
    let profileUpdated = false

    const refresh = async () => {
      if (disposed || inFlight) return
      inFlight = true
      window.clearTimeout(timer)
      setBusy(true)
      try {
        const payment = paymentId ? await getPayment(paymentId) : await getPaymentByOrderCode(orderCode!)
        if (disposed) return
        current = payment
        setResult({ key, payment })
        setError('')
        if (payment.status === PaymentStatus.Completed && !profileUpdated) {
          await refreshProfile()
          profileUpdated = true
        }
      } catch (err) {
        if (!disposed) setError(getErrorMessage(err, 'Chưa thể cập nhật trạng thái. Vui lòng thử lại.'))
      } finally {
        inFlight = false
        if (!disposed) {
          setBusy(false)
          // Keep checking overdue orders until the server confirms their final status.
          if (!current || current.status === PaymentStatus.Pending || (!profileUpdated && current.status === PaymentStatus.Completed)) {
            timer = window.setTimeout(() => {
              if (document.visibilityState === 'visible') void refresh()
            }, 5000)
          }
        }
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    refreshRef.current = refresh
    void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [key, paymentId, orderCode, refreshProfile])

  const refresh = useCallback(() => refreshRef.current(), [])
  return { payment: result?.key === key ? result.payment : null, busy, error, refresh }
}
