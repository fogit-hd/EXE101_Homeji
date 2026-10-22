export const RENTAL_MESSAGE_DRAFT_MAX_LENGTH = 2_000
const DRAFT_LIFETIME_MS = 10 * 60_000

export type RentalMessageDraftTarget = {
  userId: string
  conversationId: string
  postId: string
  recipientId: string
}

export type RentalMessageDraft = RentalMessageDraftTarget & {
  id: number
  body: string
  expiresAt: number
}

type RentalConversationTarget = {
  id: string
  subjectType: number
  subjectId: string
  otherParticipantId: string
}

/** The inbox must resolve the same listing and recipient before it offers a draft. */
export function rentalDraftTarget(userId: string | undefined, conversation: RentalConversationTarget | null | undefined): RentalMessageDraftTarget | null {
  if (!userId || !conversation || conversation.subjectType !== 1) return null
  return { userId, conversationId: conversation.id, postId: conversation.subjectId, recipientId: conversation.otherParticipantId }
}

/** Ephemeral handoff only: no URL, localStorage, provider or automatic message send. */
export function createRentalMessageDraftStore(now: () => number = Date.now) {
  const drafts = new Map<string, RentalMessageDraft>()
  const listeners = new Set<() => void>()
  let serial = 0
  const key = (target: RentalMessageDraftTarget) => JSON.stringify([target.userId, target.conversationId])
  const notify = () => { for (const listener of listeners) listener() }
  const matches = (draft: RentalMessageDraft, target: RentalMessageDraftTarget) =>
    draft.userId === target.userId && draft.conversationId === target.conversationId
    && draft.postId === target.postId && draft.recipientId === target.recipientId
  const peek = (target: RentalMessageDraftTarget): RentalMessageDraft | null => {
    const draft = drafts.get(key(target))
    if (!draft || draft.expiresAt <= now() || !matches(draft, target)) return null
    return draft
  }
  return {
    queue(target: RentalMessageDraftTarget, body: string): boolean {
      const text = body.trim()
      if (!text || text.length > RENTAL_MESSAGE_DRAFT_MAX_LENGTH
        || target.userId === target.recipientId
        || Object.values(target).some(value => !value.trim() || value.length > 128)) return false
      for (const [entryKey, draft] of drafts) {
        if (draft.expiresAt <= now() || draft.userId !== target.userId) drafts.delete(entryKey)
      }
      drafts.delete(key(target))
      // Bound memory even if several detail views are used without opening the inbox.
      if (drafts.size >= 5) drafts.delete(drafts.keys().next().value!)
      drafts.set(key(target), { ...target, id: ++serial, body: text, expiresAt: now() + DRAFT_LIFETIME_MS })
      notify()
      return true
    },
    peek,
    take(target: RentalMessageDraftTarget, id: number): RentalMessageDraft | null {
      const draft = peek(target)
      if (!draft) { notify(); return null }
      if (draft.id !== id) return null
      drafts.delete(key(target))
      notify()
      return draft
    },
    clearUser(userId: string) {
      let changed = false
      for (const [entryKey, draft] of drafts) {
        if (draft.userId === userId) { drafts.delete(entryKey); changed = true }
      }
      if (changed) notify()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export const rentalMessageDraftStore = createRentalMessageDraftStore()
