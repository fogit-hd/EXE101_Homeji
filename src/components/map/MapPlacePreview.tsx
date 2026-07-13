import type { MapPlaceDetails } from '../../lib/mapPlace'
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
  if (!loading && !place) return null

  return (
    <div
      className={`map-place-preview${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label={place ? `Địa điểm: ${place.name}` : 'Đang tải địa điểm'}
    >
      <button
        type="button"
        className="map-place-preview__close"
        aria-label="Đóng"
        onClick={onClose}
      >
        ×
      </button>

      {loading && !place ? (
        <div className="map-place-preview__body">
          <p className="map-place-preview__eyebrow">Google Maps</p>
          <h2 className="map-place-preview__title">Đang tải thông tin…</h2>
        </div>
      ) : place ? (
        <div className="map-place-preview__body">
          <p className="map-place-preview__eyebrow">
            {place.typeLabel || 'Địa điểm trên bản đồ'}
            {place.openNow == null
              ? ''
              : place.openNow
                ? ' · Đang mở'
                : ' · Đã đóng'}
          </p>
          <h2 className="map-place-preview__title">{place.name}</h2>
          {place.address ? (
            <p className="map-place-preview__addr">{place.address}</p>
          ) : null}
          {place.rating != null ? (
            <p className="map-place-preview__rating">
              ★ {place.rating.toFixed(1)}
              {place.ratingCount != null
                ? ` · ${place.ratingCount.toLocaleString('vi-VN')} đánh giá`
                : ''}
            </p>
          ) : null}
          {place.phone ? (
            <a className="map-place-preview__phone" href={`tel:${place.phone}`}>
              {place.phone}
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
