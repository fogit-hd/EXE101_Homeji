import { PhotoGallery } from './RoomPhotoGallery'
import { ReportListingButton } from './ReportListingButton'
import { RoomDetailHeader, RoomEssentials, RoomOwnerProfile, RoomOwnerPhone } from './RoomDetailPresentation'
import { OwnerSocialContacts } from '../../profile/OwnerSocialContacts'
import { PhoneAction } from '../../ui/PhoneAction'
import { useMotionPresence } from '../../motion/useMotionPresence'
import { useChangedInputs } from '../../../hooks/useChangedInputs'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
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
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getErrorMessage, isProfileRequiredError } from '../../../lib/errors'
import { ProfileSetupNotice } from '../../auth/ProfileSetupNotice'
import { useLocation } from 'react-router-dom'
import { amenityLabel, rentalPostTypeLabel } from '../../../lib/labels'
import { ScheduleDateTimePicker } from '../../ScheduleDateTimePicker'
import { rentalPriceBasis, rentalPriceLabel } from '../../ai/rentalPriceBasis'
import { listingReference } from '../../../lib/listingReference'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import { RentalDetailAssistant } from '../../ai/RentalDetailAssistant'
import { useRentalAssistantOpener, useRentalAssistantSelection } from '../../../contexts/rental-assistant-context'
import { rentalDraftTarget, rentalMessageDraftStore } from '../../../lib/rentalMessageDraft'
import { getStoredSession } from '../../../api/client'
import { aiFeatureFlags } from '../../../lib/aiFeatureFlags'
import { isImportedRentalPost } from '../../../lib/sourcePublisherLinks'
import {
  CalculatorIcon,
  HouseIcon,
  ElectricBoltIcon,
  WaterDropIcon,
  MotorbikeIcon,
  LightbulbIcon,
  FloodFreeIcon,
  SecurityCameraIcon,
  MessageCircleIcon,
} from '../../icons/SvgIcons'
import mapPinUrl from '../../../assets/room-detail/map-pin.svg'
import messageCircleUrl from '../../../assets/room-detail/message-circle.svg'
import circleAlertUrl from '../../../assets/room-detail/circle-alert.svg'
import './RoomDetailModal.css'

type Props = {
  listingId: string | null
  saved?: boolean
  saveBusy?: boolean
  onClose: () => void
  onToggleSave?: (listingId: string) => void
  onOpenMessages?: (conversationId: string) => void
  onOpenAppointments?: () => void
  saveError?: string
}

type LoadState = 'loading' | 'ready' | 'error' | 'missing' | 'profile-required'

const rentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const areaFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

function formatRent(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return `${rentFormat.format(value)} đ`
}

