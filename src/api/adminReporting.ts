import { apiDownload, apiRequest } from './client'
import type { UserRole, PaymentStatus, PaymentMethod } from './types'

export interface AdminPage<T> { items: T[]; totalCount: number; page: number; pageSize: number }
export interface AdminRegisteredAccount {
  userId: string; displayName: string; email: string | null; role: UserRole | null; registeredAt: string
  emailConfirmed: boolean; profileCompleted: boolean; isPremium: boolean; premiumExpiresAt: string | null
}
export interface AdminMember {
  id: string; userId: string; displayName: string; email: string | null; packageCode: string; packageName: string
  startedAt: string; expiresAt: string; registeredAt: string; state: string; paymentId: string | null
  amount: number | null; paymentStatus: PaymentStatus | null; paymentMethod: PaymentMethod | null
}
export interface AdminReportExport {
  id: string; fileName: string; periodDays: number; createdAt: string; recipient: string
  emailStatus: string; emailAcceptedAt: string | null; attempts: number; lastErrorCode: string | null
}
export const getAdminRegisteredAccounts = (keyword: string, page: number) =>
  apiRequest<AdminPage<AdminRegisteredAccount>>('/api/admin/reporting/accounts', { params: { keyword: keyword || undefined, page, pageSize: 25 } })
export const getAdminMembers = (keyword: string, state: string, page: number) =>
  apiRequest<AdminPage<AdminMember>>('/api/admin/reporting/members', { params: { keyword: keyword || undefined, state, page, pageSize: 25 } })
export const getAdminExports = () => apiRequest<AdminReportExport[]>('/api/admin/reporting/exports')
export const createAdminExport = (requestId: string, days: number) => apiRequest<AdminReportExport>('/api/admin/reporting/exports', { method: 'POST', body: { requestId, days } })
export const downloadAdminExport = (id: string) => apiDownload(`/api/admin/reporting/exports/${encodeURIComponent(id)}/download`)
