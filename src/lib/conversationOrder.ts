import type { PostConversation } from '../api/types'

/** Opening a recipient affects this inbox's order without changing the actual message timestamp. */
export function sortConversationsByActivity(conversations: readonly PostConversation[], contactedAt: Readonly<Record<string, number>> = {}): PostConversation[] {
  const activity = (conversation: PostConversation) => {
    const updated = Date.parse(conversation.updatedAt)
    const created = Date.parse(conversation.createdAt)
    return Math.max(Number.isFinite(updated) ? updated : Number.isFinite(created) ? created : 0, contactedAt[conversation.id] ?? 0)
  }
  return conversations.map(conversation => ({ conversation, at: activity(conversation) }))
    .sort((a, b) => b.at - a.at || a.conversation.id.localeCompare(b.conversation.id))
    .map(item => item.conversation)
}
