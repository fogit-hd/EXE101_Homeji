import { apiRequest } from './client'
import type { AccountMessage } from './types'

export const requestPasswordOtp = (email: string) =>
  apiRequest<AccountMessage>('/api/account/request-password-otp', { method: 'POST', auth: false, body: { email } })

export const resetPasswordWithOtp = (email: string, code: string, newPassword: string) =>
  apiRequest<AccountMessage>('/api/account/reset-password-otp', { method: 'POST', auth: false, body: { email, code, newPassword } })
