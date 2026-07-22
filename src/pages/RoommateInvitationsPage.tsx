import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  acceptInvitation,
  cancelInvitation,
  getMyInvitations,
  rejectInvitation,
  type RoommateInvitation,
} from '../api'
import { RoommateInvitationStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, invitationStatusLabel } from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'

type Props = {
  embedded?: boolean
  onOpenConversation?: (conversationId: string) => void
}

export function RoommateInvitationsPage({ embedded = false, onOpenConversation }: Props) {
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<RoommateInvitation[]>([])
  const [actionError, setActionError] = useState('')

  const loadFn = useCallback(async () => {
    setInvitations(await getMyInvitations())
  }, [])

  const { showLoader, onIntroComplete, error, disrupted } = usePersistentLoad(loadFn)

  const updateItem = (updated: RoommateInvitation) => {
    setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Lời mời ở ghép</h1>
          <p className="page-subtitle">Quản lý lời mời gửi và nhận</p>
        </>
      ) : null}
      {error && !disrupted && <div className="alert alert-error">{error}</div>}
      {actionError ? <div className="alert alert-error">{actionError}</div> : null}

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="list" label="Đang tải lời mời ở ghép…" />
      ) : invitations.length === 0 ? (
        <div className="empty-state card">Chưa có lời mời nào.</div>
      ) : (
        <div className="invitation-list">
          {invitations.map((inv) => {
            const isReceiver = profile?.id === inv.receiverId
            const isSender = profile?.id === inv.senderId
            return (
              <article key={inv.id} className="card invitation-item">
                <div>
                  <span className="badge badge-blue">{invitationStatusLabel[inv.status]}</span>
                  <p>
                    Tin đăng:{' '}
                    <Link to={mapPostUrl(inv.rentalPostId)}>{inv.rentalPostTitle}</Link>
                  </p>
                  <p>{isReceiver ? 'Bạn được mời' : isSender ? 'Bạn đã gửi' : 'Lời mời'}</p>
                  <small>{formatDate(inv.createdAt)}</small>
                </div>
                <div className="invitation-actions">
                  {inv.status === RoommateInvitationStatus.Accepted && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (!inv.conversationId) {
                          setActionError('Cuộc trò chuyện chưa sẵn sàng. Vui lòng tải lại và thử lại.')
                          return
                        }
                        setActionError('')
                        onOpenConversation?.(inv.conversationId)
                      }}
                    >
                      Mở tin nhắn và chia sẻ ảnh
                    </button>
                  )}
                  {isReceiver && inv.status === RoommateInvitationStatus.Pending && (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => void acceptInvitation(inv.id).then(updateItem)}>
                        Chấp nhận
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void rejectInvitation(inv.id).then(updateItem)}>
                        Từ chối
                      </button>
                    </>
                  )}
                  {isSender && inv.status === RoommateInvitationStatus.Pending && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void cancelInvitation(inv.id).then(updateItem)}>
                      Hủy lời mời
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
