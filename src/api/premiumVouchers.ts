import { apiRequest } from './client'

export type PremiumVoucher = {
  code: string
  packageCode: string
  discountPercent: number
  expiresAt: string | null
}

export const createPremiumVoucher = (voucher: PremiumVoucher) =>
  apiRequest<PremiumVoucher>('/api/admin/premium-vouchers', { method: 'POST', body: voucher })
