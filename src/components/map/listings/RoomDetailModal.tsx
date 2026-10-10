import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { RentalPostType } from '../../../api/types'
import {
  ApiRequestError,
  MediaType,
  UserRole,
  createViewingAppointment,
  getRentalPost,
  startRentalPostConversation,
  type RentalPost,
} from '../../../api'
import { useAuth } from '../../../contexts/AuthContext'
import { getErrorMessage } from '../../../lib/errors'
import { gallerySwipeDirection } from '../../../lib/gallerySwipe'
import { amenityLabel, rentalPostTypeLabel } from '../../../lib/labels'
import { ScheduleDateTimePicker } from '../../ScheduleDateTimePicker'
import houseUrl from '../../../assets/room-detail/house.svg'
import mapPinUrl from '../../../assets/room-detail/map-pin.svg'
import messageCircleUrl from '../../../assets/room-detail/message-circle.svg'
import circleAlertUrl from '../../../assets/room-detail/circle-alert.svg'
import imageOffUrl from '../../../assets/room-detail/image-off.svg'
import './RoomDetailModal.css'

type Props = {
  listingId: string | null
  saved?: boolean
  saveBusy?: boolean
  onClose: () => void
  onToggleSave?: (listingId: string) => void
  onOpenMessages?: (conversationId: string) => void
  onOpenAppointments?: () => void
}

type LoadState = 'loading' | 'ready' | 'error' | 'missing'

const rentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const areaFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

function formatRent(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return `${rentFormat.format(value)} đ`
}

function listingPhotos(post: RentalPost): string[] {
  const fromMedia = [...(post.media ?? [])]
    .filter((item) => item.mediaType !== MediaType.Video)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.path?.trim() ?? '')
    .filter((path) => path.length > 0)
  const unique = [...new Set(fromMedia)]
  if (unique.length > 0) return unique
  const thumb = post.thumbnailPath?.trim()
  return thumb ? [thumb] : []
}

