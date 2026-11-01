import { apiRequest } from './client'

export type AgentPostDetails = { title: string; description: string; price: number; condition: string; category: string; address: string; latitude: number; longitude: number }
export type AgentPostDraft = { id: string; details: AgentPostDetails; images: string[]; expiresAt: string; publishedPostId: string | null }
export const confirmAgentPost = (id: string, details: AgentPostDetails) => apiRequest<{ postId: string }>(`/api/chatbot/agent-drafts/${encodeURIComponent(id)}/confirm`, { method: 'POST', body: details, timeoutMs: 60000 })
export const cancelAgentPost = (id: string) => apiRequest<void>(`/api/chatbot/agent-drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })

export type ChatbotNearbyResponse = { status: string; summary: string; radiusKm: number; items: Array<{ id: string; imported: boolean; title: string; address: string; price: number; area: number; distanceKm: number }> }
