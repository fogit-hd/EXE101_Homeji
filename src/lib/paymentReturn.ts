import { PaymentMethod, PaymentStatus } from '../api/types.ts'

export type PaymentReturnHint = 'none' | 'cancelled' | 'failed' | 'expired' | 'verifying'
// Redirect values are untrusted UI hints. Only the authenticated payment API
// may confirm a terminal transaction, credit a wallet or activate a package.
export function paymentReturnHint(params: URLSearchParams, method?: number): PaymentReturnHint {
  const provider = params.get('provider')?.toLowerCase()
  const momo = provider === 'momo' || (!provider && (method === PaymentMethod.Momo || params.has('resultCode')))
  const payos = provider === 'payos' || (!provider && (method === PaymentMethod.PayOs || params.has('cancel') || params.has('providerStatus') || params.has('status')))
  if (momo && (method === undefined || method === PaymentMethod.Momo)) {
    const code = params.get('resultCode')
    if (code === '1006' || code === '1003' || code === '1017') return 'cancelled'
    if (code === '1005') return 'expired'
    if (code === '0' || code === '7000' || code === '7002' || code === '9000') return 'verifying'
    if (code && /^\d{1,6}$/.test(code)) return 'failed'
  }
  if (payos && (method === undefined || method === PaymentMethod.PayOs)) {
    const status = (params.get('providerStatus') ?? params.get('status'))?.toUpperCase()
    if (params.get('cancel')?.toLowerCase() === 'true' || status === 'CANCELLED') return 'cancelled'
    if (status === 'EXPIRED') return 'expired'
    if (status === 'PAID' || status === 'PROCESSING') return 'verifying'
    if (params.has('code') && params.get('code') !== '00') return 'failed'
  }
  return 'none'
}

export function paymentResultState(status: number, hint: PaymentReturnHint, overdue: boolean) {
  if (status === PaymentStatus.Completed) return 'success'
  if (status === PaymentStatus.Cancelled) return 'cancelled'
  if (status === PaymentStatus.Expired) return 'expired'
  if (status === PaymentStatus.Failed) return 'failed'
  if (status !== PaymentStatus.Pending) return 'verifying'
  if (hint !== 'none') return hint === 'cancelled' ? 'cancel-return' : hint === 'failed' ? 'failed-return' : hint === 'expired' ? 'expired-return' : 'verifying'
  return overdue ? 'overdue' : 'pending'
}

export function paymentReturnUrl(params: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of ['paymentId', 'orderCode', 'orderId', 'provider', 'cancel', 'providerStatus', 'status', 'code', 'resultCode']) {
    const value = params.get(key)
    if (value) next.set(key, value)
  }
  return `/payments/wait?${next}`
}
