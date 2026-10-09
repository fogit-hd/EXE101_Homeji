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
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, invitationStatusLabel } from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'
import { getErrorMessage } from '../lib/errors'
import './ProfilePage.css'
import './RoommateInvitationsPage.css'

type Props = {
  embedded?: boolean
  onOpenConversation?: (conversationId: string) => void
}

export function RoommateInvitationsPage({ embedded = false, onOpenConversation }: Props) {
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<RoommateInvitation[]>([])
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleAction = async (
    invitationId: string,
    action: (id: string) => Promise<RoommateInvitation>,
  ) => {
    if (busyId) return
    setBusyId(invitationId)
    setActionError('')
    try {
      updateItem(await action(invitationId))
    } catch (error) {
      setActionError(getErrorMessage(error, 'Không cập nhật được lời mời. Vui lòng thử lại.'))
    } finally {
      setBusyId(null)
    }
  }

  const loadFn = useCallback(async () => {
    setInvitations(await getMyInvitations())
  }, [])

  const { showLoader, onIntroComplete, error, disrupted } = usePersistentLoad(loadFn)

  const updateItem = (updated: RoommateInvitation) => {
    setInvitations((prev) => prev.map((i) => (i.id === updated.id ? {
      ...updated,
      senderDisplayName: updated.senderDisplayName ?? i.senderDisplayName,
      receiverDisplayName: updated.receiverDisplayName ?? i.receiverDisplayName,
    } : i)))
  }

  return (
    <div className={embedded ? 'map-embed roommate-embed' : 'roommate-page'}>
      {!embedded ? (
        <header className="roommate-page__header">
          <span className="roommate-page__eyebrow">Ở GHÉP</span>
          <h1 className="roommate-page__title">Tìm người ở ghép hợp ý</h1>
          <p className="roommate-page__lead">Quản lý lời mời gửi và nhận — kết nối người ở ghép phù hợp.</p>
        </header>
      ) : null}
      <PageNotice message={actionError || (error && !disrupted ? error : '')} tone="error" />
      <Link to="/?section=profile&profileTab=lifestyle" className="btn btn-secondary">
        Cập nhật lối sống của tôi
      </Link>

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="list" label="Đang tải lời mời ở ghép…" />
      ) : invitations.length === 0 ? (
        <div className="roommate-empty">
          <p className="roommate-empty__title">Chưa có lời mời nào</p>
          <p className="roommate-empty__copy">Mở tab Tìm bạn để kết nối theo nhu cầu và lối sống, kể cả khi chưa chọn phòng.</p>
        </div>
      ) : (
        <div className="roommate-grid">
          {invitations.map((inv) => {
            const isReceiver = profile?.id === inv.receiverId
            const isSender = profile?.id === inv.senderId
            const statusClass = inv.status === RoommateInvitationStatus.Accepted
              ? 'is-accepted'
              : inv.status === RoommateInvitationStatus.Pending
                ? 'is-pending'
                : 'is-closed'
            return (
              <article key={inv.id} className={`roommate-card ${statusClass}`}>
                {/* Avatar placeholder */}
                <div className="roommate-card__avatar" aria-hidden>
                  {isReceiver ? 'G' : 'N'}
                </div>
                <div className="roommate-card__body">
                  <div className="roommate-card__top">
                    <p className="roommate-card__name">
                      {isReceiver ? inv.senderDisplayName || 'Người gửi lời mời' : inv.receiverDisplayName || 'Người được mời'}
                    </p>
                    <span className={`roommate-card__status ${statusClass}`}>
                      {invitationStatusLabel[inv.status]}
                    </span>
                  </div>
                  <p className="roommate-card__post">{inv.rentalPostTitle || 'Kết nối tìm bạn cùng ở'}</p>
                  <p className="roommate-card__role">
                    {isReceiver ? 'Bạn được mời' : isSender ? 'Bạn đã gửi lời mời' : 'Lời mời'}
                  </p>
                  <p className="roommate-card__date">{formatDate(inv.createdAt)}</p>
                  <div className="roommate-card__actions">
                    {inv.rentalPostId ? <Link to={mapPostUrl(inv.rentalPostId)} className="btn btn-ghost btn-sm">
                      Xem tin đăng
                    </Link> : null}
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
                        Nhắn tin
                      </button>
                    )}
                    {isReceiver && inv.status === RoommateInvitationStatus.Pending && (
                      <>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busyId !== null} onClick={() => void handleAction(inv.id, acceptInvitation)}>
                          Chấp nhận
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busyId !== null} onClick={() => void handleAction(inv.id, rejectInvitation)}>
                          Từ chối
                        </button>
                      </>
                    )}
                    {isSender && inv.status === RoommateInvitationStatus.Pending && (
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busyId !== null} onClick={() => void handleAction(inv.id, cancelInvitation)}>
                        Hủy lời mời
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
