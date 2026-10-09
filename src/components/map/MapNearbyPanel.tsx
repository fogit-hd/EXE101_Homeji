import { useEffect, useState } from 'react'
import { useSearch } from '../../contexts/SearchContext'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import {
  NEARBY_PLACE_CATEGORY_OPTIONS,
  searchNearbyPlaces,
  type NearbyPlaceItem,
} from '../../lib/placeAutocomplete'
import './MapNearbyPanel.css'

export type NearbyAnchor = { lat: number; lng: number; label: string; placeId?: string }

export function MapNearbyPanel({ anchor, onClose, onPick }: {
  anchor: NearbyAnchor
  onClose: () => void
  onPick: (place: NearbyPlaceItem) => void
}) {
  const { apiKey, isLoaded, loadError } = useGoogleMaps()
  const { nearbyCategory: category, setNearbyCategory: setCategory } = useSearch()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string; items: NearbyPlaceItem[]; error?: string
  } | null>(null)
  const requestKey = `${anchor.lat}:${anchor.lng}:${anchor.placeId ?? ''}:${category}:${attempt}`
  const current = result?.key === requestKey ? result : null

  useEffect(() => {
    if (!isLoaded || loadError) return
    let cancelled = false
    void searchNearbyPlaces(anchor, category, { limit: 8, throwOnError: true })
      .then((items) => {
        if (!cancelled) setResult({ key: requestKey, items: items.filter(place => place.placeId !== anchor.placeId) })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, items: [], error: 'Không thể tải tiện ích từ Google Places. Vui lòng thử lại.' })
      })
    return () => { cancelled = true }
  }, [anchor, category, isLoaded, loadError, requestKey])

  const error = !apiKey ? 'Google Maps chưa được cấu hình.'
    : loadError ? 'Bản đồ chưa tải được. Vui lòng tải lại trang.' : current?.error
  return (
    <aside className="map-nearby-panel" aria-labelledby="nearby-panel-title">
      <header>
        <div><span>Khám phá quanh phòng</span><h2 id="nearby-panel-title">Ăn uống & tiện ích gần đây</h2></div>
        <button type="button" className="map-nearby-panel__close" onClick={onClose} aria-label="Đóng tiện ích gần đây">×</button>
      </header>
      <p className="map-nearby-panel__anchor">Quanh {anchor.label}<br />Địa điểm từ Google Maps, không cần có tin trên Homeji.</p>
      <div className="map-nearby-panel__categories" role="group" aria-label="Loại tiện ích">
        {NEARBY_PLACE_CATEGORY_OPTIONS.map((option) => (
          <button type="button" key={option.id} aria-pressed={category === option.id}
            onClick={() => setCategory(option.id)}>{option.label}</button>
        ))}
      </div>
      {category === 'cafe' ? <p>Nhóm cà phê; chưa có dữ liệu xác nhận yên tĩnh, ổ cắm hoặc phù hợp học tập.</p> : null}
      <div className="map-nearby-panel__results" aria-live="polite" aria-busy={!current && !error}>
        {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div>
          : !current ? <p>Đang tìm tiện ích trong bán kính 1,8 km…</p>
            : current.items.length === 0 ? <p>Chưa tìm thấy địa điểm thuộc nhóm này. Hãy thử loại tiện ích khác.</p>
              : current.items.map((place) => (
                <article key={place.placeId}>
                  <span className="map-nearby-panel__distance">{place.distanceMeters < 1000 ? `${place.distanceMeters} m` : `${(place.distanceMeters / 1000).toFixed(1)} km`}</span>
                  <h3>{place.title}</h3><small>{place.typeLabel}</small><p>{place.address}</p>
                  <div><button type="button" onClick={() => onPick(place)}>Xem trên bản đồ</button>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}&query_place_id=${encodeURIComponent(place.placeId)}`} target="_blank" rel="noopener noreferrer">Google Maps ↗</a></div>
                </article>
              ))}
      </div>
      <footer><strong>Google Maps</strong> · Dữ liệu Google Places · Khoảng cách đường thẳng, không phải quãng đường đi bộ. Không phải quán được Homeji tài trợ.</footer>
    </aside>
  )
}
