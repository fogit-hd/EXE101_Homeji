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
import { useAuth } from '../contexts/AuthContext'
import { formatDate, invitationStatusLabel } from '../lib/labels'

export function RoommateInvitationsPage({ embedded = false }: { embedded?: boolean }) {
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<RoommateInvitation[]>([])

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

      {showLoader ? (
        <HomejiLoader
          onIntroComplete={onIntroComplete}
          message={disrupted ? error : undefined}
        />
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
                    Tin đăng: <Link to={`/posts/${inv.rentalPostId}`}>{inv.rentalPostId.slice(0, 8)}...</Link>
                  </p>
                  <p>{isReceiver ? 'Bạn được mời' : isSender ? 'Bạn đã gửi' : 'Lời mời'}</p>
                  <small>{formatDate(inv.createdAt)}</small>
                </div>
                <div className="invitation-actions">
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
