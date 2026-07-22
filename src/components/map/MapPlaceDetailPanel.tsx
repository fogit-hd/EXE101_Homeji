import { useEffect, useMemo, useRef, useState, type ReactNode, type WheelEvent } from 'react'
import {
  createViewingAppointment,
  getRentalPostReviews,
  markRentalPostRented,
  startRentalPostConversation,
  upsertMyRentalReview,
  UserRole,
  RentalPostStatus,
  RentalPostType,
  RoomTransferKind,
  type RentalPost,
  type RentalReviewCollection,
} from '../../api'
import { getStoredSession } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice, rentalPostTypeLabel, amenityLabel } from '../../lib/labels'
import { maneuverGlyph, type MapRouteStep } from '../../lib/mapRoutes'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { type MapPlaceDetails } from '../../lib/mapPlace'
import { streetViewStaticUrl } from '../../lib/mapStaticMedia'
import { ScheduleDateTimePicker } from '../ScheduleDateTimePicker'
import { ContentSkeleton } from '../ContentSkeleton'
import './MapMotion.css'
import './MapPlaceDetailPanel.css'

type DetailTab = string

type MapPlaceDetailPanelProps = {
  open: boolean
  onClose: () => void
  place?: MapPlaceDetails | null
  placeLoading?: boolean
  listing?: RentalPost | null
  listingSummary?: {
    id: string
    title: string
    price: number
    area: number
    address: string
    type: number
    thumbnailPath: string | null
    latitude: number
    longitude: number
    isOwnerPremium?: boolean
    ownerBadge?: string | null
    highlightTag?: string | null
  } | null
  listingLoading?: boolean
  userLocation?: { lat: number; lng: number } | null
  onNearby?: (loc: { lat: number; lng: number }) => void
  /** Draw driving route on Homeji map (Routes API). */
  onDirections?: (destination: { lat: number; lng: number }) => void
  onClearNavigation?: () => void
  routeSummary?: {
    distanceText: string
    durationText: string
    steps?: MapRouteStep[]
    trafficAware?: boolean
    mode?: 'preview' | 'navigate'
  } | null
  routeError?: string | null
  onSaveListing?: () => void
  listingSaved?: boolean
  saveBusy?: boolean
  onOpenMessages?: (conversationId?: string) => void
  onOpenAppointments?: () => void
}

function Stars({
  rating,
  interactive = false,
  onChange,
  label = 'Đánh giá',
}: {
  rating: number
  interactive?: boolean
  onChange?: (value: number) => void
  label?: string
}) {
  const full = Math.round(rating)
  if (!interactive) {
    return (
      <span className="map-detail__stars" aria-hidden>
        {'★★★★★'.slice(0, Math.min(5, Math.max(0, full)))}
        <span className="map-detail__stars-empty">
          {'★★★★★'.slice(0, Math.max(0, 5 - full))}
        </span>
      </span>
    )
  }

  return (
    <div className="map-detail__star-picker" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={rating === n}
          aria-label={`${n} sao`}
          className={`map-detail__star-btn${n <= rating ? ' is-on' : ''}`}
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="map-detail__info-row">
      <span className="map-detail__info-icon" aria-hidden>
        {icon}
      </span>
      <div className="map-detail__info-body">{children}</div>
    </div>
  )
}

