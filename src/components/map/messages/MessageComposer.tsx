import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  MessageAttachmentContext,
  type PostConversation,
  type PostMessage,
} from '../../../api'
import { ChoicePicker } from '../../ui/ChoicePicker'
import { AddressAutocomplete, type PlaceResult } from '../AddressAutocomplete'
import { ChatMediaPicker } from '../ChatExtras'
import { RentalMessageDraftNotice } from '../RentalMessageDraftNotice'
import { VoiceMessageRecorder } from '../VoiceMessageRecorder'
import { PendingImagePreview } from './MessagePrimitives'
import { attachmentContextLabel, type AttachMode, type ChatShareTarget } from './MessageFormatting'

type Props = {
  active: PostConversation | null
  activeId: string | null
  peerName: string
  currentUserId?: string | null
  currentProfileId?: string | null
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  sending: boolean
  cannotSend: boolean
  blocked: boolean
  attachMode: AttachMode
  setAttachMode: Dispatch<SetStateAction<AttachMode>>
  attachRef: RefObject<HTMLDivElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  composerRef: RefObject<HTMLTextAreaElement | null>
  imageFiles: File[]
  setImageFiles: Dispatch<SetStateAction<File[]>>
  imageContext: MessageAttachmentContext
  setImageContext: Dispatch<SetStateAction<MessageAttachmentContext>>
  addressDraft: string
  setAddressDraft: Dispatch<SetStateAction<string>>
  addressPlace: PlaceResult | null
  setAddressPlace: Dispatch<SetStateAction<PlaceResult | null>>
  selectedPlace: ChatShareTarget | null
  selectedListing: ChatShareTarget | null
  mapArea: ChatShareTarget | null
  onError: (message: string | null) => void
  onImageSelection: (files: FileList | null) => void
  onSendGps: () => void
  onSendAddress: () => void
  onSendTarget: (kind: 'place' | 'area' | 'address', target: ChatShareTarget, fallbackTitle: string) => void
  onResetAddressDraft: () => void
  onSend: () => void
  onSendImages: () => void
  onSentMessage: (message: PostMessage) => void
  voiceBusy: boolean
}

