import './pages.css'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  createInvitation,
  ApiRequestError,
  getRoommateCandidates,
  getSavedPosts,
  unsavePost,
  savePost,
  type RoommateCandidate,
} from '../api'
import { RentalPostType, UserRole } from '../api/types'
import { savedPostsKey } from '../lib/queryKeys'
import { PageNotice } from '../components/toast/PageNotice'
import { RoommateCandidatesSkeleton, SavedSkeleton } from '../components/skeletons/PageSkeletons'
import { RentalPostCard } from '../components/RentalPostCard'
import { RentalShortlistWorkspace } from '../components/ai/RentalJourney'
import { aiFeatureFlags } from '../lib/aiFeatureFlags'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import './SavedPostsPage.css'
import { MapToast } from '../components/map/MapToast'
import { restoreSavedPost } from './SavedPostsPage.recovery'

export function SavedPostsPage({ embedded = false, roommateOnly = false }: { embedded?: boolean; roommateOnly?: boolean }) {
  const { profile } = useAuth()
  return <OwnedSavedPostsPage key={profile?.id ?? 'guest'} embedded={embedded} roommateOnly={roommateOnly} />
}

function OwnedSavedPostsPage({ embedded, roommateOnly }: { embedded: boolean; roommateOnly: boolean }) {
  const { profile, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const isRenter = profile?.role === UserRole.Renter
  const queryKey = savedPostsKey(profile?.id ?? null)
  const savedQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => getSavedPosts(signal),
    enabled: isAuthenticated && Boolean(profile?.id) && isRenter,
  })
  const accessDenied = savedQuery.error instanceof ApiRequestError && [401, 403].includes(savedQuery.error.status)
  const posts = (accessDenied ? [] : savedQuery.data ?? []).filter(post => !roommateOnly || post.type === RentalPostType.RoommateShare)
  const [candidatesFor, setCandidatesFor] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<RoommateCandidate[]>([])
  const [candLoading, setCandLoading] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [inviteBusy, setInviteBusy] = useState<string | null>(null)
  const candidateRequest = useRef(0)
  const inviteLock = useRef(false)
  const unsaveLock = useRef(false)
  const [unsaveBusy, setUnsaveBusy] = useState(false)
  const [saveNotice, setSaveNotice] = useState<{ message: string; tone: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null)

  const handleUnsave = async (postId: string) => {
    if (unsaveLock.current) return
    unsaveLock.current = true
    setUnsaveBusy(true)
    setSaveNotice(null)
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<NonNullable<typeof savedQuery.data>>(queryKey) ?? []
    const index = previous.findIndex(post => post.id === postId)
    const removed = previous[index]
    const restore = () => {
      if (removed) queryClient.setQueryData<NonNullable<typeof savedQuery.data>>(queryKey,
        current => restoreSavedPost(current ?? [], removed, index))
    }
    const undo = async () => {
      if (unsaveLock.current) return
      unsaveLock.current = true
      setUnsaveBusy(true)
      setSaveNotice(null)
      await queryClient.cancelQueries({ queryKey })
      restore()
      try {
        await savePost(postId)
        setSaveNotice({ message: 'Đã lưu phòng', tone: 'success' })
      } catch {
        queryClient.setQueryData<typeof savedQuery.data>(queryKey, current => current?.filter(post => post.id !== postId))
        setSaveNotice({ message: 'Không lưu được phòng. Thử lại sau.', tone: 'error' })
      } finally {
        unsaveLock.current = false
        setUnsaveBusy(false)
      }
    }
    queryClient.setQueryData<typeof savedQuery.data>(queryKey, current => current?.filter(post => post.id !== postId))
    try {
      await unsavePost(postId)
      setSaveNotice({ message: 'Đã bỏ lưu', tone: 'success', action: { label: 'Hoàn tác', onClick: () => { void undo() } } })
      if (candidatesFor === postId) {
        candidateRequest.current++
        setCandidatesFor(null)
        setCandidates([])
        setCandLoading(false)
      }
    } catch {
      restore()
      setSaveNotice({ message: 'Không lưu được phòng. Thử lại sau.', tone: 'error' })
    } finally {
      unsaveLock.current = false
      setUnsaveBusy(false)
    }
  }

  const loadCandidates = async (postId: string, retry = false) => {
    const request = ++candidateRequest.current
    if (!retry && candidatesFor === postId) {
      setCandidatesFor(null)
      setCandidates([])
      setCandLoading(false)
      return
    }
    setCandLoading(true)
    setCandidateError('')
    setActionError('')
    setCandidatesFor(postId)
    setCandidates([])
    try {
      const result = await getRoommateCandidates(postId)
      if (candidateRequest.current === request) setCandidates(result)
    } catch (e) {
      if (candidateRequest.current === request) {
        setCandidateError(getErrorMessage(e, 'Không tải được gợi ý ở ghép'))
        setCandidates([])
      }
    } finally {
      if (candidateRequest.current === request) setCandLoading(false)
    }
  }

  const invite = async (postId: string, receiverId: string) => {
    if (inviteLock.current) return
    inviteLock.current = true
    setInviteBusy(receiverId)
    setActionError('')
    setActionMsg('')
    try {
      await createInvitation(postId, receiverId)
      setActionMsg('Đã gửi lời mời ở ghép.')
    } catch (e) {
      setActionError(getErrorMessage(e, 'Chưa gửi được lời mời. Vui lòng thử lại.'))
    } finally {
      inviteLock.current = false
      setInviteBusy(null)
    }
  }

  const body = (
    <>
      <MapToast message={saveNotice?.message ?? null} tone={saveNotice?.tone} action={saveNotice?.action}
        durationMs={6500} onDismiss={() => setSaveNotice(null)} />
      <PageNotice message={actionError || (savedQuery.error ? getErrorMessage(savedQuery.error, 'Không tải được phòng đã lưu.') : '')} tone="error" />
      {savedQuery.isError ? <button type="button" className="btn btn-secondary" onClick={() => void savedQuery.refetch()} disabled={savedQuery.isFetching}>Thử lại</button> : null}
      <PageNotice message={actionMsg} tone="success" />
      {aiFeatureFlags.decisionTools && !accessDenied ? <RentalShortlistWorkspace /> : null}

      {profile && !isRenter ? (
        // The saved list belongs to renters; for other roles the query never runs, so it would stay pending.
        <div className="page-frame-empty">
          <p className="page-frame-empty__title">Mục này dành cho tài khoản người thuê</p>
          <p>Tài khoản của bạn không có danh sách tin đã lưu.</p>
        </div>
      ) : savedQuery.isPending && !savedQuery.isError ? (
        <SavedSkeleton />
      ) : savedQuery.isError && (!savedQuery.data || accessDenied) ? null : posts.length === 0 ? (
        <div className="page-frame-empty">
          <p className="page-frame-empty__title">Chưa có tin nào được lưu</p>
          <p>{roommateOnly ? 'Lưu phòng quan tâm ở tab Tìm phòng để xem gợi ý người cùng ở.' : 'Lưu tin từ mục Tìm phòng để xem lại tại đây.'}</p>
          <div style={{ marginTop: 16 }}>
            <Link to="/explore" className="btn btn-primary">
              Khám phá phòng ngay
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid-posts">
          {posts.map((post) => (
            <div key={post.id}>
              <RentalPostCard
                post={post}
                showSave
                isSaved
                saveBusy={unsaveBusy}
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
                      <RoommateCandidatesSkeleton count={2} />
                    ) : candidateError ? (
                      <div role="alert"><p>{candidateError}</p><button type="button" className="btn btn-secondary" onClick={() => void loadCandidates(post.id, true)}>Thử lại</button></div>
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
                              disabled={inviteBusy !== null}
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
    </>
  )

  if (embedded) {
    return <div className="feature-page saved-posts-embed">{body}</div>
  }

  return (
    <div className="saved-posts-page">
      <header className="saved-posts-page__header">
        <h1 className="saved-posts-page__title">Phòng bạn đã đánh dấu</h1>
        <p className="saved-posts-page__lead">
          {posts.length > 0 ? `${posts.length} tin đã lưu` : 'Lưu phòng yêu thích để xem lại bất cứ lúc nào.'}
        </p>
      </header>
      {body}
    </div>
  )
}
