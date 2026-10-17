import { apiRequest } from './client'
import type { AccountMessage, AuthSession } from './types'

export const verifySignupOtp = (email: string, code: string) =>
  apiRequest<AuthSession>('/api/account/verify-signup-otp', { method: 'POST', auth: false, body: { email, code } })

export const resendSignupOtp = (email: string) =>
  apiRequest<AccountMessage>('/api/account/resend-signup-otp', { method: 'POST', auth: false, body: { email } })

export type TransactionReceipt = {
  id: string
  referenceId: string
  event: 1 | 2 | 3 | 4 | 5 | 6 | 7
  amount: number
  currency: string
  referenceCode: string
  description: string
  issuedAt: string
  emailSentAt: string | null
  emailAttempts: number
  emailFailed: boolean
  emailScheduled: boolean
}

export const getMyReceipts = (page: number, signal?: AbortSignal) =>
  apiRequest<{ items: TransactionReceipt[]; hasMore: boolean }>('/api/receipts', { params: { page, pageSize: 20 }, signal })

export const getMyReceiptHtml = (id: string) =>
  apiRequest<string>(`/api/receipts/${encodeURIComponent(id)}/html-content`)
