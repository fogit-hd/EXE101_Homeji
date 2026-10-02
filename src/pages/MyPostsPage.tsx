import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  archiveRentalPost,
  getMyRentalPostStats,
  markRentalPostRented,
  type RentalPostOwnerStats,
} from '../api'
import { RentalPostStatus, RentalPostType } from '../api/types'
import {
  PageFrame,
  exploreMapUrl,
  usePageFrameChromeActive,
  usePageFrameChromePortals,
} from '../components/chrome'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { getErrorMessage } from '../lib/errors'
import { formatDate, rentalPostStatusLabel, rentalPostTypeLabel } from '../lib/labels'
import { mapPostUrl, mapSectionUrl } from '../lib/mapDeepLinks'

function parseType(raw: string | null): RentalPostType | null {
  if (raw === 'vacant' || raw === String(RentalPostType.VacantRoom)) return RentalPostType.VacantRoom
  if (raw === 'roommate' || raw === String(RentalPostType.RoommateShare)) return RentalPostType.RoommateShare
  if (raw === 'transfer' || raw === 'pass' || raw === String(RentalPostType.RoomTransfer)) return RentalPostType.RoomTransfer
  return null
}

export function MyPostsPage({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams()
  const typeFilter = parseType(searchParams.get('type'))
  const [stats, setStats] = useState<RentalPostOwnerStats | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const loadFn = useCallback(async () => {
    setStats(await getMyRentalPostStats())
  }, [])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(loadFn)

  const isRoommate = typeFilter === RentalPostType.RoommateShare
  const isRoomTransfer = typeFilter === RentalPostType.RoomTransfer
  const title = isRoommate
    ? 'Quản lý tin ở ghép'
    : isRoomTransfer
      ? 'Quản lý tin pass phòng'
    : typeFilter === RentalPostType.VacantRoom
      ? 'Quản lý danh sách phòng'
      : 'Quản lý tin đăng'
  const createPath = isRoommate
    ? '/posts/new?type=roommate'
    : isRoomTransfer
      ? '/posts/new?type=pass'
      : '/posts/new?type=vacant'

  const posts = (stats?.posts ?? []).filter((p) =>
    typeFilter == null ? true : p.type === typeFilter,
  )

  const actions = (
    <>
      <Link to={exploreMapUrl()} className="btn btn-secondary btn-sm btn-map-cta">
        Xem trên bản đồ
      </Link>
      <Link to={createPath} className="btn btn-primary btn-sm">
        Đăng tin mới
      </Link>
      <Link to={mapSectionUrl('invitations')} className="btn btn-secondary btn-sm">
        Lời mời ở ghép
      </Link>
    </>
  )

  const liftChrome = usePageFrameChromeActive()
  const chromePortals = usePageFrameChromePortals({ actions })

  const body = (
    <>
      {chromePortals}
      {embedded && !liftChrome ? (
        <div className="page-frame__actions" style={{ marginBottom: 12 }}>
          {actions}
        </div>
      ) : null}

      {typeFilter ? (
        <p className="page-subtitle" style={{ marginTop: 0 }}>
          Nhóm <strong>{rentalPostTypeLabel[typeFilter]}</strong>
          {stats?.isPremium ? ' · Premium' : ''}
        </p>
      ) : null}

      <PageNotice message={actionError || (error && !disrupted ? error : '')} tone="error" />
      <PageNotice message={actionMsg} tone="success" />

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="dashboard" label="Đang tải tin đã đăng…" />
      ) : (
        <>
          {stats ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ margin: 0 }}>
                <strong>{stats.totalPosts}</strong> tin · {stats.totalViews} lượt xem · {stats.totalSaves} lưu ·{' '}
                {stats.totalContacts} liên hệ · {stats.totalAppointments} lịch hẹn
              </p>
            </div>
          ) : null}

          {posts.length === 0 ? (
            <div className="page-frame-empty">
              <p className="page-frame-empty__title">Chưa có tin đăng</p>
              <p>Hãy tạo tin mới để bắt đầu quản lý tại đây.</p>
            </div>
          ) : (
            <div className="notification-list">
              {posts.map((p) => (
                <article key={p.id} className="card notification-item map-motion-fade-up">
                  <div>
                    <span className="badge badge-gray">
                      {rentalPostStatusLabel[p.status] ?? 'Tin'}
                      {p.type != null ? ` · ${rentalPostTypeLabel[p.type] ?? ''}` : ''}
                    </span>
                    <h3>{p.title || 'Không tiêu đề'}</h3>
                    <p>
                      {p.viewCount} xem · {p.saveCount} lưu · {p.contactCount} LH · {p.appointmentCount}{' '}
                      lịch
                      {p.boostScore > 0 ? ` · boost ${p.boostScore}` : ''}
                    </p>
                    <small>Cập nhật {formatDate(p.updatedAt)}</small>
                  </div>
                  <div className="notification-item__actions">
                    <Link to={mapPostUrl(p.id)} className="btn btn-ghost btn-sm">
                      Xem trên bản đồ
                    </Link>
                    <Link to={`/posts/${p.id}/edit`} className="btn btn-secondary btn-sm">
                      Sửa
                    </Link>
                    {p.status === RentalPostStatus.Active ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setActionError('')
                          void markRentalPostRented(p.id)
                            .then(() => {
                              setActionMsg('Đã đánh dấu cho thuê.')
                              void reload()
                            })
                            .catch((err) => setActionError(getErrorMessage(err, 'Thao tác thất bại')))
                        }}
                      >
                        Đã thuê
                      </button>
                    ) : null}
                    {p.status !== RentalPostStatus.Archived ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setActionError('')
                          void archiveRentalPost(p.id)
                            .then(() => {
                              setActionMsg('Đã lưu trữ tin.')
                              void reload()
                            })
                            .catch((err) => setActionError(getErrorMessage(err, 'Lưu trữ thất bại')))
                        }}
                      >
                        Lưu trữ
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )

  if (embedded) {
    return <div className="feature-page">{body}</div>
  }

  return (
    <PageFrame title={title} actions={actions}>
      {body}
    </PageFrame>
  )
}
