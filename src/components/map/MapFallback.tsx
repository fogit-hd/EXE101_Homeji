import { Link } from 'react-router-dom'

export function MapFallback({ message }: { message?: string }) {
  return (
    <div className="rental-map rental-map--stage" role="status">
      <div className="rental-map__stage-card">
        <span className="rental-map__stage-mark" aria-hidden />
        <p className="rental-map__stage-title">{message ?? 'Bản đồ tạm thời không khả dụng'}</p>
        <p className="rental-map__stage-copy">
          Bạn vẫn xem được danh sách phòng bên cạnh. Thử khởi động lại dev server bằng{' '}
          <code>npm run dev:clean</code>, hoặc{' '}
          <Link to="/?section=profile">hoàn thiện hồ sơ</Link>.
        </p>
      </div>
    </div>
  )
}
