import { Link } from 'react-router-dom'
import './GuestListingPreview.css'

/**
 * Landing teaser only — full search lives on /explore
 * (map + Places need a dedicated page; Google Maps may be unavailable).
 */
export function GuestListingPreview() {
  return (
    <section className="guest-preview" id="listings" aria-label="Phòng tốt trên Homeji">
      <div className="guest-preview__inner">
        <p className="guest-preview__eyebrow">Phòng tốt gần bạn</p>
        <h2 className="guest-preview__title">Tìm phòng quanh Thủ Đức &amp; Q.9</h2>
        <p className="guest-preview__lead">
          Xem tin theo từ khóa và khu vực
        </p>

        <div className="guest-preview__actions">
          <Link to="/explore" className="btn btn-primary guest-preview__go">
            Phòng tốt
          </Link>
          <Link to="/register" className="btn btn-secondary guest-preview__go">
            Đăng ký để lưu &amp; liên hệ
          </Link>
        </div>
      </div>
    </section>
  )
}
