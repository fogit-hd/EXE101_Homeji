import { apiRequest } from './client'
export type AiReviewSettings = { enabled: boolean; autoBlock: boolean; batchSize: number; spacingSeconds: number; pauseMinutes: number; dailyRequestLimit: number; dailyTokenBudget: number }
export type AiReviewItem = { id: string; subjectId: string; kind: string; title: string; description?: string; state: string; category: string | null; reason: string | null; evidence: string | null; confidence: number | null; attempts: number; createdAt: string; completedAt: string | null; reviewedAt: string | null }
export type AiReviewDashboard = { settings: AiReviewSettings; nextAllowedAt: string; requestsToday: number; tokensReservedToday: number; pauseReason: string | null; pending: number; needsReview: number; blocked: number; items: AiReviewItem[] }
export const getAiReviews = () => apiRequest<AiReviewDashboard>('/api/admin/ai-reviews')
export const saveAiReviewSettings = (settings: AiReviewSettings) => apiRequest<void>('/api/admin/ai-reviews/settings', { method: 'PUT', body: settings })
export const queueAiReviewBackfill = () => apiRequest<void>('/api/admin/ai-reviews/backfill', { method: 'POST' })
export const resolveAiReview = (id: string, restore: boolean) => apiRequest<void>(`/api/admin/ai-reviews/${id}/resolve`, { method: 'POST', body: { restore } })
