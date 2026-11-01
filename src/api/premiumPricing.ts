import { apiRequest } from './client'
export type PremiumPriceAnnouncement = { id: string; packageCode: string; packageName: string; previousPrice: number; price: number; reason: string; createdAt: string }
export const getPremiumPriceAnnouncements = () => apiRequest<PremiumPriceAnnouncement[]>('/api/subscriptions/price-announcements', { auth: false })
export const changePremiumPrice = (code: string, request: { requestId: string; expectedPrice: number; price: number; reason: string }) => apiRequest<PremiumPriceAnnouncement>(`/api/subscriptions/price-announcements/${encodeURIComponent(code)}`, { method: 'POST', body: request })
