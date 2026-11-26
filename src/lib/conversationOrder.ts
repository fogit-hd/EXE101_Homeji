import type { PostConversation, PostMessage } from '../api/types'

/** Only actual messages move a thread ahead of other conversations. */
export function sortConversationsByActivity(conversations: readonly PostConversation[]): PostConversation[] {
  const activity = (conversation: PostConversation, hasMessage: boolean) => {
    const updated = Date.parse(conversation.updatedAt)
    const created = Date.parse(conversation.createdAt)
    return hasMessage && Number.isFinite(updated) ? updated : Number.isFinite(created) ? created : Number.isFinite(updated) ? updated : 0
  }
  return conversations.map(conversation => {
    const hasMessage = conversation.lastMessage != null || conversation.lastMessageSenderId != null
    return { conversation, hasMessage, at: activity(conversation, hasMessage) }
  }).sort((a, b) => Number(b.hasMessage) - Number(a.hasMessage) || b.at - a.at || a.conversation.id.localeCompare(b.conversation.id))
    .map(item => item.conversation)
}

/** A slow upload response cannot replace a newer text/incoming preview. */
export function updateConversationAfterSend(conversations: readonly PostConversation[], message: PostMessage): PostConversation[] {
  return sortConversationsByActivity(conversations.map(conversation => {
    if (conversation.id !== message.conversationId) return conversation
    const hasMessage = conversation.lastMessage != null || conversation.lastMessageSenderId != null
    if (hasMessage && Date.parse(conversation.updatedAt) > Date.parse(message.sentAt)) return conversation
    return { ...conversation, lastMessage: message.body, lastMessageSenderId: message.senderId, updatedAt: message.sentAt, unreadCount: 0 }
  }))
}
