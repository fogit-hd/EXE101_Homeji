import { apiRequest } from './client'
import type { RentalPost } from './types'

export type CostScenario = {
  occupants: number; electricityKwh: number; waterM3: number
  electricityUnit: string; waterUnit: string; internetUnit: string
  otherMonthlyFees?: number | null; otherInitialFees?: number | null
  electricityFreeConfirmed?: boolean; waterFreeConfirmed?: boolean; internetFreeConfirmed?: boolean; depositFreeConfirmed?: boolean
}
export type CommuteDestination = {
  label: string; latitude: number; longitude: number; mode: 'WALK' | 'DRIVE'; departureTime?: string
}
export type DecisionItem = {
  post: RentalPost
  cost: {
    postId: string; knownMonthlySubtotal: number; estimatedMonthlyTotal: number | null
    initialPayment: number | null; unknown: string[]; questions: string[]; sourceType: string; updatedAt: string
  }
  commute: {
    postId: string; distanceMeters: number | null; durationMinutes: number | null
    mode: string; calculatedAt: string; departureTime: string | null; status: string
  } | null
}
export type DecisionResponse = { posts: DecisionItem[]; unavailablePostIds: string[]; summary: string }
export const getRentalDecision = (postIds: string[], scenario: CostScenario, destination?: CommuteDestination, signal?: AbortSignal) =>
  apiRequest<DecisionResponse>('/api/rental-assistant/compare', { method: 'POST', body: { postIds, scenario, destination }, signal })
export type DraftPreview = { title: string; description: string; missing: string[]; sourceType: string }
export const previewRentalDraft = (postId: string, notes: string) =>
  apiRequest<DraftPreview>('/api/rental-assistant/draft-preview', { method: 'POST', body: { postId, notes } })
export type AdminAssistantSummary = {
  calculatedAt: string; pendingPosts: number; pendingReports: number; summary: string
  tasks: Array<{ kind: string; id: string; label: string }>
}
export const getAdminAssistantSummary = () => apiRequest<AdminAssistantSummary>('/api/rental-assistant/admin-summary')
export const deleteChatbotHistory = (conversationId: string) => apiRequest<void>(`/api/chatbot/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' })
