import { apiRequest } from './client'

export type AgentPostDetails = { title: string; description: string; price: number; condition: string; category: string; address: string; latitude: number; longitude: number; kind?: 'secondHand' | 'food' | 'rental' | 'roomTransfer' | 'roommate' | 'wanted'; deposit?: number | null; area?: number | null; maxOccupants?: number | null; availableSlots?: number | null; minimumLeaseMonths?: number | null; houseRules?: string | null; amenities?: string[]; availableFrom?: string | null; transferKind?: number | null; originalLeaseEndsOn?: string | null; passFee?: number | null; transferReason?: string | null; ownerConsentConfirmed?: boolean; ownerConsentContact?: string | null; availableQuantity?: number | null; unit?: string | null; preparationMinutes?: number | null }
export type AgentPostDraft = { id: string; details: AgentPostDetails; images: string[]; expiresAt: string; publishedPostId: string | null }
export const confirmAgentPost = (id: string, details: AgentPostDetails) => apiRequest<{ postId: string }>(`/api/chatbot/agent-drafts/${encodeURIComponent(id)}/confirm`, { method: 'POST', body: details, timeoutMs: 60000 })
export const cancelAgentPost = (id: string) => apiRequest<void>(`/api/chatbot/agent-drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })

export type ChatbotNearbyResponse = { status: string; summary: string; radiusKm: number; items: Array<{ id: string; imported: boolean; title: string; address: string; price: number; area: number; distanceKm: number }> }

export type AgentRoommateCandidate = { userId: string; displayName: string; preferredArea: string | null; maxBudget: number | null; introduction: string | null; compatibilityScore: number | null }