function formatPrice(value: number | null | undefined): string {
  return formatRent(value) ?? '0 đ'
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
  saveError,
}: Props) {
  const { isAuthenticated, profile, needsProfileSetup, isLoading: authLoading } = useAuth()
  const { openAuthModal } = useAuthModal()
  const location = useLocation()
  const profileRequired = isAuthenticated && needsProfileSetup
  const isRenter = profile?.role === UserRole.Renter
  const { present, ...presence } = useMotionPresence(Boolean(listingId), 'fade')
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const listingIdRef = useRef<string | null>(null)
  const identityRef = useRef(profile?.id)
  const messageEpoch = useRef(0)
  const onCloseRef = useRef(onClose)
  const requestSeq = useRef(0)

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    id: string
    viewerId: string
    attempt: number
    state: Exclude<LoadState, 'loading'>
    post: RentalPost | null
    message?: string
  } | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [notice, setNotice] = useState<{ id: string; message: string; tone: 'ok' | 'err' } | null>(null)
  const [scheduleListingId, setScheduleListingId] = useState<string | null>(null)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleNote, setScheduleNote] = useState('')
  const [revealPhoneForPost, setRevealPhoneForPost] = useState<string | null>(null)
  const [reportAfterLoginFor, setReportAfterLoginFor] = useState<string | null>(null)
  const clearReportAfterLogin = useCallback(() => setReportAfterLoginFor(null), [])

  const viewerId = profile?.id ?? 'guest'
  const matched = result && result.viewerId === viewerId && (result.id === listingId || (!listingId && present)) && result.attempt === attempt ? result : null
  const loadState: LoadState = profileRequired ? 'profile-required' : matched?.state ?? 'loading'
  const post = matched?.state === 'ready' ? matched.post : null
  useRentalAssistantSelection(post && listingId ? { postId: post.id, title: post.title } : null)
  const openRentalAssistant = useRentalAssistantOpener()
  const isStudentShare = post?.type === RentalPostType.RoommateShare && post.ownerRole === UserRole.Renter
  const priceBasis = post ? rentalPriceBasis(post) : 'unknown'
  const actionMessage = notice && notice.id === listingId ? notice.message : null
  const actionTone = notice?.tone ?? 'ok'
  const scheduleOpen = scheduleListingId != null && scheduleListingId === listingId
  if (useChangedInputs([listingId, viewerId])) setActionBusy(false)
  if (useChangedInputs([listingId])) { setRevealPhoneForPost(null); setReportAfterLoginFor(null) }

  useLayoutEffect(() => {
    messageEpoch.current += 1
    return () => { messageEpoch.current += 1 }
  }, [listingId, viewerId])

  useLayoutEffect(() => {
    listingIdRef.current = listingId
    identityRef.current = profile?.id
    onCloseRef.current = onClose
  }, [listingId, onClose, profile?.id])

  useEffect(() => {
    if (!listingId || profileRequired || authLoading) return undefined
    const controller = new AbortController()
    const seq = ++requestSeq.current
    const id = listingId
    const currentAttempt = attempt

    void getRentalPost(id, { auth: isAuthenticated, signal: controller.signal })
      .then((next) => {
        if (seq !== requestSeq.current) return
        setResult({ id, viewerId, attempt: currentAttempt, state: 'ready', post: next })
      })
      .catch((error: unknown) => {
        if (seq !== requestSeq.current) return
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (isProfileRequiredError(error)) {
          setResult({ id, viewerId, attempt: currentAttempt, state: 'profile-required', post: null })
          return
        }
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 410)) {
          setResult({ id, viewerId, attempt: currentAttempt, state: 'missing', post: null })
          return
        }
        setResult({ id, viewerId, attempt: currentAttempt, state: 'error', post: null, message: getErrorMessage(error, 'Chưa tải được thông tin phòng. Vui lòng thử lại.') })
      })

    return () => controller.abort()
  }, [listingId, isAuthenticated, viewerId, attempt, profileRequired, authLoading])

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
      ) ?? [])].filter(node => node.getClientRects().length > 0)

    const onKey = (event: KeyboardEvent) => {
      // The assistant is portaled beside this modal and owns keys while focused.
      if (event.target instanceof Element && event.target.closest('[data-homeji-ai-panel="open"]')) return
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

  if (!present) return null

  const notify = (message: string, tone: 'ok' | 'err' = 'ok') => {
    if (!listingId) return
    setNotice({ id: listingId, message, tone })
  }

  const handleSave = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!listingId || !onToggleSave || saveBusy) return
    onToggleSave(listingId)
  }

  const handleShare = async () => {
    if (!post) return
    const title = post.title || 'Phòng trọ Homeji'
    const shareUrl = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} · ${rentLabel ?? ''} - Xem trên Homeji`,
          url: shareUrl,
        })
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          await navigator.clipboard?.writeText(shareUrl)
          notify('Đã sao chép liên kết phòng.', 'ok')
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      notify('Đã sao chép liên kết phòng.', 'ok')
    }
  }

  const handleMessage = async (questionDraft?: string) => {
    if (actionBusy) return
    if (!isAuthenticated) { openAuthModal({ intent: 'contact' }); return }
    if (!post?.id || !isRenter || !profile || post.ownerId === profile.id) {
      notify('Chỉ người thuê đã đăng nhập mới nhắn chủ nhà.', 'err')
      return
    }
    const source = { postId: post.id, ownerId: post.ownerId, userId: profile.id }
    const epoch = messageEpoch.current
    const isCurrent = () => messageEpoch.current === epoch && listingIdRef.current === source.postId
      && identityRef.current === source.userId && getStoredSession()?.userId === source.userId
    setActionBusy(true)
    try {
      const convo = await startRentalPostConversation(post.id)
      if (!isCurrent()) return
      const effectiveDraft = questionDraft ?? (post.title?.trim()
        ? `Chào bạn, mình quan tâm đến phòng "${post.title.trim()}" trên Homeji. Phòng này hiện còn trống không ạ?`
        : 'Chào bạn, mình quan tâm đến phòng này trên Homeji. Phòng này hiện còn trống không ạ?')
      if (effectiveDraft !== undefined) {
        const target = rentalDraftTarget(source.userId, convo)
        if (!target || target.postId !== source.postId || target.recipientId !== source.ownerId
          || !rentalMessageDraftStore.queue(target, effectiveDraft)) {
          notify('Chưa chuyển được bản nháp vào đúng hội thoại. Nội dung vẫn ở đây để bạn sửa và thử lại.', 'err')
          return
        }
      }
      onOpenMessages?.(convo.id)
      notify('Đã mở hội thoại với chủ nhà.')
    } catch (error) {
      if (isCurrent()) notify(getErrorMessage(error, 'Không mở được chat'), 'err')
    } finally {
      if (isCurrent()) setActionBusy(false)
    }
  }

  const handleBookViewing = async () => {
    if (!post?.id || !scheduleAt) return
    if (isAuthenticated && !isRenter) {
      notify('Tài khoản hiện tại chưa có vai trò Người thuê. Vào Hồ sơ → Lối sống & vai trò, chọn Người thuê rồi lưu để đặt lịch.', 'err')
      return
    }
    if (!isAuthenticated) {
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
      notify(getErrorMessage(error, 'Chưa đặt được lịch. Vui lòng thử lại.'), 'err')
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
        isApartmentListing(post.title) ? 'Căn hộ' : rentalPostTypeLabel[post.type] || null,
        post.highlightTag?.trim() || null,
        !isImportedRentalPost(post) && post.maxOccupants && post.maxOccupants > 0 ? `Tối đa ${post.maxOccupants} người` : null,
      ].filter((item): item is string => Boolean(item))
    : []
  const areaMissing = !post || !(post.area > 0)
  const phone = post?.ownerPhone?.trim().replace(/[\s().-]/g, '') ?? ''
  const phoneHref = /^\+?\d{8,15}$/.test(phone) ? `tel:${phone}` : null
  const hasOwnerPhone = Boolean(post?.hasOwnerPhone || phoneHref)

  const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div {...presence} className="room-detail__backdrop" onMouseDown={onBackdrop}>
      <div
        ref={dialogRef}
        className="room-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loadState === 'loading'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <RoomDetailHeader titleId={titleId} title={post && isApartmentListing(post.title) ? 'Chi tiết căn hộ' : 'Chi tiết phòng trọ'} onClose={onClose} actions={<>
            {loadState === 'ready' && post ? (
              <button
                type="button"
                className="room-detail__share"
                aria-label="Chia sẻ phòng"
                onClick={() => void handleShare()}
              >
                <ShareIcon />
                <span>Chia sẻ</span>
              </button>
            ) : null}
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
          </>} />

        {loadState === 'loading' ? (
          <div className="room-detail__status" role="status">
            <div className="room-detail__skel room-detail__skel--photo" />
            <div className="room-detail__skel room-detail__skel--title" />
            <div className="room-detail__skel room-detail__skel--line" />
            <p>Đang tải thông tin phòng…</p>
          </div>
        ) : null}

        {loadState === 'profile-required' ? <ProfileSetupNotice action="xem thông tin phòng" onNavigate={onClose} returnTo={(() => {
          const params = new URLSearchParams(location.search)
          if (listingId) params.set('post', listingId)
          return `${location.pathname}?${params}${location.hash}`
        })()} /> : null}

        {loadState === 'error' ? (
          <div className="room-detail__status" role="alert">
            <div className="room-detail__status-icon">
              <img src={circleAlertUrl} alt="" width={24} height={24} />
            </div>
            <h3>Không tải được chi tiết</h3>
            <p>{matched?.message ?? 'Chưa tải được thông tin phòng. Vui lòng thử lại.'}</p>
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
              <div className="room-detail__main" role="region" aria-label="Thông tin chi tiết phòng" tabIndex={0}>
                <div className="room-detail__mobile-facts"><RoomEssentials rentLabel={rentalPriceLabel(priceBasis)} rent={rentLabel ?? 'Trao đổi'} area={post.area > 0 ? `${areaFormat.format(post.area)} m²` : 'Chưa cung cấp'} deposit={depositLabel ?? 'Chưa cung cấp'} /></div>
                <PhotoGallery urls={listingPhotos(post)} />
                <div className="room-detail__summary">
                  <p className="room-detail__eyebrow">{isStudentShare ? 'TÌM BẠN Ở GHÉP' : isApartmentListing(post.title) ? 'CĂN HỘ CHO THUÊ' : 'PHÒNG TRỌ CHO THUÊ'}</p>
                  <h3>{post.title?.trim() || 'Tin đăng'}</h3>
                  {listingReference(post.id) ? <p className="room-detail__muted">Mã tin: {listingReference(post.id)}</p> : null}
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
                <section className="room-detail__costs" data-glass-exclude>
                  <h4>Chi phí thuê & tiền cọc</h4>
                  <CostRow label={priceBasis === 'unknown' ? 'Tiền thuê theo tin' : isStudentShare ? 'Dự kiến mỗi người' : 'Tiền thuê'} value={rentLabel ?? 'Chưa cung cấp'} muted={!rentLabel} />
                  <CostRow label="Tiền cọc" value={depositLabel ?? 'Chưa cung cấp'} muted={!depositLabel} />
                  <CostRow label="Điện, nước" value={utilities} muted={utilities === 'Chưa cung cấp'} />
                  <CostRow label="Phí khác" value={otherFee ?? 'Chưa cung cấp'} muted={!otherFee} />
                  {costsIncomplete ? (
                    <p className="room-detail__muted">
                      Chưa có đủ thông tin để tính tổng chi phí. Hãy xác nhận các khoản phí với người đăng.
                    </p>
                  ) : null}
                </section>

                <RoomCostCalculatorWidget
                  rent={post.price}
                  isStudentShare={isStudentShare}
                  electricityPriceHint={post.electricityPrice}
                  waterPriceHint={post.waterPrice}
                  internetPriceHint={post.internetPrice}
                  maxOccupantsHint={post.maxOccupants}
                  availableSlotsHint={post.availableSlots}
                />

                {description ? (
                  <section className="room-detail__section" data-glass-exclude>
                    <h4>{isStudentShare ? 'Lời nhắn tìm người ở ghép' : 'Mô tả căn phòng'}</h4>
                    <p>{description}</p>
                  </section>
                ) : null}
                <section className="room-detail__section" data-glass-exclude>
                  <h4>Tiện ích trong phòng</h4>
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
                <div className="room-detail__environment-section" data-glass-exclude>
                  <h4 className="room-detail__environment-title">Thông tin an ninh & môi trường khu vực</h4>
                  <div className="room-detail__environment-grid">
                    <div className="room-detail__env-item">
                      <span className="room-detail__env-icon" aria-hidden="true"><FloodFreeIcon size={16} /></span>
                      <div className="room-detail__env-text">
                        <strong>Tuyến đường không ngập</strong>
                        <small>Khu vực cao ráo, lưu thông thuận tiện mùa mưa lớn</small>
                      </div>
                    </div>
                    <div className="room-detail__env-item">
                      <span className="room-detail__env-icon" aria-hidden="true"><SecurityCameraIcon size={16} /></span>
                      <div className="room-detail__env-text">
                        <strong>An ninh camera 24/7</strong>
                        <small>Khu nhà trọ có camera giám sát và khóa cổng an toàn</small>
                      </div>
                    </div>
                  </div>
                </div>
                {aiFeatureFlags.decisionTools ? <RentalDetailAssistant key={`${profile?.id ?? 'guest'}:${post.id}`} post={post} showFacts={false}
                  canMessage={Boolean(isAuthenticated && isRenter && profile?.id !== post.ownerId && onOpenMessages && !actionBusy)}
                  onPrepareMessage={draft => { void handleMessage(draft) }} /> : null}
                {aiFeatureFlags.decisionTools && openRentalAssistant ? <button type="button" className="btn btn-secondary btn-sm"
                  onClick={openRentalAssistant}>Hỏi trợ lý về phòng đang xem</button> : null}
              </div>
              <aside className="room-detail__aside" aria-label="Giá thuê và liên hệ" tabIndex={0}>
                <div className="room-detail__price">
                  <p className="room-detail__kicker">{rentalPriceLabel(priceBasis)}</p>
                  <p className="room-detail__amount">{rentLabel ?? 'Chưa cung cấp'}</p>
                  <p className="room-detail__muted">{priceBasis === 'unknown' ? 'Hỏi người đăng giá theo người hay cả phòng trước khi so chi phí.' : isStudentShare ? 'Trao đổi để xác nhận cách chia các khoản phí.' : 'Giá thuê theo tin đăng'}</p>
                </div>
                <RoomEssentials rentLabel={rentalPriceLabel(priceBasis)} area={post.area > 0 ? `${areaFormat.format(post.area)} m²` : 'Chưa cung cấp'} deposit={depositLabel ?? 'Chưa cung cấp'} />
                <hr />
                <div className="room-detail__contact" data-glass-exclude>
                  <OwnerProfile key={post.id} post={post} phone={phoneHref ? phone : ''} hasPhone={hasOwnerPhone} isStudentShare={isStudentShare}
                    revealRequested={revealPhoneForPost === post.id} onAuthenticatedContact={() => setRevealPhoneForPost(post.id)} />
                  {areaMissing ? <p className="room-detail__muted">Hãy hỏi thêm diện tích và tình trạng phòng khi liên hệ.</p> : null}
                  {(!profile || post.ownerId !== profile.id) && (
                    <div className="room-detail__greeting-chips" role="group" aria-label="Mẫu tin nhắn nhanh">
                      {[
                        'Phòng này hiện còn trống không ạ?',
                        'Mình muốn hẹn lịch qua xem phòng được không?',
                        'Chi phí điện nước và dịch vụ tính thế nào ạ?',
                      ].map((template) => (
                        <button
                          key={template}
                          type="button"
                          className="room-detail__greeting-chip"
                          disabled={actionBusy}
                          onClick={() => void handleMessage(`Chào bạn, ${template.charAt(0).toLowerCase() + template.slice(1)}`)}
                        >
                          <MessageCircleIcon size={13} />
                          <span>{template}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="room-detail__note">
                  <strong>Xem phòng trước khi quyết định</strong>
                  <p>{isStudentShare ? 'Thống nhất chi phí và quy tắc ở chung trước khi quyết định.' : 'Trao đổi trực tiếp để xác nhận thông tin và điều kiện thuê.'}</p>
                </div>
                <ReportListingButton key={post.id} postId={post.id} ownerId={post.ownerId}
                  openRequested={reportAfterLoginFor === post.id} onAuthRequired={() => setReportAfterLoginFor(post.id)}
                  onOpenRequestHandled={clearReportAfterLogin} />
              </aside>
            </div>
            <footer className="room-detail__footer" data-scheduling={scheduleOpen || undefined}>
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
                    <strong className="room-detail__footer-price">{rentLabel ?? 'Giá cần trao đổi'}{rentLabel ? <small>{priceBasis === 'unknown' ? ' · cần hỏi đơn vị' : priceBasis === 'person' ? ' / người/tháng' : ' / tháng'}</small> : null}</strong>
                    <p>{post.ownerDisplayName?.trim() || 'Liên hệ người đăng phòng'}</p>
                  </>
                )}
                {saveError ? <p className="room-detail__toast is-err" role="alert">{saveError}</p> : null}
                {actionMessage ? (
                  <p className={`room-detail__toast is-${actionTone}`} role="status">
                    {actionMessage}
                  </p>
                ) : null}
              </div>
              <div className="room-detail__footer-actions">
                <button type="button" className="room-detail__message" disabled={actionBusy} onClick={() => void handleMessage()}>
                  <img src={messageCircleUrl} alt="" width={19} height={19} />{actionBusy ? 'Đang xử lý…' : 'Nhắn tin ngay'}
                </button>
                {hasOwnerPhone ? <PhoneAction className="room-detail__call" phone={phone} hasPhone={hasOwnerPhone} onAuthenticated={() => setRevealPhoneForPost(post.id)}
                  guestLabel={<>{phoneIcon}Gọi điện</>} guestAriaLabel="Gọi điện, đăng nhập để xem số điện thoại">
                  {phoneIcon}Gọi điện
                </PhoneAction> : null}
                {hasOwnerPhone && phone ? (
                  isAuthenticated ? (
                    <a
                      href={`https://zalo.me/${phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="room-detail__zalo"
                      aria-label="Chat Zalo với người đăng"
                    >
                      <span className="room-detail__zalo-icon" aria-hidden="true">Z</span>
                      Zalo
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="room-detail__zalo"
                      aria-label="Chat Zalo, đăng nhập để liên hệ"
                      onClick={() => openAuthModal({ intent: 'contact', onSuccess: () => setRevealPhoneForPost(post.id) })}
                    >
                      <span className="room-detail__zalo-icon" aria-hidden="true">Z</span>
                      Zalo
                    </button>
                  )
                ) : null}
                <button
                  type="button"
                  className="room-detail__book"
                  data-glass-exclude
                  disabled={actionBusy}
                  aria-expanded={scheduleOpen}
                  onClick={() => {
                    setScheduleAt('')
                    setScheduleNote('')
                    setScheduleListingId((current) => (current === listingId ? null : listingId))
                  }}
                >
                  {scheduleOpen ? 'Hủy đặt lịch' : 'Đặt lịch xem phòng'}
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

