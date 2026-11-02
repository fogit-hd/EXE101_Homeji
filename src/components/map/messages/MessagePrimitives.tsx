import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import {
  deleteConversationAttachment,
  downloadConversationAttachment,
  MessageAttachmentStatus,
  type PostMessageAttachment,
} from '../../../api'
import { chatLocationKindLabel, type ChatLocationPayload } from '../../../lib/chatLocation'
import { getErrorMessage } from '../../../lib/errors'
import { staticMapUrl } from '../../../lib/mapStaticMedia'
import { attachmentContextLabel, avatarColor, initialsOf, directionsUrl, type ContextItem } from './MessageFormatting'

export function SecureMessageAttachment({
  attachment,
  conversationId,
  messageId,
  mine,
  onDeleted,
  onError,
}: {
  attachment: PostMessageAttachment
  conversationId: string
  messageId: string
  mine: boolean
  onDeleted: () => void
  onError: (message: string) => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const attachmentRef = useRef<HTMLElement>(null)
  const nearViewport = useInView(attachmentRef, { once: true, margin: '300px' })

  useEffect(() => {
    if (!nearViewport || attachment.status !== MessageAttachmentStatus.Ready) return
    let cancelled = false
    let objectUrl: string | null = null
    void downloadConversationAttachment(attachment.contentPath)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.contentPath, attachment.status, nearViewport])

  if (attachment.status === MessageAttachmentStatus.Deleted) {
    return <span className="map-messages__image-deleted">Tệp đã được người gửi xóa</span>
  }

  return (
    <figure ref={attachmentRef} className="map-messages__image">
      {src && attachment.mimeType === 'audio/wav' ? <audio className="chat-voice-message" controls preload="metadata" src={src} aria-label="Tin nhắn thoại" /> : src ? (
        <button type="button" onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}>
          <img src={src} alt={attachmentContextLabel[attachment.context] ?? 'Ảnh trong tin nhắn'} />
        </button>
      ) : (
        <span className="map-messages__image-loading">
          {loadFailed ? 'Không tải được tệp' : 'Đang tải…'}
        </span>
      )}
      <figcaption>
        {attachment.mimeType === 'audio/wav' ? '🎙 Tin nhắn thoại' : attachmentContextLabel[attachment.context] ?? 'Ảnh khác'}
        {mine ? (
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              try {
                await deleteConversationAttachment(
                  conversationId,
                  messageId,
                  attachment.id,
                )
                onDeleted()
              } catch (error) {
                onError(getErrorMessage(error, 'Không xóa được tệp'))
              } finally {
                setDeleting(false)
              }
            }}
          >
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </button>
        ) : null}
      </figcaption>
    </figure>
  )
}

export function PendingImagePreview({ file }: { file: File }) {
  const src = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => {
    return () => URL.revokeObjectURL(src)
  }, [src])
  return <img src={src} alt={`Ảnh chờ gửi: ${file.name}`} />
}
export function MessageSearchHighlight({ text, query }: { text: string; query: string }) {
  const normalized = query.trim()
  if (!normalized) return <>{text}</>
  const escaped = normalized.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')
  let parts: string[]
  try {
    parts = text.split(new RegExp('(' + escaped + ')', 'gi'))
  } catch {
    parts = [text]
  }
  return <>{parts.map((part, index) => index % 2 === 1 ? <mark key={index} className="map-messages__mark">{part}</mark> : part)}</>
}

export function Avatar({ name, seed, small = false, subdued = false }: { name: string; seed: string; small?: boolean; subdued?: boolean }) {
  return (
    <span className={`map-messages__avatar${small ? ' is-small' : ''}`} style={{ background: subdued ? undefined : avatarColor(seed) }} aria-hidden>
      {initialsOf(name)}
    </span>
  )
}
export function LocationBubble({
  payload,
  onOpen,
  query,
  conversationId = null,
}: {
  payload: ChatLocationPayload
  onOpen?: (loc: {
    lat: number
    lng: number
    title?: string
    address?: string
    kind?: ChatLocationPayload['kind']
    conversationId?: string
  }) => void
  query: string
  conversationId?: string | null
}) {
  const hasCoords = payload.lat != null && payload.lng != null
  const thumb =
    hasCoords
      ? staticMapUrl(
          { lat: payload.lat!, lng: payload.lng! },
          { width: 360, height: 140, zoom: 15 },
        )
      : null
  return (
    <div className="map-messages__loc">
      {thumb ? (
        <img
          className="map-messages__loc-map"
          src={thumb}
          alt=""
          loading="lazy"
        />
      ) : hasCoords ? (
        <span className="map-messages__loc-map is-fallback" aria-hidden><i /></span>
      ) : null}
      <span className="map-messages__loc-kind">{chatLocationKindLabel(payload.kind)}</span>
      <strong className="map-messages__loc-title">{<MessageSearchHighlight text={payload.title} query={query} />}</strong>
      {payload.address ? (
        <p className="map-messages__loc-address">{<MessageSearchHighlight text={payload.address} query={query} />}</p>
      ) : null}
      {hasCoords ? (
        <p className="map-messages__loc-coords">
          {payload.lat!.toFixed(5)}, {payload.lng!.toFixed(5)}
        </p>
      ) : null}
      {hasCoords ? (
        <div className="map-messages__loc-actions">
          <a className="map-messages__loc-btn liquid-action" href={directionsUrl(payload.lat!, payload.lng!)} target="_blank" rel="noopener noreferrer">
            Chỉ đường
          </a>
      {onOpen ? (
        <button
          type="button"
          className="map-messages__loc-btn is-ghost map-motion-press"
          onClick={() =>
            onOpen({
              lat: payload.lat!,
              lng: payload.lng!,
              title: payload.title,
              address: payload.address,
              kind: payload.kind,
              conversationId: conversationId || undefined,
            })
          }
        >
          Mở trên bản đồ
        </button>
      ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ContextCard({ item, onPicked }: { item: ContextItem; onPicked?: () => void }) {
  const inner = (
    <>
      <span className="map-messages__ctx-thumb">
        {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : <svg viewBox="0 0 24 24" aria-hidden><path d="M3 10.5 12 4l9 6.5V20H3z" /></svg>}
      </span>
      <span className="map-messages__ctx-copy">
        <strong>{item.title}</strong>
        <small>
          {item.detail ? <b>{item.detail}</b> : null}
          <span>{item.kind}</span>
        </small>
      </span>
      <span className="map-messages__ctx-go" aria-hidden>›</span>
    </>
  )
  if (item.onOpen) {
    return <button type="button" className="map-messages__ctx-card" onClick={() => { item.onOpen?.(); onPicked?.() }}>{inner}</button>
  }
  const external = item.href?.startsWith('http')
  return (
    <a className="map-messages__ctx-card" href={item.href} onClick={onPicked}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
  )
}
