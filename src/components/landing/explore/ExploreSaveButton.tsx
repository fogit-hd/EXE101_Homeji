import { useState, type SyntheticEvent } from 'react'
import { savePost, unsavePost } from '../../../api'
import { useAuth } from '../../../contexts/AuthContext'
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getErrorMessage } from '../../../lib/errors'
import { useToast } from '../../toast/useToast'

type Props = {
  postId: string
  title: string
  saved: boolean
  onSavedChange: (postId: string, saved: boolean) => void
}

const SAVE_FAILED = 'Chưa lưu được phòng. Vui lòng thử lại.'

/** Logic khớp ListingSaveButton cũ; CSS riêng cho explore. */
export function ExploreSaveButton({ postId, title, saved, onSavedChange }: Props) {
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const isolate = (event: SyntheticEvent) => event.stopPropagation()

  const toggle = async () => {
    if (busy) return
    if (!isAuthenticated) {
      openAuthModal({
        intent: 'save',
        onSuccess: () => {
          savePost(postId)
            .then(() => toast.push(`Đã lưu “${title}”. Xem lại trong mục Đã lưu.`, 'success'))
            .catch((error: unknown) => toast.push(getErrorMessage(error, SAVE_FAILED), 'error'))
        },
      })
      return
    }
    setBusy(true)
    try {
      if (saved) await unsavePost(postId)
      else await savePost(postId)
      onSavedChange(postId, !saved)
    } catch (error) {
      toast.push(getErrorMessage(error, saved ? 'Chưa bỏ lưu được phòng. Vui lòng thử lại.' : SAVE_FAILED), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className="explore-card__save"
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu phòng: ${title}` : `Lưu phòng: ${title}`}
      disabled={busy}
      data-glass-exclude
      onPointerDown={isolate}
      onContextMenu={isolate}
      onClick={() => void toggle()}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
