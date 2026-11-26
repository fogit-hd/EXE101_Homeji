import { useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react'
import type { PostMessage } from '../../api'
import { ChatMediaPicker } from '../../components/map/ChatExtras'
import { VoiceMessageRecorder } from '../../components/map/VoiceMessageRecorder'
import type { AttachMode } from '../../components/map/messages/MessageFormatting'

type Props = {
  activeId: string | null
  blocked: boolean
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  sending: boolean
  uploading: boolean
  cannotSend: boolean
  attachMode: AttachMode
  setAttachMode: Dispatch<SetStateAction<AttachMode>>
  imageInputRef: RefObject<HTMLInputElement | null>
  composerRef: RefObject<HTMLTextAreaElement | null>
  imageCount: number
  voiceBusy: boolean
  onImageSelection: (files: FileList | null) => void
  onSubmit: () => void
  onSendText: (text: string) => void
  onSentMessage: (message: PostMessage) => void
  onError: (message: string | null) => void
}

const MAX_FIELD_PX = 120
/** Keeps the field focused (and the keyboard up) when a control next to it is tapped. */
const keepFocus = (event: PointerEvent) => event.preventDefault()

/**
 * Phone composer, one row like a messaging app: + · camera · photos · mic, then the field with the
 * emoji/GIF button inside it, then send (👍 while empty). Focusing or typing folds the tools into a
 * single › so the field gets the width; › opens them again without dropping the keyboard.
 */
export function MobileComposerRow({
  activeId, blocked, draft, setDraft, sending, uploading, cannotSend, attachMode, setAttachMode, imageInputRef,
  composerRef, imageCount, voiceBusy, onImageSelection, onSubmit, onSendText, onSentMessage, onError,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const hasContent = draft.trim().length > 0 || imageCount > 0
  const folded = !recording && !toolsOpen && (focused || draft.length > 0)
  const toolsDisabled = cannotSend

  // The field grows with its text up to five lines, then scrolls; folding changes its width too.
  useLayoutEffect(() => {
    const el = composerRef.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_PX)}px`
    }
    fit()
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [draft, folded, composerRef])

  return (
    <form
      className={`m-composer${folded ? ' is-folded' : ''}`}
      onSubmit={(event) => { event.preventDefault(); onSubmit() }}
    >
      {folded ? (
        <button type="button" className="m-composer__btn m-composer__unfold" aria-label="Hiện công cụ đính kèm"
          onPointerDown={keepFocus} onClick={() => setToolsOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      ) : (
        <div className="m-composer__tools">
          <button type="button" className={`m-composer__btn${attachMode ? ' is-open' : ''}`}
            aria-label="Đính kèm vị trí, địa chỉ hoặc tin đăng" aria-expanded={attachMode != null}
            disabled={toolsDisabled} onClick={() => setAttachMode((mode) => (mode ? null : 'menu'))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
          </button>
          <button type="button" className="m-composer__btn" aria-label="Chụp ảnh" disabled={toolsDisabled}
            onClick={() => cameraRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </button>
          <button type="button" className="m-composer__btn" aria-label="Chọn ảnh từ thư viện" disabled={toolsDisabled}
            onClick={() => imageInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m20 16-4.5-4.5L7 19.5" /></svg>
          </button>
          {activeId ? (
            <VoiceMessageRecorder key={`voice-${activeId}-${voiceBusy}-${blocked}`} conversationId={activeId}
              disabled={toolsDisabled} onActivityChange={setRecording}
              onSent={onSentMessage} onError={onError} />
          ) : null}
        </div>
      )}
      <input ref={cameraRef} className="m-composer__file" type="file" accept="image/jpeg,image/png,image/webp"
        capture="environment" tabIndex={-1} aria-hidden="true"
        onChange={(event) => { onImageSelection(event.target.files); event.target.value = '' }} />

      <div className="m-composer__field">
        <textarea
          ref={composerRef}
          value={draft}
          rows={1}
          maxLength={2000}
          placeholder="Nhắn tin"
          aria-label="Nội dung tin nhắn"
          enterKeyHint="enter"
          disabled={cannotSend}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setToolsOpen(false) }}
          onChange={(event) => { setDraft(event.target.value); setToolsOpen(false) }}
        />
        {activeId ? (
          <ChatMediaPicker key={`${activeId}-${blocked}`} compact conversationId={activeId}
            disabled={toolsDisabled}
            onEmoji={(emoji) => setDraft((current) => (current.length + emoji.length > 2000 ? current : current + emoji))}
            onSent={onSentMessage} onError={onError} />
        ) : null}
      </div>

      {hasContent ? (
        <button type="submit" className="m-composer__btn m-composer__send" aria-label="Gửi"
          disabled={cannotSend || (imageCount > 0 ? uploading : sending)} onPointerDown={keepFocus}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12 20 4.5 15.5 20l-3-6.5z" /><path d="m12.5 13.5 3-3" /></svg>
        </button>
      ) : (
        <button type="button" className="m-composer__btn m-composer__like" aria-label="Gửi biểu tượng thích"
          disabled={cannotSend || sending} onClick={() => onSendText('👍')}>
          <span aria-hidden="true">👍</span>
        </button>
      )}
    </form>
  )
}
