import { apiRequest, AI_REQUEST_TIMEOUT_MS } from './client'
import type { RentalPostSummary } from './types'
export type InterestCriteria = {
  area: string; minPrice?: number | null; maxPrice?: number | null; minArea?: number | null; maxArea?: number | null
  amenities?: string[]; excludedAmenities?: string[]; latitude?: number | null; longitude?: number | null
  radiusKm?: number | null; occupants?: number | null; maxDeposit?: number | null; excludeRoommateShare?: boolean
}
export type InterestSettings = { enabled: boolean; aiEnabled: boolean; emailEnabled: boolean }
export type InterestOverview = {
  settings: InterestSettings
  suggestions: Array<{ key: string; criteria: InterestCriteria; sessions: number }>
  following: Array<{ id: string; criteria: InterestCriteria; createdAt: string }>
  rooms: Array<{ post: RentalPostSummary; reason: string; followId: string }>
  notice?: string | null
}
const root = '/api/search-interests'
export const getSearchInterests = () => apiRequest<InterestOverview>(root)
export const setInterestSettings = (body: InterestSettings) => apiRequest<InterestOverview>(root + '/settings', { method: 'PUT', body })
export const observeSearchInterest = (sessionId: string, criteria: InterestCriteria) => apiRequest<InterestOverview>(root + '/observations', { method: 'POST', body: { sessionId, criteria } })
export const followSearchInterest = (body: InterestCriteria) => apiRequest<InterestOverview>(root + '/following', { method: 'POST', body })
export const removeSearchInterest = (id: string) => apiRequest<InterestOverview>(root + '/following/' + encodeURIComponent(id), { method: 'DELETE' })
export const dismissSearchInterest = (area: string) => apiRequest<InterestOverview>(root + '/dismiss', { method: 'POST', body: area })
export const clearInterestHistory = () => apiRequest<InterestOverview>(root + '/history', { method: 'DELETE' })
export const markInterestViewed = (id: string) => apiRequest<void>(root + '/viewed/' + encodeURIComponent(id), { method: 'POST' })
export const inferSearchInterest = () => apiRequest<{ criteria: InterestCriteria | null; unconfirmed: string[]; notice: string | null }>(root + '/ai-proposal', { method: 'POST', timeoutMs: AI_REQUEST_TIMEOUT_MS })

export const rankInterestRooms = () => apiRequest<InterestOverview>(root + '/ai-ranking', { method: 'POST', timeoutMs: AI_REQUEST_TIMEOUT_MS })
