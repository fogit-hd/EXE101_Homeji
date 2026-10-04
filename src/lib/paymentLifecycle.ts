import type { Payment } from '../api/types'

export const PAYMENT_LIFETIME_MS = 15 * 60 * 1000

export function paymentDeadline(payment: Pick<Payment, 'createdAt' | 'expiresAt'>): number | null {
  const deadline = payment.expiresAt
    ? Date.parse(payment.expiresAt)
    : Date.parse(payment.createdAt) + PAYMENT_LIFETIME_MS
  return Number.isFinite(deadline) ? deadline : null
}

export function paymentSecondsLeft(payment: Pick<Payment, 'createdAt' | 'expiresAt'>, now: number): number | null {
  const deadline = paymentDeadline(payment)
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function formatPaymentCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export function safeCheckoutUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function paymentWaitingUrl(paymentId: string): string {
  return `/payments/wait?paymentId=${encodeURIComponent(paymentId)}`
}
