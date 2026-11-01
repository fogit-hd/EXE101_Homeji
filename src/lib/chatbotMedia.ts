export type ChatbotAttachment = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/wav'; data: string }
export type ChatbotDraftAttachment = ChatbotAttachment & { id: string; name: string; preview: string; bytes: number }
export const MAX_AI_MEDIA_BYTES = 8 * 1024 * 1024

export async function prepareChatbotAttachment(blob: Blob, name: string): Promise<ChatbotDraftAttachment> {
  const mimeType = blob.type
  if (!['image/jpeg', 'image/png', 'image/webp', 'audio/wav'].includes(mimeType)) throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.')
  if (!blob.size || blob.size > (mimeType === 'audio/wav' ? 44 + 16000 * 2 * 120 : 4 * 1024 * 1024)) {
    throw new Error('Ảnh tối đa 4 MB; bản ghi tối đa 2 phút.')
  }
  if (mimeType !== 'audio/wav') {
    const image = await createImageBitmap(blob)
    try {
      const scale = Math.min(1, 2048 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Không xử lý được ảnh. Hãy thử ảnh khác.')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        result => result ? resolve(result) : reject(new Error('Không xử lý được ảnh.')), 'image/jpeg', 0.82))
    } finally { image.close() }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không đọc được tệp. Hãy chọn lại.'))
    reader.readAsDataURL(blob)
  })
  // Data URLs avoid dangling object URLs when messages are replaced or retried.
  return { id: crypto.randomUUID(), name, mimeType: blob.type as ChatbotAttachment['mimeType'], data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl, bytes: blob.size }
}

export function validateChatbotAttachments(attachments: ChatbotDraftAttachment[]) {
  if (attachments.filter(file => file.mimeType !== 'audio/wav').length > 5) throw new Error('Mỗi tin nhắn tối đa 5 ảnh.')
  if (attachments.filter(file => file.mimeType === 'audio/wav').length > 1) throw new Error('Mỗi tin nhắn tối đa 1 bản ghi.')
  if (attachments.reduce((total, file) => total + file.bytes, 0) > MAX_AI_MEDIA_BYTES) throw new Error('Tổng tệp đính kèm tối đa 8 MB.')
}
