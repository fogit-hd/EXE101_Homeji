import { useEffect, useState } from 'react'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { ContentSkeleton } from '../ContentSkeleton'
import './MapPlacePreview.css'

type MapPlacePreviewProps = {
  place: MapPlaceDetails | null
  loading?: boolean
  leaving?: boolean
  onClose: () => void
}

export function MapPlacePreview({
  place,
  loading = false,
  leaving = false,
  onClose,
}: MapPlacePreviewProps) {
  const open = !leaving && !!(loading || place)
  const [cachedPlace, setCachedPlace] = useState(place)
  useEffect(() => {
    if (place) setCachedPlace(place)
  }, [place])

  const shown = place ?? cachedPlace

  return (
    <div
      className={`map-place-preview${open ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-hidden={!open}
      aria-label={shown ? `Địa điểm: ${shown.name}` : 'Đang tải địa điểm'}
    >
      <button
        type="button"
        className="map-place-preview__close"
        aria-label="Đóng"
        onClick={onClose}
      >
        ×
      </button>

      {loading && !shown ? (
        <div className="map-place-preview__body">
          <ContentSkeleton compact count={1} label="Đang tải thông tin địa điểm…" />
        </div>
      ) : shown ? (
        <div className="map-place-preview__body">
          <p className="map-place-preview__eyebrow">
            {shown.typeLabel || 'Địa điểm trên bản đồ'}
            {shown.openNow == null
              ? ''
              : shown.openNow
                ? ' · Đang mở'
                : ' · Đã đóng'}
          </p>
          <h2 className="map-place-preview__title">{shown.name}</h2>
          {shown.address ? (
            <p className="map-place-preview__addr">{shown.address}</p>
          ) : null}
          {shown.rating != null ? (
            <p className="map-place-preview__rating">
              ★ {shown.rating.toFixed(1)}
              {shown.ratingCount != null
                ? ` · ${shown.ratingCount.toLocaleString('vi-VN')} đánh giá`
                : ''}
            </p>
          ) : null}
          {shown.phone ? (
            <a className="map-place-preview__phone" href={`tel:${shown.phone}`}>
              {shown.phone}
            </a>
          ) : null}
          <p className="map-place-preview__note">
            Thông tin lấy từ Google Places — xem ngay trong Homeji, không mở
            trang Google Maps.
          </p>
        </div>
      ) : null}
    </div>
  )
}
