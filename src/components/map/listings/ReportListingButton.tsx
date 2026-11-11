import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ReportTargetType, createReport } from '../../../api'
import { useAuth } from '../../../contexts/AuthContext'
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getErrorMessage } from '../../../lib/errors'
import {
  LISTING_REPORT_REASONS,
  REPORT_DESCRIPTION_MAX_LENGTH,
  validateListingReport,
  type ListingReportReasonId,
} from '../../../lib/listingReport'

type Props = {
  postId: string
  ownerId: string
  /** Set by the parent when a guest asked to report and then signed in; the panel remounts after login. */
  openRequested?: boolean
  onAuthRequired: () => void
  onOpenRequestHandled: () => void
}

/** Lets a signed-in viewer flag a rental post for moderation. Hidden from the post's owner. */
export function ReportListingButton({ postId, ownerId, openRequested = false, onAuthRequired, onOpenRequestHandled }: Props) {
  const { isAuthenticated, profile } = useAuth()
  const { openAuthModal } = useAuthModal()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [reasonId, setReasonId] = useState<ListingReportReasonId | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reportedPostId, setReportedPostId] = useState<string | null>(null)

  const isOwner = profile?.id === ownerId

  useEffect(() => {
    if (!openRequested || !isAuthenticated) return
    onOpenRequestHandled()
    if (!isOwner) dialogRef.current?.showModal()
  }, [openRequested, isAuthenticated, isOwner, onOpenRequestHandled])

  if (isOwner) return null
  const reported = reportedPostId === postId

  const openDialog = () => {
    setReasonId(null)
    setDescription('')
    setError(null)
    dialogRef.current?.showModal()
  }

  const closeDialog = () => dialogRef.current?.close()

  const handleOpen = () => {
    if (reported) return
    if (!isAuthenticated) {
      openAuthModal({ intent: 'report', onSuccess: onAuthRequired })
      return
    }
    openDialog()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const result = validateListingReport({ reasonId, description })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createReport({
        targetType: ReportTargetType.RentalPost,
        targetId: postId,
        reason: result.reason,
        description: result.description,
      })
      setReportedPostId(postId)
      closeDialog()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Chưa gửi được báo cáo. Vui lòng thử lại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="room-report">
      {reported ? (
        <p className="room-report__done" role="status">
          Đã gửi báo cáo. Đội kiểm duyệt Homeji sẽ xem xét tin này.
        </p>
      ) : (
        <button ref={triggerRef} type="button" className="room-report__trigger" data-glass-exclude onClick={handleOpen}>
          Báo cáo tin này
        </button>
      )}
      <dialog
        ref={dialogRef}
        className="room-report__dialog"
        aria-labelledby={titleId}
        data-glass-exclude
        onCancel={(event) => {
          event.stopPropagation()
          if (busy) event.preventDefault()
        }}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          event.stopPropagation()
          if (event.target === event.currentTarget && !busy) closeDialog()
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <form className="room-report__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <h4 id={titleId}>Báo cáo tin đăng</h4>
          <p className="room-report__hint">Báo cáo chỉ gửi tới đội kiểm duyệt Homeji để xem xét tin này.</p>
          <fieldset className="room-report__reasons" disabled={busy}>
            <legend>Vấn đề bạn gặp</legend>
            {LISTING_REPORT_REASONS.map((reason) => (
              <label key={reason.id} className="room-report__reason">
                <input
                  type="radio"
                  name="report-reason"
                  value={reason.id}
                  checked={reasonId === reason.id}
                  onChange={() => { setReasonId(reason.id); setError(null) }}
                />
                <span>{reason.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="room-report__field" htmlFor={descriptionId}>
            Mô tả thêm {reasonId === 'other' ? '(bắt buộc)' : '(không bắt buộc)'}
          </label>
          <textarea
            id={descriptionId}
            value={description}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            rows={3}
            disabled={busy}
            placeholder="Ví dụ: chủ nhà yêu cầu chuyển cọc trước khi cho xem phòng"
            onChange={(event) => { setDescription(event.target.value); setError(null) }}
          />
          <p className="room-report__count" aria-hidden="true">{description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}</p>
          {error ? <p className="room-report__error" role="alert">{error}</p> : null}
          <div className="room-report__actions">
            <button type="button" className="room-report__cancel" disabled={busy} onClick={closeDialog}>Hủy</button>
            <button type="submit" className="room-report__submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
