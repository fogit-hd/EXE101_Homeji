import { ChatMessageSender } from '../api/types'
import type { ChatbotDraftAttachment } from './chatbotMedia'

type PostingMessage = { sender: ChatMessageSender; content: string; attachments?: ChatbotDraftAttachment[]; pending?: boolean; failure?: string }
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase().trim()
const posting = (text: string) => /\b(?:dang (?:pas{1,3}|ban|tin|bai|ho|giup)|soan bai|tao tin|pass lai|rao ban|thanh ly)\b/.test(text)
const refinement = (text: string) => /^(?:1|ok(?:ay)?|dong y|xac nhan|dang di|gui di|duoc)[.!\s]*$/.test(text)
  || /^(?:\d+[.)]\s*)?(?:tinh trang|ki(?:ch|ck) thuoc|chat lieu|moi|da su dung|so luong|dia chi|vi tri|sua|doi|them|bo sung|cap nhat|chinh|tieu de|mo ta|dung vi tri)\b/.test(text)
  || /^gia(?: ban)?\s*(?:la|con|:)?\s*\d/.test(text)
  || /^\d+(?:[.,]\d+)?\s*(?:k|tr|trieu|dong|₫)\s*$/.test(text)

/** Recover only the original local image of the immediately continuing task.
 * A real draft already owns its images; never resend those on each edit. Media
 * from persisted history is unavailable and is never invented or fetched. */
export function recoverPostingImages(message: string, messages: readonly PostingMessage[], hasDraft: boolean): ChatbotDraftAttachment[] {
  const current = normalize(message)
  if (hasDraft || posting(current) || !refinement(current)) return []
  for (const prior of messages.slice(-6).filter(row => row.sender === ChatMessageSender.User && !row.pending && !row.failure).reverse()) {
    const text = normalize(prior.content)
    if (posting(text)) return (prior.attachments ?? []).filter(file => file.mimeType.startsWith('image/')).slice(0, 5)
    if (!refinement(text)) break
  }
  return []
}
