import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RentalPost } from '../../api/types'
import { formatPrice, rentalPostTypeLabel } from '../../lib/labels'
import {
  buildDirectionsUrl,
  type MapPlaceDetails,
} from '../../lib/mapPlace'
import { useMountTransition } from './useMountTransition'
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
  } | null
  listingLoading?: boolean
  userLocation?: { lat: number; lng: number } | null
  onNearby?: (loc: { lat: number; lng: number }) => void
  onSaveListing?: () => void
  listingSaved?: boolean
  saveBusy?: boolean
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="map-detail__stars" aria-hidden>
      {'★★★★★'.slice(0, Math.min(5, Math.max(0, full)))}
      <span className="map-detail__stars-empty">
        {'★★★★★'.slice(0, Math.max(0, 5 - full))}
      </span>
    </span>
  )
}

function InfoRow({
  icon,
  children,
}: {
  icon: string
  children: ReactNode
}) {
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
  onSaveListing,
  listingSaved = false,
  saveBusy = false,
}: MapPlaceDetailPanelProps) {
  const motion = useMountTransition(open, 360)
  const isListing = !!(listing || listingSummary)
  const post = listing ?? listingSummary

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
        { id: 'about', label: 'Chi tiết' },
      ] as const,
    [],
  )

  const tabs = isListing ? listingTabs : placeTabs
  const [tab, setTab] = useState<DetailTab>('overview')

  useEffect(() => {
    if (open) setTab('overview')
  }, [open, place?.placeId, post?.id])

  const heroUrl = useMemo(() => {
    if (isListing) {
      if (listing?.media?.length) {
        const thumb =
          listing.media.find((m) => m.isThumbnail)?.path ||
          listing.media[0]?.path
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
    if (isListing && post) {
      return { lat: post.latitude, lng: post.longitude }
    }
    return place?.location ?? null
  }, [isListing, post, place])

  const handleDirections = () => {
    if (!destination) return
    window.open(buildDirectionsUrl(destination, userLocation), '_blank', 'noopener,noreferrer')
  }

  const handleShare = async () => {
    const text = isListing
      ? `${post?.title || 'Tin Homeji'} — ${post?.address || ''}`
      : `${place?.name || ''} — ${place?.address || ''}`
    const url = isListing && post ? `${window.location.origin}/posts/${post.id}` : window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url })
        return
      }
    } catch {
      /* user cancelled */
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

  if (!motion.mounted) return null

  const loading = isListing ? listingLoading && !post : placeLoading && !place

  return (
    <aside
      className={`map-detail-panel${motion.active ? ' is-open' : ''}${isListing ? ' is-listing' : ' is-place'}`}
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      <button
        type="button"
        className="map-detail-panel__close"
        aria-label="Đóng"
        onClick={onClose}
      >
        ×
      </button>

      <div className="map-detail-panel__scroll">
        <div className="map-detail-panel__hero">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="map-detail-panel__hero-img" />
          ) : (
            <div className="map-detail-panel__hero-empty" aria-hidden>
              {loading ? 'Đang tải…' : isListing ? 'Chưa có ảnh' : 'Google Places'}
            </div>
          )}
          {!isListing && place && place.photoUrls.length > 1 ? (
            <div className="map-detail-panel__thumbs" aria-label="Ảnh địa điểm">
              {place.photoUrls.slice(0, 4).map((url) => (
                <img key={url} src={url} alt="" />
              ))}
            </div>
          ) : null}
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
              {place.ratingCount != null ? (
                <span className="map-detail-panel__muted">
                  ({place.ratingCount.toLocaleString('vi-VN')})
                </span>
              ) : null}
            </p>
          ) : null}

          <p className="map-detail-panel__category">{category}</p>
        </div>

        <div className="map-detail-panel__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`map-detail-panel__tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="map-detail-panel__actions">
          <button
            type="button"
            className="map-detail-action is-primary"
            disabled={!destination}
            onClick={handleDirections}
          >
            <span className="map-detail-action__icon" aria-hidden>
              ➤
            </span>
            <span className="map-detail-action__label">Đường đi</span>
          </button>

          {isListing ? (
            <button
              type="button"
              className="map-detail-action"
              disabled={!onSaveListing || saveBusy}
              onClick={onSaveListing}
            >
              <span className="map-detail-action__icon" aria-hidden>
                {listingSaved ? '★' : '☆'}
              </span>
              <span className="map-detail-action__label">
                {listingSaved ? 'Đã lưu' : 'Lưu'}
              </span>
            </button>
          ) : (
            <button type="button" className="map-detail-action" disabled title="Sắp có">
              <span className="map-detail-action__icon" aria-hidden>
                ☆
              </span>
              <span className="map-detail-action__label">Lưu</span>
            </button>
          )}

          <button
            type="button"
            className="map-detail-action"
            disabled={!destination || !onNearby}
            onClick={handleNearby}
          >
            <span className="map-detail-action__icon" aria-hidden>
              ⌖
            </span>
            <span className="map-detail-action__label">Gần đó</span>
          </button>

          <button type="button" className="map-detail-action" onClick={() => void handleShare()}>
            <span className="map-detail-action__icon" aria-hidden>
              ⤴
            </span>
            <span className="map-detail-action__label">Chia sẻ</span>
          </button>

          {isListing && post ? (
            <Link to={`/posts/${post.id}`} className="map-detail-action">
              <span className="map-detail-action__icon" aria-hidden>
                ▣
              </span>
              <span className="map-detail-action__label">Chi tiết</span>
            </Link>
          ) : null}
        </div>

        <div className="map-detail-panel__body" role="tabpanel">
          {loading ? (
            <p className="map-detail-panel__loading">Đang tải thông tin…</p>
          ) : null}

          {!loading && tab === 'overview' && isListing && post ? (
            <div className="map-detail-panel__section">
              <InfoRow icon="📍">
                <p>{post.address || 'Chưa có địa chỉ'}</p>
              </InfoRow>
              <InfoRow icon="📐">
                <p>
                  Diện tích <strong>{post.area} m²</strong>
                </p>
              </InfoRow>
              <InfoRow icon="💰">
                <p>
                  Giá thuê <strong>{formatPrice(post.price)}/tháng</strong>
                  {listing && listing.deposit > 0 ? (
                    <>
                      {' '}
                      · Cọc {formatPrice(listing.deposit)}
                    </>
                  ) : null}
                </p>
              </InfoRow>
              {listing ? (
                <InfoRow icon="👁">
                  <p>
                    {listing.viewCount} lượt xem · {listing.saveCount} lượt lưu
                  </p>
                </InfoRow>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'overview' && !isListing && place ? (
            <div className="map-detail-panel__section">
              {place.openNow != null ? (
                <InfoRow icon="🕒">
                  <p>
                    <span className={place.openNow ? 'is-open-now' : 'is-closed-now'}>
                      {place.openNow ? 'Đang mở cửa' : 'Đã đóng cửa'}
                    </span>
                    {place.weekdayHours[0] ? (
                      <span className="map-detail-panel__muted">
                        {' '}
                        · {place.weekdayHours[0]}
                      </span>
                    ) : null}
                  </p>
                </InfoRow>
              ) : null}
              {place.address ? (
                <InfoRow icon="📍">
                  <p>{place.address}</p>
                </InfoRow>
              ) : null}
              {place.phone ? (
                <InfoRow icon="📞">
                  <a href={`tel:${place.phone}`}>{place.phone}</a>
                </InfoRow>
              ) : null}
              {place.websiteUri ? (
                <InfoRow icon="🌐">
                  <a href={place.websiteUri} target="_blank" rel="noreferrer">
                    {place.websiteUri.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </InfoRow>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'reviews' && place ? (
            <div className="map-detail-panel__section">
              {place.reviews.length === 0 ? (
                <p className="map-detail-panel__empty">Chưa có bài đánh giá công khai.</p>
              ) : (
                place.reviews.map((r, i) => (
                  <article key={`${r.author}-${i}`} className="map-detail-review">
                    <header>
                      <strong>{r.author}</strong>
                      {r.rating != null ? <Stars rating={r.rating} /> : null}
                      {r.relativeTime ? (
                        <span className="map-detail-panel__muted">{r.relativeTime}</span>
                      ) : null}
                    </header>
                    {r.text ? <p>{r.text}</p> : null}
                  </article>
                ))
              )}
            </div>
          ) : null}

          {!loading && tab === 'amenities' && listing ? (
            <div className="map-detail-panel__section">
              {listing.amenities.length === 0 ? (
                <p className="map-detail-panel__empty">Chưa cập nhật tiện ích.</p>
              ) : (
                <ul className="map-detail-amenities">
                  {listing.amenities.map((a) => (
                    <li key={a}>
                      <span aria-hidden>✓</span> {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {!loading && tab === 'amenities' && !listing ? (
            <p className="map-detail-panel__empty">
              {listingLoading ? 'Đang tải tiện ích…' : 'Chưa cập nhật tiện ích.'}
            </p>
          ) : null}

          {!loading && tab === 'about' && isListing ? (
            <div className="map-detail-panel__section map-detail-panel__about">
              {listing?.description?.trim() ? (
                <p>{listing.description}</p>
              ) : (
                <p className="map-detail-panel__empty">
                  {listingLoading
                    ? 'Đang tải mô tả…'
                    : 'Chủ nhà chưa thêm mô tả chi tiết.'}
                </p>
              )}
              {post ? (
                <Link to={`/posts/${post.id}`} className="map-detail-panel__cta">
                  Xem trang chi tiết phòng →
                </Link>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === 'about' && !isListing && place ? (
            <div className="map-detail-panel__section map-detail-panel__about">
              {place.editorialSummary ? (
                <p>{place.editorialSummary}</p>
              ) : (
                <p className="map-detail-panel__empty">
                  Chưa có phần giới thiệu từ Google cho địa điểm này.
                </p>
              )}
              {place.weekdayHours.length > 0 ? (
                <>
                  <h3 className="map-detail-panel__subhead">Giờ mở cửa</h3>
                  <ul className="map-detail-hours">
                    {place.weekdayHours.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
