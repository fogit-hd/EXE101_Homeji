import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createInvitation,
  createReport,
  getRentalPost,
  getRoommateCandidates,
  getSavedPosts,
  savePost,
  unsavePost,
  type RentalPost,
  type RoommateCandidate,
} from '../api'
import { ReportTargetType, RentalPostType, UserRole } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  rentalPostStatusLabel,
  rentalPostTypeLabel,
} from '../lib/labels'

export function RentalPostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState<RentalPost | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [candidates, setCandidates] = useState<RoommateCandidate[]>([])
  const [error, setError] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [message, setMessage] = useState('')

  const loadFn = useCallback(async () => {
    if (!postId) return
    const [detail, saved] = await Promise.all([
      getRentalPost(postId),
      getSavedPosts().catch(() => []),
    ])
    setPost(detail)
    setSavedIds(new Set(saved.map((s) => s.id)))
    if (detail.type === RentalPostType.RoommateShare) {
      const list = await getRoommateCandidates(postId).catch(() => [])
      setCandidates(list)
    }
  }, [postId])

  const { showLoader, onIntroComplete, error: loadError, disrupted } = usePersistentLoad(
    loadFn,
    [postId],
    { enabled: !!postId },
  )

  const toggleSave = async () => {
    if (!postId) return
    try {
      if (savedIds.has(postId)) {
        await unsavePost(postId)
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })
      } else {
        await savePost(postId)
        setSavedIds((prev) => new Set(prev).add(postId))
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Thao tác lưu tin thất bại'))
    }
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postId) return
    try {
      await createReport({
        targetType: ReportTargetType.RentalPost,
        targetId: postId,
        reason: reportReason,
        description: reportDescription,
      })
      setMessage('Báo cáo đã được gửi.')
      setShowReport(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi báo cáo thất bại'))
    }
  }

  const inviteCandidate = async (receiverId: string) => {
    if (!postId) return
    try {
      await createInvitation(postId, receiverId)
      setMessage('Đã gửi lời mời ở ghép.')
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi lời mời thất bại'))
    }
  }

  if (showLoader) {
    return (
      <HomejiLoader
        fullPage
        onIntroComplete={onIntroComplete}
        message={disrupted ? loadError : undefined}
      />
    )
  }

  if (!post) {
    return (
      <div className="container page">
        <div className="alert alert-error">{loadError || error || 'Không tìm thấy tin đăng'}</div>
        <Link to="/">Quay lại</Link>
      </div>
    )
  }

  const isOwner = profile?.id === post.ownerId

  return (
    <div className="container page">
      <div className="detail-header">
        <div>
          <span className="badge badge-green">{rentalPostTypeLabel[post.type]}</span>
          <span className="badge badge-gray">{rentalPostStatusLabel[post.status]}</span>
          <h1 className="page-title">{post.title || 'Tin đăng'}</h1>
          <p className="detail-price">{formatPrice(post.price)}/tháng</p>
        </div>
        <div className="detail-actions">
          {!isOwner && (
            <button type="button" className="btn btn-primary" onClick={() => void toggleSave()}>
              {savedIds.has(post.id) ? 'Đã lưu' : 'Lưu tin'}
            </button>
          )}
          {isOwner && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/posts/${post.id}/edit`)}>
              Chỉnh sửa
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setShowReport(true)}>
            Báo cáo
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="detail-grid">
        <div className="card">
          {post.media.length > 0 ? (
            <div className="detail-gallery">
              {post.media.map((m) => (
                <img key={m.id} src={m.path} alt="" />
              ))}
            </div>
          ) : (
            <div className="empty-state">Chưa có hình ảnh</div>
          )}

          <h2>Mô tả</h2>
          <p>{post.description || 'Chưa có mô tả'}</p>

          <h2>Tiện ích</h2>
          <div className="amenity-list">
            {post.amenities.length ? (
              post.amenities.map((a) => (
                <span key={a} className="badge badge-blue">{a}</span>
              ))
            ) : (
              <p>Chưa có tiện ích</p>
            )}
          </div>
        </div>

        <aside className="card detail-sidebar">
          <dl className="detail-facts">
            <div><dt>Diện tích</dt><dd>{post.area} m²</dd></div>
            <div><dt>Tiền cọc</dt><dd>{formatPrice(post.deposit)}</dd></div>
            <div><dt>Địa chỉ</dt><dd>{post.address || '—'}</dd></div>
            <div><dt>Lượt xem</dt><dd>{post.viewCount}</dd></div>
            <div><dt>Lượt lưu</dt><dd>{post.saveCount}</dd></div>
            <div><dt>Ngày đăng</dt><dd>{formatDate(post.createdAt)}</dd></div>
          </dl>
          {post.moderationReason && (
            <div className="alert alert-error">Lý do kiểm duyệt: {post.moderationReason}</div>
          )}
        </aside>
      </div>

      {post.type === RentalPostType.RoommateShare && candidates.length > 0 && profile?.role === UserRole.Landlord && isOwner && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2>Gợi ý bạn ở ghép</h2>
          <div className="candidate-list">
            {candidates.map((c) => (
              <div key={c.userId} className="candidate-item">
                <div>
                  <strong>{c.displayName}</strong>
                  <p>{c.school ?? '—'} · {c.preferredArea ?? '—'}</p>
                  <span className="badge badge-green">Độ phù hợp: {c.matchScore}%</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void inviteCandidate(c.userId)}>
                  Mời ở ghép
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showReport && (
        <div className="modal-overlay">
          <div className="modal card">
            <h2>Báo cáo tin đăng</h2>
            <form onSubmit={handleReport}>
              <div className="form-group">
                <label className="form-label">Lý do</label>
                <input className="form-input" value={reportReason} onChange={(e) => setReportReason(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-textarea" value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-danger">Gửi báo cáo</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReport(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