function utilityText(post: RentalPost): string {
  const electricity = formatRent(post.electricityPrice)
  const water = formatRent(post.waterPrice)
  if (!electricity && !water) return 'Chưa cung cấp'
  return [
    electricity ? `Điện ${electricity}` : null,
    water ? `Nước ${water}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function RoomDetailModal({
  listingId,
  saved = false,
  saveBusy = false,
  onClose,
  onToggleSave,
  onOpenMessages,
  onOpenAppointments,
}: Props) {
  const { isAuthenticated, profile } = useAuth()
  const isRenter = profile?.role === UserRole.Renter
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const listingIdRef = useRef<string | null>(null)
  const onCloseRef = useRef(onClose)
  const requestSeq = useRef(0)

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    id: string
    attempt: number
    state: Exclude<LoadState, 'loading'>
    post: RentalPost | null
  } | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [notice, setNotice] = useState<{ id: string; message: string; tone: 'ok' | 'err' } | null>(null)
  const [scheduleListingId, setScheduleListingId] = useState<string | null>(null)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleNote, setScheduleNote] = useState('')

  const matched = result && result.id === listingId && result.attempt === attempt ? result : null
  const loadState: LoadState = matched?.state ?? 'loading'
  const post = matched?.state === 'ready' ? matched.post : null
  const isStudentShare = post?.type === RentalPostType.RoommateShare && post.ownerRole === UserRole.Renter
  const actionMessage = notice && notice.id === listingId ? notice.message : null
  const actionTone = notice?.tone ?? 'ok'
  const scheduleOpen = scheduleListingId != null && scheduleListingId === listingId

  useLayoutEffect(() => {
    listingIdRef.current = listingId
    onCloseRef.current = onClose
  }, [listingId, onClose])

  useEffect(() => {
    if (!listingId) return undefined
    const controller = new AbortController()
    const seq = ++requestSeq.current
    const id = listingId
    const currentAttempt = attempt

    void getRentalPost(id, { auth: isAuthenticated, signal: controller.signal })
      .then((next) => {
        if (seq !== requestSeq.current) return
        setResult({ id, attempt: currentAttempt, state: 'ready', post: next })
      })
      .catch((error: unknown) => {
        if (seq !== requestSeq.current) return
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 410)) {
          setResult({ id, attempt: currentAttempt, state: 'missing', post: null })
          return
        }
        setResult({ id, attempt: currentAttempt, state: 'error', post: null })
      })

    return () => controller.abort()
  }, [listingId, isAuthenticated, attempt])

  useEffect(() => {
    if (!listingId) return undefined
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = dialogRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root?.querySelector<HTMLElement>('[data-room-detail-close]')?.focus()

    const focusable = () =>
      [...(root?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])]

    const onKey = (event: KeyboardEvent) => {
      // The image viewer owns keyboard navigation while its native dialog is open.
      if (root?.querySelector('dialog[open]')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !root) return
      const nodes = focusable()
      if (nodes.length === 0) {
        event.preventDefault()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previousOverflow
      if (listingIdRef.current == null) opener?.focus()
    }
  }, [listingId])

  if (!listingId) return null

  const notify = (message: string, tone: 'ok' | 'err' = 'ok') => {
    if (!listingId) return
    setNotice({ id: listingId, message, tone })
  }

  const handleSave = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!onToggleSave || saveBusy) return
    onToggleSave(listingId)
  }

  const handleMessage = async () => {
    if (!post?.id || !isAuthenticated || !isRenter) {
      notify('Chỉ người thuê đã đăng nhập mới nhắn chủ nhà.', 'err')
      return
    }
    setActionBusy(true)
    try {
      const convo = await startRentalPostConversation(post.id)
      onOpenMessages?.(convo.id)
      notify('Đã mở hội thoại với chủ nhà.')
    } catch (error) {
      notify(getErrorMessage(error, 'Không mở được chat'), 'err')
    } finally {
      setActionBusy(false)
    }
  }

  const handleBookViewing = async () => {
    if (!post?.id || !scheduleAt) return
    if (!isAuthenticated || !isRenter) {
      notify('Chỉ người thuê đã đăng nhập mới đặt lịch xem.', 'err')
      return
    }
    setActionBusy(true)
    try {
      await createViewingAppointment(post.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        note: scheduleNote.trim() || undefined,
      })
      setScheduleListingId(null)
      setScheduleNote('')
      notify('Đã gửi yêu cầu xem phòng.')
      onOpenAppointments?.()
    } catch (error) {
      notify(getErrorMessage(error, 'Đặt lịch thất bại'), 'err')
    } finally {
      setActionBusy(false)
    }
  }

  const rentLabel = post ? formatRent(post.price) : null
  const depositLabel = post ? formatRent(post.deposit) : null
  const otherFee = post ? formatRent(post.internetPrice) : null
  const utilities = post ? utilityText(post) : 'Chưa cung cấp'
  const costsIncomplete = !rentLabel || !depositLabel || utilities === 'Chưa cung cấp' || !otherFee
  const description = post?.description?.trim() ?? ''
  const address = post?.address?.trim() ?? ''
  const amenities = (post?.amenities ?? []).map((code) => amenityLabel(code)).filter((label) => label.trim().length > 0)
  const facts = post
    ? [
        rentalPostTypeLabel[post.type] || null,
        post.area > 0 ? `${areaFormat.format(post.area)} m²` : null,
        post.highlightTag?.trim() || null,
        post.maxOccupants && post.maxOccupants > 0 ? `Tối đa ${post.maxOccupants} người` : null,
      ].filter((item): item is string => Boolean(item))
    : []
  const areaMissing = !post || !(post.area > 0)

  const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div className="room-detail__backdrop" onMouseDown={onBackdrop}>
      <div
        ref={dialogRef}
        className="room-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loadState === 'loading'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="room-detail__header">
          <div className="room-detail__heading">
            <img src={houseUrl} alt="" width={20} height={20} />
            <h2 id={titleId}>Chi tiết phòng</h2>
          </div>
          <div className="room-detail__header-actions">
            {loadState === 'ready' && onToggleSave ? (
              <button
                type="button"
                className={`room-detail__save${saved ? ' is-on' : ''}`}
                aria-pressed={saved}
                disabled={saveBusy}
                onClick={handleSave}
              >
                {saved ? '♥  Đã lưu' : '♡  Lưu tin'}
              </button>
            ) : null}
            <button
              type="button"
              className="room-detail__close"
              data-room-detail-close
              aria-label="Đóng"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        {loadState === 'loading' ? (
          <div className="room-detail__status" role="status">
            <div className="room-detail__skel room-detail__skel--photo" />
            <div className="room-detail__skel room-detail__skel--title" />
            <div className="room-detail__skel room-detail__skel--line" />
            <p>Đang tải thông tin phòng…</p>
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="room-detail__status" role="alert">
            <div className="room-detail__status-icon">
              <img src={circleAlertUrl} alt="" width={24} height={24} />
            </div>
            <h3>Không tải được chi tiết</h3>
            <p>Vui lòng thử lại. Bạn vẫn có thể đóng popup để tiếp tục tìm phòng.</p>
            <button type="button" className="room-detail__retry" onClick={() => setAttempt((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        ) : null}

        {loadState === 'missing' ? (
          <div className="room-detail__status" role="status">
            <div className="room-detail__status-icon">
              <img src={circleAlertUrl} alt="" width={24} height={24} />
            </div>
            <h3>Tin không còn</h3>
            <p>Tin đăng này không còn trên Homeji hoặc đã được gỡ. Bạn có thể đóng popup để tiếp tục tìm phòng.</p>
          </div>
        ) : null}

        {loadState === 'ready' && post ? (
          <>
            <div className="room-detail__body">
              <div className="room-detail__main">
                <PhotoGallery urls={listingPhotos(post)} />
                <div className="room-detail__summary">
                  <h3>{post.title?.trim() || 'Tin đăng'}</h3>
                  {isStudentShare ? <p className="room-detail__muted">
                    {post.ownerDisplayName || 'Người đăng'}{post.ownerSchool ? ` · ${post.ownerSchool}` : ''}
                    {post.availableSlots ? ` · Cần thêm ${post.availableSlots} người ghép` : ''}
                  </p> : null}
                  {address ? (
                    <p className="room-detail__address">
                      <img src={mapPinUrl} alt="" width={18} height={18} />
                      <span>{address}</span>
                    </p>
                  ) : (
                    <p className="room-detail__address">
                      <img src={mapPinUrl} alt="" width={18} height={18} />
                      <span>Chưa cung cấp</span>
                    </p>
                  )}
                  {facts.length > 0 ? (
                    <ul className="room-detail__facts">
                      {facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {description ? (
                  <section className="room-detail__section">
                    <h4>{isStudentShare ? 'Lời nhắn tìm người ở ghép' : 'Về căn phòng'}</h4>
                    <p>{description}</p>
                  </section>
                ) : null}
                <section className="room-detail__section">
                  <h4>Tiện ích trong tin đăng</h4>
                  {amenities.length > 0 ? (
                    <ul className="room-detail__facts">
                      {amenities.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="room-detail__muted">Các tiện ích khác: chưa cung cấp</p>
                  )}
                </section>
              </div>
              <aside className="room-detail__aside" aria-label="Giá thuê và liên hệ">
                <div className="room-detail__price">
                  <p className="room-detail__kicker">{isStudentShare ? 'Chi phí dự kiến/người/tháng' : 'Giá thuê phòng'}</p>
                  <p className="room-detail__amount">{rentLabel ?? 'Chưa cung cấp'}</p>
                  <p className="room-detail__muted">{isStudentShare ? 'Người đang ở đăng tìm thêm bạn ghép. Trao đổi để xác nhận cách chia các khoản phí.' : 'Giá thuê theo tin đăng'}</p>
                </div>
                <hr />
                <div className="room-detail__costs">
                  <h4>{isStudentShare ? 'Chi phí được người đăng cung cấp' : 'Chi phí thuê phòng'}</h4>
                  <CostRow label={isStudentShare ? 'Dự kiến mỗi người' : 'Tiền thuê'} value={rentLabel ?? 'Chưa cung cấp'} muted={!rentLabel} />
                  <CostRow label="Tiền cọc" value={depositLabel ?? 'Chưa cung cấp'} muted={!depositLabel} />
                  <CostRow label="Điện, nước" value={utilities} muted={utilities === 'Chưa cung cấp'} />
                  <CostRow label="Phí khác" value={otherFee ?? 'Chưa cung cấp'} muted={!otherFee} />
                  {costsIncomplete ? (
                    <p className="room-detail__muted">
                      Chưa có đủ thông tin để tính tổng chi phí. Hãy xác nhận các khoản phí với người đăng.
                    </p>
                  ) : null}
                </div>
                <hr />
                <div className="room-detail__contact">
                  <h4>
                    <img src={messageCircleUrl} alt="" width={20} height={20} />
                    Liên hệ người đăng
                  </h4>
                  <p>{isStudentShare ? 'Nhắn người đang ở để trao đổi lối sống, chỗ trống và cách chia chi phí.' : 'Bạn quan tâm căn phòng này? Nhắn tin để hỏi thêm hoặc đặt lịch xem phòng.'}</p>
                  {areaMissing ? (
                    <p className="room-detail__muted">
                      Diện tích và tình trạng phòng chưa được cung cấp. Bạn có thể hỏi thêm khi liên hệ.
                    </p>
                  ) : null}
                </div>
                <div className="room-detail__note">
                  <strong>Xem phòng trước khi quyết định</strong>
                  <p>{isStudentShare ? 'Thống nhất chi phí và quy tắc ở chung trước khi quyết định.' : 'Trao đổi trực tiếp để xác nhận thông tin và điều kiện thuê.'}</p>
                </div>
              </aside>
            </div>
            <footer className="room-detail__footer">
              <div className="room-detail__footer-copy">
                {scheduleOpen ? (
                  <div className="room-detail__schedule">
                    <ScheduleDateTimePicker
                      label="Thời gian xem"
                      value={scheduleAt}
                      onChange={setScheduleAt}
                    />
                    <label>
                      Ghi chú
                      <input
                        value={scheduleNote}
                        onChange={(event) => setScheduleNote(event.target.value)}
                        placeholder="Ví dụ: mình đến sau 18h"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!scheduleAt || actionBusy}
                      onClick={() => void handleBookViewing()}
                    >
                      Gửi yêu cầu
                    </button>
                  </div>
                ) : (
                  <>
                    <strong>Căn phòng bạn muốn tìm hiểu thêm</strong>
                    <p>Hỏi thông tin hoặc hẹn một buổi xem phòng.</p>
                  </>
                )}
                {actionMessage ? (
                  <p className={`room-detail__toast is-${actionTone}`} role="status">
                    {actionMessage}
                  </p>
                ) : null}
              </div>
              <div className="room-detail__footer-actions">
                <button
                  type="button"
                  className="room-detail__book"
                  disabled={actionBusy}
                  onClick={() => {
                    setScheduleAt('')
                    setScheduleNote('')
                    setScheduleListingId((current) => (current === listingId ? null : listingId))
                  }}
                >
                  Đặt lịch xem phòng
                </button>
                <button
                  type="button"
                  className="room-detail__message"
                  disabled={actionBusy}
                  onClick={() => void handleMessage()}
                >
                  Nhắn tin
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function CostRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <p className="room-detail__cost">
      <span>{label}</span>
      <span className={muted ? 'is-muted' : undefined}>{value}</span>
    </p>
  )
}

function PhotoGallery({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const viewerRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const openPhoto = (nextIndex: number) => {
    setIndex(nextIndex)
    setView({ scale: 1, x: 0, y: 0 })
    viewerRef.current?.showModal()
  }
  const [failed, setFailed] = useState<string[]>([])
  const visible = urls.filter((url) => !failed.includes(url))
  const safeIndex = visible.length === 0 ? 0 : Math.min(index, visible.length - 1)
  const current = visible[safeIndex]
  const thumbs = visible.filter((_, itemIndex) => itemIndex !== safeIndex).slice(0, 2)
  const movePhoto = (direction: number) => {
    setIndex((safeIndex + direction + visible.length) % visible.length)
    setView({ scale: 1, x: 0, y: 0 })
    viewportRef.current?.scrollTo(0, 0)
  }

  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2
    setView((previous) => {
      const scale = Math.max(1, Math.min(5, previous.scale * factor))
      const ratio = scale / previous.scale
      const limitX = rect.width * (scale - 1) / 2
      const limitY = rect.height * (scale - 1) / 2
      return {
        scale,
        x: Math.max(-limitX, Math.min(limitX, px - (px - previous.x) * ratio)),
        y: Math.max(-limitY, Math.min(limitY, py - (py - previous.y) * ratio)),
      }
    })
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1)
      zoomAt(Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003), event.clientX, event.clientY)
    }
    viewport.addEventListener('wheel', wheel, { passive: false })
    return () => viewport.removeEventListener('wheel', wheel)
  }, [current])

  if (!current) {
    return (
      <div className="room-detail__photo-fallback">
        <img src={imageOffUrl} alt="" width={24} height={24} />
        <p>Tin đăng chưa cung cấp ảnh. Thông tin và các thao tác liên hệ vẫn hiển thị.</p>
      </div>
    )
  }

  return (
    <div className="room-detail__gallery">
      <div className={`room-detail__photos${thumbs.length === 0 ? ' is-single' : ''}`}>
        <button type="button" className="room-detail__photo-main" aria-label="Mở ảnh lớn" onClick={() => openPhoto(safeIndex)}>
          <img
            src={current}
            alt=""
            onError={() => setFailed((prev) => (prev.includes(current) ? prev : [...prev, current]))}
          />
          <span>
            {safeIndex + 1} / {visible.length} ảnh
          </span>
        </button>
        {thumbs.length > 0 ? (
          <div className="room-detail__thumbs">
            {thumbs.map((url) => (
              <button
                key={url}
                type="button"
                aria-label={`Xem ảnh ${visible.indexOf(url) + 1}`}
                onClick={() => openPhoto(visible.indexOf(url))}
              >
                <img
                  src={url}
                  alt=""
                  onError={() => setFailed((prev) => (prev.includes(url) ? prev : [...prev, url]))}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <dialog
        ref={viewerRef}
        className="room-photo-viewer"
        aria-label="Xem ảnh phòng"
        onClick={(event) => {
          event.stopPropagation()
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            movePhoto(event.key === 'ArrowLeft' ? -1 : 1)
          }
        }}
      >
        <div className="room-photo-viewer__toolbar">
          <span aria-live="polite">Ảnh {safeIndex + 1} / {visible.length}</span>
          <button type="button" aria-label="Thu nhỏ ảnh" disabled={view.scale <= 1} onClick={() => zoomAt(1 / 1.3)}>−</button>
          <button type="button" aria-label="Đặt lại mức phóng to" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>🔍 {Math.round(view.scale * 100)}%</button>
          <button type="button" aria-label="Phóng to ảnh" disabled={view.scale >= 5} onClick={() => zoomAt(1.3)}>+</button>
          <button type="button" aria-label="Đóng ảnh lớn" onClick={() => viewerRef.current?.close()}>✕</button>
        </div>
        <div
          ref={viewportRef}
          className={`room-photo-viewer__viewport${view.scale > 1 ? ' is-zoomed' : ''}`}
          style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }}
          onDoubleClick={(event) => zoomAt(view.scale > 1 ? 1 / view.scale : 2, event.clientX, event.clientY)}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            if (view.scale <= 1) {
              swipeRef.current = { x: event.clientX, y: event.clientY }
              event.currentTarget.setPointerCapture(event.pointerId)
              return
            }
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag) return
            const dx = event.clientX - drag.x
            const dy = event.clientY - drag.y
            dragRef.current = { x: event.clientX, y: event.clientY }
            const rect = event.currentTarget.getBoundingClientRect()
            setView((previous) => ({
              ...previous,
              x: Math.max(-rect.width * (previous.scale - 1) / 2, Math.min(rect.width * (previous.scale - 1) / 2, previous.x + dx)),
              y: Math.max(-rect.height * (previous.scale - 1) / 2, Math.min(rect.height * (previous.scale - 1) / 2, previous.y + dy)),
            }))
          }}
          onPointerUp={event => {
            const start = swipeRef.current
            if (start && view.scale <= 1 && visible.length > 1) {
              const direction = gallerySwipeDirection(event.clientX - start.x, event.clientY - start.y)
              if (direction) movePhoto(direction)
            }
            dragRef.current = null; swipeRef.current = null
          }}
          onPointerCancel={() => { dragRef.current = null; swipeRef.current = null }}
          onLostPointerCapture={() => { dragRef.current = null; swipeRef.current = null }}
        >
          <img key={current} className="room-photo-viewer__image" src={current} alt={`Ảnh phòng ${safeIndex + 1}`} draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
        </div>
        <p className="room-photo-viewer__hint">Vuốt ngang hoặc dùng nút để đổi ảnh · Khi phóng to, kéo để di chuyển · Nhấp đúp để zoom</p>
        {visible.length > 1 ? (
          <div className="room-photo-viewer__navigation">
            <button type="button" onClick={() => movePhoto(-1)}>← Ảnh trước</button>
            <button type="button" onClick={() => movePhoto(1)}>Ảnh tiếp →</button>
          </div>
        ) : null}
      </dialog>
    </div>
  )
}