export function MapPlaceDetailPanel({
  open,
  onClose,
  place = null,
  placeLoading = false,
  listing = null,
  listingSummary = null,
  listingLoading = false,
  userLocation = null,
  onNearby,
  onDirections,
  onClearNavigation,
  routeSummary = null,
  routeError = null,
  onSaveListing,
  listingSaved = false,
  saveBusy = false,
  onOpenMessages,
  onOpenAppointments,
}: MapPlaceDetailPanelProps) {
  const { profile, isAuthenticated } = useAuth()
  const isListing = !!(listing || listingSummary)
  const post = listing ?? listingSummary
  const isRenter = profile?.role === UserRole.Renter
  const isLandlord = profile?.role === UserRole.Landlord
  const myId = getStoredSession()?.userId
  const isOwner = !!(listing && myId && listing.ownerId === myId)

  const placeTabs = useMemo(
    () =>
      [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'reviews', label: 'Đánh giá' },
        { id: 'about', label: 'Giới thiệu' },
      ] as const,
    [],
  )
  const listingTabs = useMemo(
    () =>
      [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'amenities', label: 'Tiện ích' },
        { id: 'reviews', label: 'Đánh giá' },
        { id: 'about', label: 'Chi tiết' },
      ] as const,
    [],
  )

  const tabs = isListing ? listingTabs : placeTabs
  const [tab, setTab] = useState<DetailTab>('overview')
  const [tabPhase, setTabPhase] = useState<'enter' | 'exit'>('enter')
  const panelRef = useRef<HTMLElement | null>(null)
  const tabSwitchScrollTopRef = useRef<number | null>(null)
  const [reviews, setReviews] = useState<RentalReviewCollection | null>(null)
  const [reviewsPostId, setReviewsPostId] = useState<string | null>(null)
  const reviewsLoading = Boolean(open && isListing && post?.id && reviewsPostId !== post.id)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleNote, setScheduleNote] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionTone, setActionTone] = useState<'ok' | 'err'>('ok')
  const [streetViewFailed, setStreetViewFailed] = useState(false)
  const [heroImageFailed, setHeroImageFailed] = useState(false)

  useEffect(() => {
    if (open) {
      setTab('overview')
      setTabPhase('enter')
      setScheduleOpen(false)
      setActionMsg(null)
      setStreetViewFailed(false)
      setHeroImageFailed(false)
    }
  }, [open, place?.placeId, post?.id])

  const switchTab = (next: string) => {
    if (next === tab) return
    tabSwitchScrollTopRef.current = panelRef.current?.scrollTop ?? null
    setTabPhase('exit')
    window.setTimeout(() => {
      setTab(next)
      setTabPhase('enter')
      const savedScrollTop = tabSwitchScrollTopRef.current
      if (savedScrollTop == null) return
      window.requestAnimationFrame(() => {
        if (panelRef.current) panelRef.current.scrollTop = savedScrollTop
      })
    }, 180)
  }

  const handlePanelWheelCapture = (event: WheelEvent<HTMLElement>) => {
    const panel = panelRef.current
    if (!panel) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    if (panel.scrollHeight <= panel.clientHeight + 1) return
    panel.scrollTop += event.deltaY
    if (event.cancelable) event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    if (!open || !isListing || !post?.id) return

    let cancelled = false
    void getRentalPostReviews(post.id)
      .then((data) => {
        if (!cancelled) {
          setReviews(data)
          setReviewsPostId(post.id)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReviews(null)
          setReviewsPostId(post.id)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, isListing, post?.id])

  const heroUrl = useMemo(() => {
    if (isListing) {
      if (listing?.media?.length) {
        const thumb =
          listing.media.find((m) => m.isThumbnail)?.path || listing.media[0]?.path
        if (thumb) return thumb
      }
      return listingSummary?.thumbnailPath || listing?.thumbnailPath || null
    }
    return place?.photoUrls?.[0] ?? null
  }, [isListing, listing, listingSummary, place])

  const title = isListing
    ? post?.title || 'Tin đăng Homeji'
    : place?.name || (placeLoading ? 'Đang tải…' : 'Địa điểm')

  const category = isListing
    ? `Tin Homeji · ${post ? rentalPostTypeLabel[post.type as keyof typeof rentalPostTypeLabel] : 'Phòng'} · ${post?.area ?? '—'} m²`
    : place?.typeLabel || 'Địa điểm trên bản đồ'

  const destination = useMemo(() => {
    if (isListing && post) return { lat: post.latitude, lng: post.longitude }
    return place?.location ?? null
  }, [isListing, post, place])

  const handleDirections = () => {
    if (!destination || !onDirections) return
    onDirections(destination)
  }

  const streetViewUrl = useMemo(() => {
    if (!destination || streetViewFailed) return null
    return streetViewStaticUrl(destination, { width: 640, height: 280 })
  }, [destination, streetViewFailed])

  const resolvedHeroUrl = useMemo(() => {
    if (heroUrl && !heroImageFailed) return heroUrl
    if (streetViewUrl) return streetViewUrl
    return null
  }, [heroUrl, heroImageFailed, streetViewUrl])

  const handleHeroError = () => {
    if (heroUrl && !heroImageFailed && resolvedHeroUrl === heroUrl) {
      setHeroImageFailed(true)
      return
    }
    setStreetViewFailed(true)
  }

  const handleShare = async () => {
    const text = isListing
      ? `${post?.title || 'Tin Homeji'} — ${post?.address || ''}`
      : `${place?.name || ''} — ${place?.address || ''}`
    const url =
      isListing && post
        ? `${window.location.origin}${mapPostUrl(post.id)}`
        : window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url })
        return
      }
    } catch {
      return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
    } catch {
      /* ignore */
    }
  }

  const handleNearby = () => {
    if (!destination || !onNearby) return
    onNearby(destination)
  }

  const notify = (message: string, tone: 'ok' | 'err' = 'ok') => {
    setActionTone(tone)
    setActionMsg(message)
  }

  const handleMessage = async () => {
    if (!post?.id || !isAuthenticated || !isRenter) {
      notify('Chỉ người thuê đã đăng nhập mới nhắn chủ nhà.', 'err')
      return
    }
    setActionBusy(true)
    setActionMsg(null)
    try {
      const convo = await startRentalPostConversation(post.id)
      onOpenMessages?.(convo.id)
      notify('Đã mở hội thoại với chủ nhà.')
    } catch (e) {
      notify(getErrorMessage(e, 'Không mở được chat'), 'err')
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
    setActionMsg(null)
    try {
      await createViewingAppointment(post.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        note: scheduleNote.trim() || undefined,
      })
      setScheduleOpen(false)
      setScheduleNote('')
      notify('Đã gửi yêu cầu xem phòng.')
      onOpenAppointments?.()
    } catch (e) {
      notify(getErrorMessage(e, 'Đặt lịch thất bại'), 'err')
    } finally {
      setActionBusy(false)
    }
  }

  const handleMarkRented = async () => {
    if (!listing?.id || !isOwner || (!isLandlord && listing.type !== RentalPostType.RoomTransfer)) return
    setActionBusy(true)
    setActionMsg(null)
    try {
      await markRentalPostRented(listing.id)
      notify('Đã đánh dấu tin là đã cho thuê.')
    } catch (e) {
      notify(getErrorMessage(e, 'Không cập nhật được trạng thái'), 'err')
    } finally {
      setActionBusy(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!post?.id) return
    setReviewBusy(true)
    setActionMsg(null)
    try {
      await upsertMyRentalReview(post.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      })
      const data = await getRentalPostReviews(post.id)
      setReviews(data)
      setReviewsPostId(post.id)
      setReviewComment('')
      notify('Đã lưu đánh giá.')
    } catch (e) {
      notify(getErrorMessage(e, 'Không gửi được đánh giá'), 'err')
    } finally {
      setReviewBusy(false)
    }
  }

  const loading = isListing ? listingLoading && !post : placeLoading && !place
  const highlight =
    listingSummary?.highlightTag ||
    (listing as RentalPost | null)?.highlightTag ||
    null
  const ownerBadge =
    listing?.ownerBadge || listingSummary?.ownerBadge || null
  const isPremium =
    listing?.isOwnerPremium || listingSummary?.isOwnerPremium || false
  const ownerBadgeText = ownerBadge?.trim() || ''
  const ownerBadgeIsPremium = /premium/i.test(ownerBadgeText)
  const showPremiumBadge = isPremium || ownerBadgeIsPremium
  const showOwnerBadge = ownerBadgeText.length > 0 && !ownerBadgeIsPremium

  return (
    <aside
      ref={panelRef}
      className={`map-detail-panel${open ? ' is-visible' : ''}${isListing ? ' is-listing' : ' is-place'}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={title}
      onWheelCapture={handlePanelWheelCapture}
    >
      <div className="map-detail-panel__handle" aria-hidden>
        <span />
      </div>

      <button type="button" className="map-detail-panel__close" aria-label="Đóng" onClick={onClose}>
        ×
      </button>

      <div className="map-detail-panel__intro">
        <div className="map-detail-panel__hero">
          {resolvedHeroUrl ? (
            <img
              src={resolvedHeroUrl}
              alt=""
              className="map-detail-panel__hero-img"
              onError={handleHeroError}
            />
          ) : (
            <div className="map-detail-panel__hero-empty" aria-hidden>
              {loading ? 'Đang tải…' : isListing ? 'Chưa có ảnh' : 'Google Places'}
            </div>
          )}
          {highlight ? <span className="map-detail-panel__badge">{highlight}</span> : null}
        </div>

        <div className="map-detail-panel__header">
          <h2 className="map-detail-panel__title">{title}</h2>

          {isListing && post ? (
            <p className="map-detail-panel__price">
              {formatPrice(post.price)}
              <span>/tháng</span>
            </p>
          ) : place?.rating != null ? (
            <p className="map-detail-panel__rating-line">
              <strong>{place.rating.toFixed(1).replace('.', ',')}</strong>
              <Stars rating={place.rating} />
            </p>
          ) : null}

          <p className="map-detail-panel__category">{category}</p>
          {isListing && (showPremiumBadge || showOwnerBadge || listing?.isOwnerVerified) ? (
            <p className="map-detail-panel__owner-badges">
              {listing?.isOwnerVerified ? <span className="is-verified">Đã xác minh</span> : null}
              {showPremiumBadge ? <span className="is-premium">Premium</span> : null}
              {showOwnerBadge ? <span className="is-owner">{ownerBadgeText}</span> : null}
            </p>
          ) : null}
        </div>

        <div className="map-detail-panel__actions">
          <button
            type="button"
            className={`map-detail-action${routeSummary && !routeError ? ' is-primary' : ''}`}
            disabled={!destination || !onDirections}
            onClick={handleDirections}
          >
            <span className="map-detail-action__icon" aria-hidden>➤</span>
            <span className="map-detail-action__label">Đường đi</span>
          </button>
          {isListing ? (
            <button type="button" className="map-detail-action" disabled={!onSaveListing || saveBusy} onClick={onSaveListing}>
              <span className="map-detail-action__icon" aria-hidden>{listingSaved ? '★' : '☆'}</span>
              <span className="map-detail-action__label">{listingSaved ? 'Đã lưu' : 'Lưu'}</span>
            </button>
          ) : null}
          {isListing && isRenter ? (
            <button type="button" className="map-detail-action" disabled={actionBusy} onClick={() => void handleMessage()}>
              <span className="map-detail-action__icon" aria-hidden>💬</span>
              <span className="map-detail-action__label">Nhắn tin</span>
            </button>
          ) : null}
          {isListing && isRenter ? (
            <button
              type="button"
              className="map-detail-action"
              onClick={() => setScheduleOpen((v) => !v)}
            >
              <span className="map-detail-action__icon" aria-hidden>📅</span>
              <span className="map-detail-action__label">Xem phòng</span>
            </button>
          ) : null}
          {isListing
          && isOwner
          && (isLandlord || listing?.type === RentalPostType.RoomTransfer)
          && listing?.status !== RentalPostStatus.Rented ? (
            <button
              type="button"
              className="map-detail-action"
              disabled={actionBusy}
              onClick={() => void handleMarkRented()}
            >
              <span className="map-detail-action__icon" aria-hidden>✓</span>
              <span className="map-detail-action__label">Đã thuê</span>
            </button>
          ) : null}
          <button type="button" className="map-detail-action" disabled={!destination || !onNearby} onClick={handleNearby}>
            <span className="map-detail-action__icon" aria-hidden>⌖</span>
            <span className="map-detail-action__label">Gần đó</span>
          </button>
          <button type="button" className="map-detail-action" onClick={() => void handleShare()}>
            <span className="map-detail-action__icon" aria-hidden>⤴</span>
            <span className="map-detail-action__label">Chia sẻ</span>
          </button>
          {isListing && post ? (
          <button type="button" className="map-detail-action" onClick={() => switchTab('about')}>
            <span className="map-detail-action__icon" aria-hidden>▣</span>
            <span className="map-detail-action__label">Chi tiết</span>
          </button>
          ) : null}
        </div>

        {routeSummary || routeError ? (
          <div className={`map-detail-panel__route-block${routeError ? ' is-error' : ''}`}>
            <div className={`map-detail-panel__route${routeError ? ' is-error' : ''}`}>
              {routeError ? (
                <p>{routeError}</p>
              ) : (
                <div className="map-detail-panel__route-head">
                  <p>
                    <span className="map-detail-panel__route-mode">Đường đi</span>
                    <strong>{routeSummary!.durationText}</strong>
                    <span> · {routeSummary!.distanceText}</span>
                  </p>
                  {!userLocation ? <span> · cần vị trí của bạn</span> : null}
                </div>
              )}
              {onClearNavigation ? (
                <button
                  type="button"
                  className="map-detail-panel__route-clear"
                  onClick={onClearNavigation}
                >
                  Xóa đường đi
                </button>
              ) : null}
            </div>
            {!routeError && routeSummary?.steps && routeSummary.steps.length > 0 ? (
              <ol className="map-detail-panel__route-steps" aria-label="Chi tiết lộ trình">
                {routeSummary.steps.map((step, i) => (
                  <li key={`${i}-${step.instruction.slice(0, 24)}`}>
                    <span className="map-detail-panel__route-maneuver" aria-hidden>
                      {maneuverGlyph(step.maneuver)}
                    </span>
                    <div className="map-detail-panel__route-step-body">
                      <p>{step.instruction}</p>
                      {step.distanceText ? (
                        <small>{step.distanceText}</small>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {!routeError && routeSummary && (!routeSummary.steps || routeSummary.steps.length === 0) ? (
              <p className="map-detail-panel__route-empty">
                Đã vẽ tuyến trên bản đồ. Chi tiết từng bước tạm thời không khả dụng.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`map-detail-schedule${scheduleOpen ? ' is-visible' : ''}`} aria-hidden={!scheduleOpen}>
          <ScheduleDateTimePicker
            label="Thời gian xem"
            value={scheduleAt}
            onChange={setScheduleAt}
          />
          <label>
            Ghi chú
            <input
              value={scheduleNote}
              onChange={(e) => setScheduleNote(e.target.value)}
              placeholder="Ví dụ: mình đến sau 18h"
            />
          </label>
          <button
            type="button"
            className="map-detail-schedule__submit map-motion-press"
            disabled={!scheduleAt || actionBusy}
            onClick={() => void handleBookViewing()}
          >
            Gửi yêu cầu
          </button>
        </div>

        {actionMsg ? (
          <p
            className={`map-detail-panel__toast map-detail-panel__toast--${actionTone} map-motion-fade`}
            role="status"
          >
            {actionMsg}
          </p>
        ) : null}
      </div>

      <div className="map-detail-panel__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`map-detail-panel__tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`map-detail-panel__content map-detail-panel__body--${tabPhase}`} role="tabpanel">
          {loading ? <ContentSkeleton compact variant="detail" label="Đang tải thông tin địa điểm…" /> : null}

          {!loading && tab === 'overview' && isListing && post ? (
            <div className="map-detail-panel__section">
              {streetViewUrl && resolvedHeroUrl !== streetViewUrl ? (
                <div className="map-detail-panel__street">
                  <img
                    src={streetViewUrl}
                    alt={`Góc phố gần ${title}`}
                    loading="lazy"
                    onError={() => setStreetViewFailed(true)}
                  />
                </div>
              ) : null}
              <InfoRow icon="📍"><p>{post.address || 'Chưa có địa chỉ'}</p></InfoRow>
              <InfoRow icon="📐"><p>Diện tích <strong>{post.area} m²</strong></p></InfoRow>
              <InfoRow icon="💰">
                <p>
                  Giá thuê <strong>{formatPrice(post.price)}/tháng</strong>
                  {listing && listing.deposit > 0 ? <> · Cọc {formatPrice(listing.deposit)}</> : null}
                </p>
              </InfoRow>
              {listing ? (
                <>
                  {listing.type === RentalPostType.RoomTransfer ? (
                    <div className="map-detail-transfer">
                      <strong>
                        {listing.transferKind === RoomTransferKind.TemporarySublet
                          ? 'Cho thuê lại tạm thời'
                          : 'Chuyển hợp đồng — rời hẳn'}
                      </strong>
                      <p>
                        Hợp đồng gốc đến {listing.originalLeaseEndsOn || 'chưa cập nhật'}
                        {(listing.passFee ?? 0) > 0
                          ? ` · Phí pass ${formatPrice(listing.passFee ?? 0)}`
                          : ' · Không thu phí pass'}
                      </p>
                      <span className={listing.ownerConsentVerifiedAt ? 'is-verified' : 'is-pending'}>
                        {listing.ownerConsentVerifiedAt
                          ? '✓ Homeji đã kiểm tra xác nhận chủ nhà'
                          : 'Đang kiểm tra xác nhận chủ nhà'}
                      </span>
                      {listing.transferReason ? <p>Lý do: {listing.transferReason}</p> : null}
                      <small>Không đặt cọc trước khi xem phòng và đọc văn bản chuyển giao.</small>
                    </div>
                  ) : null}
                  <InfoRow icon="👥">
                    <p>
                      Còn {listing.availableSlots ?? '—'}/{listing.maxOccupants ?? '—'} chỗ ·{' '}
                      {listing.availableFrom ? `Nhận từ ${listing.availableFrom}` : 'Linh hoạt ngày nhận'}
                    </p>
                  </InfoRow>
                  <InfoRow icon="⚡">
                    <p>
                      Điện {formatPrice(listing.electricityPrice ?? 0)} · Nước{' '}
                      {formatPrice(listing.waterPrice ?? 0)} · Net{' '}
                      {formatPrice(listing.internetPrice ?? 0)}
                    </p>
                  </InfoRow>
                  <InfoRow icon="👁">
                    <p>{listing.viewCount} lượt xem · {listing.saveCount} lượt lưu</p>
                  </InfoRow>
                  <InfoRow icon="⭐">
                    <p className="map-detail-panel__review-overview" aria-live="polite">
                      {reviewsLoading ? (
                        <span>Đang tải đánh giá…</span>
                      ) : (
                        <>
                          <strong>{Math.min(5, Math.max(0, reviews?.averageRating ?? 0)).toFixed(1)}/5.0</strong>
                          <Stars rating={Math.min(5, Math.max(0, reviews?.averageRating ?? 0))} />
                          <span>· {reviews?.reviewCount ?? 0} đánh giá</span>
                        </>
                      )}
                    </p>
                  </InfoRow>
                  {listing.ownerDisplayName ? (
                    <InfoRow icon="👤">
                      <p>
                        Chủ nhà <strong>{listing.ownerDisplayName}</strong>
                        {listing.ownerPhone ? ` · ${listing.ownerPhone}` : ''}
                      </p>
                    </InfoRow>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'overview' && !isListing && place ? (
            <div className="map-detail-panel__section">
              {streetViewUrl && resolvedHeroUrl !== streetViewUrl ? (
                <div className="map-detail-panel__street">
                  <img
                    src={streetViewUrl}
                    alt={`Góc phố gần ${title}`}
                    loading="lazy"
                    onError={() => setStreetViewFailed(true)}
                  />
                </div>
              ) : null}
              {place.address ? <InfoRow icon="📍"><p>{place.address}</p></InfoRow> : null}
              {place.phone ? (
                <InfoRow icon="📞"><a href={`tel:${place.phone}`}>{place.phone}</a></InfoRow>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'reviews' && isListing ? (
            <div className="map-detail-panel__section map-detail-reviews">
              {reviewsLoading ? (
                <ContentSkeleton compact count={3} label="Đang tải đánh giá…" />
              ) : (
                <>
                  <div className="map-detail-reviews__summary">
                    <div className="map-detail-reviews__score-block">
                      <span className="map-detail-reviews__avg">
                        {(reviews?.averageRating ?? 0).toFixed(1)}
                      </span>
                      <div className="map-detail-reviews__score-meta">
                        <Stars rating={reviews?.averageRating ?? 0} />
                        <p className="map-detail-reviews__count">
                          {reviews?.reviewCount
                            ? `${reviews.reviewCount} đánh giá`
                            : 'Chưa có đánh giá'}
                        </p>
                      </div>
                    </div>
                    {!reviews || reviews.reviews.length === 0 ? (
                      <p className="map-detail-reviews__hint">
                        Chưa có đánh giá công khai — hãy là người đầu tiên chia sẻ trải nghiệm.
                      </p>
                    ) : null}
                  </div>

                  {reviews && reviews.reviews.length > 0 ? (
                    <ul className="map-detail-reviews__list">
                      {reviews.reviews.map((r) => (
                        <li key={r.id}>
                          <article className="map-detail-review">
                            <header>
                              <strong>{r.reviewerDisplayName}</strong>
                              <Stars rating={r.rating} />
                            </header>
                            {r.comment ? <p>{r.comment}</p> : null}
                          </article>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {isAuthenticated && isRenter ? (
                    <div className="map-detail-review-form">
                      <h3 className="map-detail-review-form__title">Viết đánh giá</h3>
                      <p className="map-detail-reviews__hint">
                        Cần hoàn tất lịch xem phòng với chủ nhà trước khi gửi đánh giá đầu tiên.
                      </p>
                      <div className="map-detail-review-form__field">
                        <span className="map-detail-review-form__label">Điểm của bạn</span>
                        <Stars
                          rating={reviewRating}
                          interactive
                          onChange={setReviewRating}
                          label="Chọn điểm từ 1 đến 5 sao"
                        />
                      </div>
                      <label className="map-detail-review-form__field">
                        <span className="map-detail-review-form__label">Nhận xét</span>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Trải nghiệm của bạn về phòng / chủ nhà…"
                        />
                      </label>
                      <button
                        type="button"
                        className="map-detail-review-form__submit map-motion-press"
                        disabled={reviewBusy}
                        onClick={() => void handleSubmitReview()}
                      >
                        {reviewBusy ? 'Đang gửi…' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  ) : (
                    <p className="map-detail-reviews__guest">
                      Đăng nhập bằng tài khoản người thuê để gửi đánh giá.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}

          {!loading && tab === 'reviews' && !isListing && place ? (
            <div className="map-detail-panel__section map-detail-reviews">
              <div className="map-detail-reviews__summary">
                <div className="map-detail-reviews__score-block">
                  <span className="map-detail-reviews__avg">
                    {place.rating != null ? place.rating.toFixed(1) : '—'}
                  </span>
                  <div className="map-detail-reviews__score-meta">
                    {place.rating != null ? <Stars rating={place.rating} /> : null}
                    <p className="map-detail-reviews__count">
                      {place.ratingCount
                        ? `${place.ratingCount} đánh giá Google`
                        : place.reviews.length
                          ? `${place.reviews.length} bài đánh giá`
                          : 'Chưa có đánh giá công khai'}
                    </p>
                  </div>
                </div>
              </div>
              {place.reviews.length === 0 ? (
                <p className="map-detail-reviews__hint">Chưa có bài đánh giá công khai từ Google.</p>
              ) : (
                <ul className="map-detail-reviews__list">
                  {place.reviews.map((r, i) => (
                    <li key={`${r.author}-${i}`}>
                      <article className="map-detail-review">
                        <header>
                          <strong>{r.author}</strong>
                          {r.rating != null ? <Stars rating={r.rating} /> : null}
                        </header>
                        {r.text ? <p>{r.text}</p> : null}
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {!loading && tab === 'amenities' && listing ? (
            <div className="map-detail-panel__section map-detail-panel__amenities">
              {listing.amenities.length === 0 ? (
                <p className="map-detail-panel__empty">Chưa cập nhật tiện ích.</p>
              ) : (
                <ul className="map-detail-amenities">
                  {listing.amenities.map((a) => (
                    <li key={a}><span aria-hidden>✓</span> {amenityLabel(a)}</li>
                  ))}
                </ul>
              )}
              {listing.houseRules ? (
                <div className="map-detail-panel__rules">
                  <h3 className="map-detail-panel__subhead">Nội quy</h3>
                  <p>{listing.houseRules}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'about' && isListing ? (
            <div className="map-detail-panel__section map-detail-panel__about">
              {listing?.description?.trim() ? (
                <p>{listing.description}</p>
              ) : (
                <p className="map-detail-panel__empty">Chủ nhà chưa thêm mô tả chi tiết.</p>
              )}
            </div>
          ) : null}

          {!loading && tab === 'about' && !isListing && place ? (
            <div className="map-detail-panel__section map-detail-panel__about">
              {place.editorialSummary ? (
                <p>{place.editorialSummary}</p>
              ) : (
                <p className="map-detail-panel__empty">Chưa có phần giới thiệu từ Google.</p>
              )}
            </div>
          ) : null}
      </div>
    </aside>
  )
}