export function MessageComposer({
  active, activeId, peerName, currentUserId, currentProfileId, draft, setDraft, sending,
  cannotSend, blocked, attachMode, setAttachMode, attachRef, imageInputRef, composerRef,
  imageFiles, setImageFiles, imageContext, setImageContext, addressDraft, setAddressDraft,
  addressPlace, setAddressPlace, selectedPlace, selectedListing, mapArea, onError,
  onImageSelection, onSendGps, onSendAddress, onSendTarget, onResetAddressDraft,
  onSend, onSendImages, onSentMessage, voiceBusy,
}: Props) {
  return (
        <div className="map-messages__composer-wrap" ref={attachRef}>
          {attachMode === 'menu' ? (
            <div className="map-messages__attach-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={sending}
                onClick={() => imageInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="m21 16-5-5-8 8" /></svg>Gửi ảnh phòng…
              </button>
              <button type="button" role="menuitem" disabled={sending} onClick={() => void onSendGps()}>
                <svg viewBox="0 0 24 24" aria-hidden><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>Gửi vị trí hiện tại
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending}
                onClick={() => {
                  onResetAddressDraft()
                  setAttachMode('address')
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></svg>Gửi địa chỉ…
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !selectedPlace}
                title={selectedPlace ? undefined : 'Chọn địa điểm trên bản đồ trước'}
                onClick={() =>
                  selectedPlace &&
                  void onSendTarget('place', selectedPlace, 'Địa điểm trên bản đồ')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></svg>Gửi địa điểm{selectedPlace ? `: ${selectedPlace.name}` : ''}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !selectedListing}
                title={selectedListing ? undefined : 'Mở tin đăng trên bản đồ trước'}
                onClick={() =>
                  selectedListing &&
                  void onSendTarget('place', selectedListing, 'Tin đăng')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></svg>Gửi tin đăng{selectedListing ? `: ${selectedListing.name}` : ''}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !mapArea}
                onClick={() =>
                  mapArea && void onSendTarget('area', mapArea, 'Khu vực')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 4h16v16H4z" strokeDasharray="3 3" /></svg>Gửi khu vực{mapArea ? `: ${mapArea.name}` : ''}
              </button>
            </div>
          ) : null}

          <input
            ref={imageInputRef}
            className="map-messages__image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => onImageSelection(event.target.files)}
          />

          {imageFiles.length > 0 ? (
            <section className="map-messages__image-review" aria-label="Xem lại ảnh trước khi gửi">
              <div className="map-messages__image-review-head">
                <strong>{imageFiles.length} ảnh chờ gửi</strong>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    setImageFiles([])
                    if (imageInputRef.current) imageInputRef.current.value = ''
                  }}
                >
                  Bỏ ảnh
                </button>
              </div>
              <div className="map-messages__image-previews">
                {imageFiles.map((file) => (
                  <PendingImagePreview key={`${file.name}-${file.lastModified}`} file={file} />
                ))}
              </div>
              <label>
                Nội dung ảnh
                <ChoicePicker
                  value={imageContext}
                  disabled={sending}
                  onChange={(event) => setImageContext(Number(event.target.value) as MessageAttachmentContext)}
                >
                  {Object.entries(attachmentContextLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </ChoicePicker>
              </label>
              <small>Homeji xóa thông tin vị trí lưu trong tệp ảnh trước khi gửi. Chỉ thành viên cuộc trò chuyện có thể mở ảnh trên Homeji.</small>
            </section>
          ) : null}

          {attachMode === 'address' ? (
            <form
              className="map-messages__address-form"
              onSubmit={(e) => {
                e.preventDefault()
                void onSendAddress()
              }}
            >
              <div className="map-messages__address-field">
                <AddressAutocomplete
                  value={addressDraft}
                  onChange={(value) => {
                    setAddressDraft(value)
                    if (addressPlace && value.trim() !== addressPlace.address.trim()) {
                      setAddressPlace(null)
                    }
                  }}
                  onPlaceSelect={(place) => {
                    setAddressDraft(place.address)
                    setAddressPlace(place)
                    onError(null)
                  }}
                  placeholder="Gõ và chọn địa chỉ trên Google Maps…"
                  className="map-messages__address-input"
                />
                {addressPlace ? (
                  <p className="map-messages__address-hint is-ok">
                    Đã khớp bản đồ ({addressPlace.lat.toFixed(5)}, {addressPlace.lng.toFixed(5)})
                  </p>
                ) : (
                  <p className="map-messages__address-hint">
                    Phải chọn một gợi ý — đối phương mới mở đúng vị trí trên bản đồ.
                  </p>
                )}
              </div>
              <button type="submit" disabled={!addressPlace || sending}>
                Gửi địa chỉ
              </button>
              <button
                type="button"
                className="is-ghost"
                onClick={() => {
                  onResetAddressDraft()
                  setAttachMode('menu')
                }}
              >
                Huỷ
              </button>
            </form>
          ) : null}

          {blocked ? <p className="map-messages__block-notice" role="status">{active?.isBlockedByMe
            ? 'Bạn đã chặn người này. Bỏ chặn để tiếp tục nhắn tin và gọi thoại.'
            : 'Hiện không thể gửi tin nhắn hoặc gọi thoại trong cuộc trò chuyện này.'}</p> : null}
          <RentalMessageDraftNotice userId={currentUserId && currentUserId === currentProfileId ? currentUserId : undefined} conversation={blocked ? null : active} existingDraft={draft}
            onUse={body => { setDraft(body) }} />
          <form
            className="map-messages__composer"
            onSubmit={(e) => {
              e.preventDefault()
              void (imageFiles.length > 0 ? onSendImages() : onSend())
            }}
          >
            <button
              type="button"
              className={`map-messages__attach-btn map-motion-press${attachMode ? ' is-open' : ''}`}
              aria-label="Đính kèm vị trí hoặc địa chỉ"
              aria-expanded={attachMode != null}
              disabled={cannotSend || sending}
              onClick={() => setAttachMode((m) => (m ? null : 'menu'))}
            >
              <svg viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            {activeId && <ChatMediaPicker key={`${activeId}-${blocked}`} conversationId={activeId} disabled={cannotSend || sending || imageFiles.length > 0}
              onEmoji={emoji => {
                const input = composerRef.current
                const start = input?.selectionStart ?? draft.length, end = input?.selectionEnd ?? draft.length
                const next = draft.slice(0, start) + emoji + draft.slice(end)
                if (next.length > 2000) return
                setDraft(next)
                requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length) })
              }}
              onSent={message => { onSentMessage(message) }} onError={onError} />}
            {activeId && <VoiceMessageRecorder key={`voice-${activeId}-${voiceBusy}-${blocked}`} conversationId={activeId} disabled={cannotSend || sending || imageFiles.length > 0}
              onSent={message => { onSentMessage(message) }} onError={onError} />}
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={2000}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  if (!sending && (imageFiles.length > 0 || draft.trim())) event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={activeId ? `Nhắn cho ${peerName}…` : 'Nhập tin nhắn…'}
              aria-label="Nội dung tin nhắn"
              disabled={cannotSend}
            />
            <button
              type="submit"
              className="map-messages__send map-motion-press"
              aria-label="Gửi"
              title="Gửi"
              disabled={cannotSend || (imageFiles.length === 0 && !draft.trim()) || sending}
            >
              <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </div>

  )
}
