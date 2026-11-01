export type ChatbotAttachment = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/wav'; data: string }
export type ChatbotDraftAttachment = ChatbotAttachment & { id: string; name: string; preview: string; bytes: number }
export const MAX_AI_MEDIA_BYTES = 8 * 1024 * 1024

export async function prepareChatbotAttachment(blob: Blob, name: string): Promise<ChatbotDraftAttachment> {
  const mimeType = blob.type
  if (!['image/jpeg', 'image/png', 'image/webp', 'audio/wav'].includes(mimeType)) throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.')
  if (!blob.size || blob.size > (mimeType === 'audio/wav' ? 44 + 16000 * 2 * 120 : 4 * 1024 * 1024)) {
    throw new Error('Ảnh tối đa 4 MB; bản ghi tối đa 2 phút.')
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không đọc được tệp. Hãy chọn lại.'))
    reader.readAsDataURL(blob)
  })
  // Data URLs avoid dangling object URLs when messages are replaced or retried.
  return { id: crypto.randomUUID(), name, mimeType: mimeType as ChatbotAttachment['mimeType'], data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl, bytes: blob.size }
}

export function validateChatbotAttachments(attachments: ChatbotDraftAttachment[]) {
  if (attachments.filter(file => file.mimeType !== 'audio/wav').length > 3) throw new Error('Mỗi tin nhắn tối đa 3 ảnh.')
  if (attachments.filter(file => file.mimeType === 'audio/wav').length > 1) throw new Error('Mỗi tin nhắn tối đa 1 bản ghi.')
  if (attachments.reduce((total, file) => total + file.bytes, 0) > MAX_AI_MEDIA_BYTES) throw new Error('Tổng tệp đính kèm tối đa 8 MB.')
}
