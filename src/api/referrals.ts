import { apiRequest } from './client'
export type Voucher = { id: string; purpose: 'food' | 'vip'; rate: number; maximumDiscount: number; minimumSpend: number; expiresAt: string; used: boolean }
export type ReferralSummary = { code: string | null; successfulInvites: number; remainingPairs: number; received: boolean; vouchers: Voucher[] }
export const getReferrals = () => apiRequest<ReferralSummary>('/api/referrals')
export const createReferralCode = () => apiRequest<ReferralSummary>('/api/referrals/code', { method: 'POST' })
export const claimReferral = (code: string) => apiRequest<ReferralSummary>('/api/referrals/claim', { method: 'POST', body: { code } })
export const quoteVoucher = (voucherId: string, purpose: string, amount: number) => apiRequest<{ discount: number }>('/api/referrals/quote', { method: 'POST', body: { voucherId, purpose, amount } })
