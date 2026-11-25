import { useEffect, useRef } from 'react'
import { transcribeChatbotAudio } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { prepareChatbotAttachment, validateChatbotAttachments, type ChatbotDraftAttachment } from '../../lib/chatbotMedia'
import { VoiceMessageRecorder } from './VoiceMessageRecorder'

import { ChatbotMediaPreview } from './ChatbotMediaPreview'

export function ChatbotMediaComposer({ attachments, disabled, recaptchaSiteKey, showPreview = true, onChange, onDictation, onError, onBusyChange, onRecordingChange }: {
  attachments: ChatbotDraftAttachment[]
  disabled: boolean
  recaptchaSiteKey?: string | null
  showPreview?: boolean
  onChange: (attachments: ChatbotDraftAttachment[]) => void
  onDictation: (text: string) => void
  onError: (error: string) => void
  onBusyChange: (busy: boolean) => void
  onRecordingChange: (active: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => {
    const controller = pending.current
    pending.current = null
    controller?.abort()
    onBusyChange(false)
  }, [onBusyChange])

  async function process(action: (signal: AbortSignal) => Promise<void>) {
    if (pending.current || disabled) return
    const controller = new AbortController()
    pending.current = controller
    onBusyChange(true)
    try { await action(controller.signal) }
    catch (error) { if (!controller.signal.aborted) throw error }
    finally {
      if (pending.current === controller) { pending.current = null; onBusyChange(false) }
    }
  }

  return <>
    {showPreview ? <ChatbotMediaPreview attachments={attachments} onRemove={disabled ? undefined : id => onChange(attachments.filter(file => file.id !== id))} /> : null}
    <div className="homeji-assistant__media-tools">
      <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} aria-label="Chọn ảnh gửi Homeji" onChange={event => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (!files.length) return
        if (files.length + attachments.filter(file => file.mimeType !== 'audio/wav').length > 5) { onError('Mỗi tin nhắn tối đa 5 ảnh.'); return }
        void process(async signal => {
          const prepared: ChatbotDraftAttachment[] = []
          for (const file of files) {
            if (signal.aborted) return
            prepared.push(await prepareChatbotAttachment(file, file.name))
          }
          const next = [...attachments, ...prepared]
          validateChatbotAttachments(next)
          if (!signal.aborted) onChange(next)
        }).catch(error => onError(getErrorMessage(error, 'Không đọc được ảnh.')))
      }} />
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} aria-label="Đính kèm ảnh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 5 5 3-3 4 4" /></svg>Ảnh
      </button>
      <VoiceMessageRecorder disabled={disabled} transcribeOnStop onError={onError} onActivityChange={onRecordingChange}
        onRecorded={async (blob, mode) => {
          await process(async signal => {
            const attachment = await prepareChatbotAttachment(blob, 'Bản ghi.wav')
            if (mode === 'dictation') {
              const result = await transcribeChatbotAudio({ mimeType: attachment.mimeType, data: attachment.data }, signal, recaptchaSiteKey)
              if (!signal.aborted) onDictation(result.text)
            } else {
              const next = [...attachments, attachment]
              validateChatbotAttachments(next)
              if (!signal.aborted) onChange(next)
            }
          })
        }} />
    </div>
  </>
}
