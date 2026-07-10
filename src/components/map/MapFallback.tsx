import { Link } from 'react-router-dom'

export function MapFallback({ message }: { message?: string }) {
  return (
    <div className="rental-map map-placeholder-msg">
      <p>{message ?? 'Bản đồ tạm thời không khả dụng.'}</p>
      <p className="map-placeholder-hint">
        Bạn vẫn có thể xem danh sách phòng bên phải. Thử restart dev server:
      </p>
      <p className="map-placeholder-hint">
        <code>npm run dev:clean</code>
      </p>
      <p className="map-placeholder-hint">
        <Link to="/profile">Hoàn thiện hồ sơ</Link>
      </p>
    </div>
  )
}
