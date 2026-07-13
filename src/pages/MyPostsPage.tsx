import { Link, useSearchParams } from 'react-router-dom'
import { RentalPostType } from '../api/types'
import { rentalPostTypeLabel } from '../lib/labels'
import './ExplorePage.css'

function parseType(raw: string | null): RentalPostType | null {
  if (raw === 'vacant' || raw === String(RentalPostType.VacantRoom)) {
    return RentalPostType.VacantRoom
  }
  if (raw === 'roommate' || raw === String(RentalPostType.RoommateShare)) {
    return RentalPostType.RoommateShare
  }
  return null
}

/**
 * Hub quản lý tin — backend chưa có GET /rental-posts/mine.
 * Dùng các API sẵn có: tạo draft, invitations, profile.
 */
export function MyPostsPage() {
  const [searchParams] = useSearchParams()
  const typeFilter = parseType(searchParams.get('type'))
  const isRoommate = typeFilter === RentalPostType.RoommateShare

  const title = isRoommate
    ? 'Quản lý tin ở ghép'
    : typeFilter === RentalPostType.VacantRoom
      ? 'Quản lý danh sách phòng'
      : 'Quản lý tin đăng'

  const createPath = isRoommate ? '/posts/new?type=roommate' : '/posts/new?type=vacant'

  return (
    <div className="explore-page">
      <header className="explore-page__header">
        <div className="explore-page__header-inner">
          <p className="explore-page__eyebrow">Không gian đăng tin</p>
          <h1 className="explore-page__title">{title}</h1>
          <p className="explore-page__lead">
            {typeFilter ? (
              <>
                Đang xem nhóm <strong>{rentalPostTypeLabel[typeFilter]}</strong>.{' '}
              </>
            ) : null}
            API hiện hỗ trợ tạo tin nháp (`POST /api/rental-posts/drafts`) và lời mời ở ghép — chưa
            có endpoint liệt kê toàn bộ tin của bạn.
          </p>
        </div>
      </header>

      <div className="explore-page__body">
        <div className="explore-page__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <article className="card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Đăng tin mới</h2>
            <p className="explore-page__status" style={{ marginBottom: 16 }}>
              Tạo nháp {isRoommate ? 'tìm bạn ở ghép' : 'cho thuê phòng'}, rồi chỉnh sửa và gửi duyệt.
            </p>
            <Link to={createPath} className="btn btn-primary">
              {isRoommate ? 'Đăng tin tìm người ở cùng' : 'Đăng tin cho thuê phòng'}
            </Link>
          </article>

          {isRoommate ? (
            <article className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Lời mời ở ghép</h2>
              <p className="explore-page__status" style={{ marginBottom: 16 }}>
                Xem, chấp nhận hoặc hủy lời mời qua `GET /api/roommate-invitations/mine`.
              </p>
              <Link to="/invitations" className="btn btn-secondary">
                Mở lời mời của tôi
              </Link>
            </article>
          ) : (
            <article className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Hồ sơ chủ nhà</h2>
              <p className="explore-page__status" style={{ marginBottom: 16 }}>
                Cập nhật thông tin liên hệ trước khi tin được duyệt và liên hệ.
              </p>
              <Link to="/profile" className="btn btn-secondary">
                Mở hồ sơ
              </Link>
            </article>
          )}

          <article className="card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Tin đã lưu</h2>
            <p className="explore-page__status" style={{ marginBottom: 16 }}>
              Xem các phòng bạn đã lưu trong lúc tìm kiếm.
            </p>
            <Link to="/saved" className="btn btn-secondary">
              Phòng đã lưu
            </Link>
          </article>
        </div>

        <p className="explore-page__map-note" style={{ marginTop: 28 }}>
          Khi backend bổ sung API “tin của tôi”, trang này sẽ liệt kê trực tiếp tin đăng / tin nháp
          để chỉnh sửa nhanh hơn.
        </p>

        <div className="explore-page__cta">
          <Link to="/" className="explore-page__back">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