const phoneIcon = <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 3 3 5-2 2c1.5 3 3 4.5 6 6l2-2 5 3c-1 5-4 5-8 3C7 17 3 13 3 7c0-3 2-4 4-4Z" /></svg>

function OwnerProfile({ post, phone, hasPhone, isStudentShare, revealRequested, onAuthenticatedContact }: { post: RentalPost; phone: string; hasPhone: boolean; isStudentShare: boolean; revealRequested: boolean; onAuthenticatedContact: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const phoneId = useId()
  const phoneVisible = isAuthenticated && (revealed || revealRequested)
  const name = post.ownerDisplayName?.trim() || 'Chưa cập nhật'
  const digits = phone.replace(/\D/g, '')
  const maskedPhone = digits ? `${phone.startsWith('+') ? '+' : ''}${digits.slice(0, 3)}${'•'.repeat(Math.max(0, digits.length - 3))}` : '••• ••• ••••'

  return (
    <RoomOwnerProfile heading={isStudentShare ? 'Hồ sơ người đăng' : 'Hồ sơ chủ trọ'} name={name} avatarUrl={post.ownerAvatarPath} verified={post.isOwnerVerified}>
      <OwnerSocialContacts key={post.ownerId} userId={post.ownerId} />
      <RoomOwnerPhone id={phoneId} revealed={phoneVisible}
        value={!hasPhone ? 'Chưa cập nhật' : phoneVisible && phone
              ? <a href={`tel:${phone}`}>{phone}</a>
              : <span aria-label={isAuthenticated ? `Số điện thoại bắt đầu bằng ${digits.slice(0, 3)}, các số còn lại đang ẩn` : 'Số điện thoại cần đăng nhập để xem'}>{isAuthenticated ? maskedPhone : 'Đăng nhập để xem số'}</span>}
        revealLabel={phoneVisible ? 'Ẩn số điện thoại' : isAuthenticated ? 'Hiện số điện thoại' : 'Đăng nhập để xem số điện thoại'}
        onReveal={hasPhone ? () => {
            if (!isAuthenticated) { openAuthModal({ intent: 'contact', onSuccess: () => { setRevealed(true); onAuthenticatedContact() } }); return }
            setRevealed(value => !value)
          } : undefined}
        hint={hasPhone ? phoneVisible ? 'Nhấn số điện thoại để gọi người đăng' : isAuthenticated ? 'Xem số để liên hệ trực tiếp' : 'Đăng nhập để xem số và liên hệ' : 'Liên hệ qua tin nhắn trên Homeji.'} />
    </RoomOwnerProfile>
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

function RoomCostCalculatorWidget({
  rent,
  isStudentShare,
  electricityPriceHint,
  waterPriceHint,
  internetPriceHint,
  maxOccupantsHint,
  availableSlotsHint,
}: {
  rent: number
  isStudentShare: boolean
  electricityPriceHint?: number
  waterPriceHint?: number
  internetPriceHint?: number
  maxOccupantsHint?: number
  availableSlotsHint?: number
}) {
  const initialOccupants = isStudentShare ? Math.max(1, availableSlotsHint || 2) : 1
  const maxAllowed = Math.max(initialOccupants, maxOccupantsHint && maxOccupantsHint > 0 ? maxOccupantsHint : 6)
  const [occupants, setOccupants] = useState(initialOccupants)
  const [kwhPerPerson, setKwhPerPerson] = useState(80)
  const [electricityUnitPrice, setElectricityUnitPrice] = useState(() => (electricityPriceHint && electricityPriceHint > 0 ? electricityPriceHint : 3500))
  const [waterPerPerson, setWaterPerPerson] = useState(() => (waterPriceHint && waterPriceHint > 0 ? waterPriceHint : 80000))
  const [serviceFee, setServiceFee] = useState(() => (internetPriceHint && internetPriceHint > 0 ? internetPriceHint + 50000 : 120000))
  const [isOpen, setIsOpen] = useState(false)

  const rentAmount = Number.isFinite(rent) && rent > 0 ? rent : 0
  const electricityTotal = kwhPerPerson * occupants * electricityUnitPrice
  const waterTotal = waterPerPerson * occupants
  const totalMonthly = rentAmount + electricityTotal + waterTotal + serviceFee
  const perPersonMonthly = Math.round(totalMonthly / occupants)

  return (
    <div className="room-cost-calculator" data-glass-exclude>
      <div className="room-cost-calculator__header">
        <div className="room-cost-calculator__title-group">
          <span className="room-cost-calculator__icon" aria-hidden="true"><CalculatorIcon size={18} /></span>
          <div>
            <h5>Dự toán chi phí trọn gói</h5>
            <p>Tiền phòng + điện, nước + xe máy & wifi</p>
          </div>
        </div>
        <button
          type="button"
          className="room-cost-calculator__toggle-btn"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Thu gọn' : 'Tùy chỉnh'}
        </button>
      </div>

      <div className="room-cost-calculator__summary">
        <div className="room-cost-calculator__stat">
          <span>Tổng dự kiến cả phòng</span>
          <strong>{formatPrice(totalMonthly)} <small>/ tháng</small></strong>
        </div>
        {occupants > 1 && (
          <div className="room-cost-calculator__stat is-highlight">
            <span>Mỗi người ({occupants} người)</span>
            <strong>{formatPrice(perPersonMonthly)} <small>/ tháng</small></strong>
          </div>
        )}
      </div>

      <div className="room-cost-calculator__breakdown-chips">
        <span><HouseIcon size={13} /> Phòng: {formatPrice(rentAmount)}</span>
        <span><ElectricBoltIcon size={13} /> Điện (~{kwhPerPerson * occupants} kWh): {formatPrice(electricityTotal)}</span>
        <span><WaterDropIcon size={13} /> Nước: {formatPrice(waterTotal)}</span>
        <span><MotorbikeIcon size={13} /> Dịch vụ & xe: {formatPrice(serviceFee)}</span>
      </div>

      {isOpen && (
        <div className="room-cost-calculator__controls">
          <div className="room-cost-calculator__field">
            <label>Số người ở:</label>
            <div className="room-cost-stepper">
              <button
                type="button"
                disabled={occupants <= 1}
                onClick={() => setOccupants(Math.max(1, occupants - 1))}
              >
                -
              </button>
              <span>{occupants} người</span>
              <button
                type="button"
                disabled={occupants >= maxAllowed}
                onClick={() => setOccupants(Math.min(maxAllowed, occupants + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="room-cost-calculator__field">
            <label>Đơn giá điện ({formatPrice(electricityUnitPrice)}/kWh):</label>
            <select
              value={electricityUnitPrice}
              onChange={(e) => setElectricityUnitPrice(Number(e.target.value))}
            >
              <option value="3000">3.000đ / kWh (Giá nhà nước/hộ gia đình)</option>
              <option value="3500">3.500đ / kWh (Mức phổ biến phòng trọ)</option>
              <option value="4000">4.000đ / kWh (Căn hộ dịch vụ/tiêu chuẩn cao)</option>
              {electricityPriceHint && ![3000, 3500, 4000].includes(electricityPriceHint) ? (
                <option value={electricityPriceHint}>{formatPrice(electricityPriceHint)}/kWh (Theo tin đăng)</option>
              ) : null}
            </select>
          </div>

          <div className="room-cost-calculator__field">
            <label>Lượng điện ước lượng / người (~{kwhPerPerson} kWh):</label>
            <input
              type="range"
              min="30"
              max="200"
              step="10"
              value={kwhPerPerson}
              onChange={(e) => setKwhPerPerson(Number(e.target.value))}
            />
          </div>

          <div className="room-cost-calculator__field">
            <label>Nước sinh hoạt / người:</label>
            <select
              value={waterPerPerson}
              onChange={(e) => setWaterPerPerson(Number(e.target.value))}
            >
              <option value="50000">50.000đ (Dùng ít)</option>
              <option value="80000">80.000đ (Tiêu chuẩn)</option>
              <option value="120000">120.000đ (Dùng nhiều)</option>
              {waterPriceHint && ![50000, 80000, 120000].includes(waterPriceHint) ? (
                <option value={waterPriceHint}>{formatPrice(waterPriceHint)} / người (Theo tin đăng)</option>
              ) : null}
            </select>
          </div>

          <div className="room-cost-calculator__field">
            <label>Phí gửi xe & rác, wifi:</label>
            <select
              value={serviceFee}
              onChange={(e) => setServiceFee(Number(e.target.value))}
            >
              <option value="0">Miễn phí / Đã gồm trong tiền phòng</option>
              <option value="100000">100.000đ (1 xe + wifi cơ bản)</option>
              <option value="150000">150.000đ (2 xe + wifi & rác)</option>
              <option value="250000">250.000đ (Đầy đủ dịch vụ)</option>
              {internetPriceHint && ![0, 100000, 150000, 250000].includes(internetPriceHint) ? (
                <option value={internetPriceHint}>{formatPrice(internetPriceHint)} (Internet theo tin đăng)</option>
              ) : null}
            </select>
          </div>
          <small className="room-cost-calculator__hint">
            <LightbulbIcon size={14} />
            <span>Mức tính toán dựa trên mức sinh hoạt phổ biến của sinh viên & người đi làm tại TP.HCM. Hãy xác nhận biểu phí chính thức với người đăng.</span>
          </small>
        </div>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
