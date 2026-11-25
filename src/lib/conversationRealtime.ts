export const CONVERSATION_ATTACHMENT_DELETED = 'homeji:conversation-attachment-deleted'
export const CONVERSATION_READ = 'homeji:conversation-read'

const notificationConnections = new Map<symbol, string>()

export function setNotificationConnection(key: symbol, ownerId?: string | null) {
  if (ownerId) notificationConnections.set(key, ownerId)
  else notificationConnections.delete(key)
}

export function hasNotificationConnection(ownerId: string) {
  return Array.from(notificationConnections.values()).includes(ownerId)
}
