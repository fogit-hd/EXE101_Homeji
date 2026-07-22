import { useCallback, useState } from 'react'
import {
  createInvitation,
  getRoommateCandidates,
  getSavedPosts,
  unsavePost,
  type RentalPostSummary,
  type RoommateCandidate,
} from '../api'
import { RentalPostType, UserRole } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { RentalPostCard } from '../components/RentalPostCard'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'

export function SavedPostsPage({ embedded = false }: { embedded?: boolean }) {
  const { profile } = useAuth()
  const isRenter = profile?.role === UserRole.Renter
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [candidatesFor, setCandidatesFor] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<RoommateCandidate[]>([])
  const [candLoading, setCandLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [inviteBusy, setInviteBusy] = useState<string | null>(null)

  const loadFn = useCallback(async () => {
    setPosts(await getSavedPosts())
  }, [])

  const { showLoader, onIntroComplete, error, disrupted } = usePersistentLoad(loadFn)

  const handleUnsave = async (postId: string) => {
    await unsavePost(postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    if (candidatesFor === postId) {
      setCandidatesFor(null)
      setCandidates([])
    }
  }

  const loadCandidates = async (postId: string) => {
    if (candidatesFor === postId) {
      setCandidatesFor(null)
      setCandidates([])
      return
    }
    setCandLoading(true)
    setActionError('')
    setCandidatesFor(postId)
    try {
      setCandidates(await getRoommateCandidates(postId))
    } catch (e) {
      setActionError(getErrorMessage(e, 'Không tải được gợi ý ở ghép'))
      setCandidates([])
    } finally {
      setCandLoading(false)
    }
  }

  const invite = async (postId: string, receiverId: string) => {
    setInviteBusy(receiverId)
    setActionError('')
    setActionMsg('')
    try {
      await createInvitation(postId, receiverId)
      setActionMsg('Đã gửi lời mời ở ghép.')
    } catch (e) {
      setActionError(getErrorMessage(e, 'Gửi lời mời thất bại'))
    } finally {
      setInviteBusy(null)
    }
  }

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Tin đã lưu</h1>
          <p className="page-subtitle">Danh sách phòng bạn quan tâm</p>
        </>
      ) : null}
      {(actionError || (error && !disrupted)) && (
        <div className="alert alert-error">{actionError || error}</div>
      )}
      {actionMsg ? <div className="alert alert-success">{actionMsg}</div> : null}

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="list" label="Đang tải tin đã lưu…" />
      ) : posts.length === 0 ? (
        <div className="empty-state card">Chưa có tin nào được lưu.</div>
      ) : (
        <div className="grid-posts">
          {posts.map((post) => (
            <div key={post.id}>
              <RentalPostCard
                post={post}
                showSave
                isSaved
                onUnsave={() => void handleUnsave(post.id)}
              />
              {isRenter && post.type === RentalPostType.RoommateShare ? (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void loadCandidates(post.id)}
                  >
                    {candidatesFor === post.id ? 'Ẩn gợi ý ở ghép' : 'Gợi ý người ở ghép'}
                  </button>
                  {candidatesFor === post.id ? (
                    candLoading ? (
                      <ContentSkeleton compact count={2} label="Đang tải gợi ý người ở ghép…" />
                    ) : candidates.length === 0 ? (
                      <p className="map-appointments__empty">Chưa có ứng viên phù hợp.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                        {candidates.map((c) => (
                          <li key={c.userId} className="card" style={{ padding: 12 }}>
                            <strong>{c.displayName}</strong>
                            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                              {[c.school, c.preferredArea].filter(Boolean).join(' · ') || '—'}
                              {` · điểm ${Math.round(c.matchScore)}`}
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={inviteBusy === c.userId}
                              onClick={() => void invite(post.id, c.userId)}
                            >
                              {inviteBusy === c.userId ? 'Đang gửi…' : 'Mời ở ghép'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
