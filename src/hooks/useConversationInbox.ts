import { useCallback, useEffect, useState, type SetStateAction } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError, getConversations, getStoredSession, type PostConversation } from '../api'
import { readChatSnapshot, removeChatSnapshot, writeChatSnapshot } from '../lib/chatCache'

const emptyInbox: PostConversation[] = []
const inboxKey = (ownerId: string | null) => ['conversation-inbox', ownerId] as const

export function useConversationInbox(ownerId: string | null, cacheOwnerId: string | null = ownerId) {
  const client = useQueryClient()
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null)
  const [blockedCacheOwner, setBlockedCacheOwner] = useState<string | null>(null)
  useEffect(() => {
    if (!cacheOwnerId || cacheOwnerId !== ownerId) return
    let active = true
    const key = inboxKey(ownerId)
    void Promise.resolve().then(() => readChatSnapshot<PostConversation[]>(cacheOwnerId, 'inbox')).then(snapshot => {
      if (!active || getStoredSession()?.userId !== cacheOwnerId) return
      if (snapshot && client.getQueryData(key) === undefined) client.setQueryData(key, snapshot, { updatedAt: 1 })
      setHydratedOwner(cacheOwnerId)
    })
    return () => { active = false }
  }, [cacheOwnerId, ownerId, client])
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: inboxKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: async ({ signal }) => {
      try {
        const rows = await getConversations(signal)
        if (!signal.aborted && cacheOwnerId && getStoredSession()?.userId === cacheOwnerId) {
          setBlockedCacheOwner(null)
          void writeChatSnapshot(cacheOwnerId, 'inbox', rows)
        }
        return rows
      } catch (error) {
        if (!signal.aborted && cacheOwnerId && error instanceof ApiRequestError && [401, 403].includes(error.status)) {
          setBlockedCacheOwner(cacheOwnerId)
          void removeChatSnapshot(cacheOwnerId, 'inbox')
        }
        throw error
      }
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
  const refresh = useCallback(() => {
    if (ownerId && navigator.onLine !== false && document.visibilityState !== 'hidden') void refetch({ cancelRefetch: false })
  }, [ownerId, refetch])
  const update = useCallback((change: SetStateAction<PostConversation[]>) => {
    client.setQueryData<PostConversation[]>(inboxKey(ownerId), previous =>
      typeof change === 'function' ? change(previous ?? emptyInbox) : change)
  }, [client, ownerId])
  const cancel = useCallback(() => client.cancelQueries({ queryKey: inboxKey(ownerId), exact: true }), [client, ownerId])
  const reconcileRead = useCallback((conversationId: string, unreadCount: number) => {
    const key = inboxKey(ownerId)
    const patch = () => {
      if (getStoredSession()?.userId !== ownerId) return
      client.setQueryData<PostConversation[]>(key, previous => previous?.map(item =>
        item.id === conversationId && item.unreadCount !== unreadCount ? { ...item, unreadCount } : item))
    }
    if (client.getQueryState(key)?.fetchStatus !== 'fetching') {
      patch()
      return
    }
    // The in-flight inbox snapshot may predate the read acknowledgment.
    void cancel().then(() => {
      if (getStoredSession()?.userId !== ownerId) return
      patch()
      refresh()
    })
  }, [client, ownerId, cancel, refresh])
  const blocked = Boolean(cacheOwnerId && blockedCacheOwner === cacheOwnerId)
  return {
    conversations: blocked ? emptyInbox : data ?? emptyInbox,
    loading: !blocked && (isLoading || Boolean(data === undefined && cacheOwnerId && hydratedOwner !== cacheOwnerId && !error)),
    error: data === undefined || blocked ? error : null,
    refresh, update, cancel, reconcileRead,
  }
}
