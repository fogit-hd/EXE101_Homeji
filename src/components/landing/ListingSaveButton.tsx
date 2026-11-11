import { useState, type SyntheticEvent } from 'react'
import { savePost, unsavePost } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext.logic'
import { useToast } from '../toast/useToast'
import { getErrorMessage } from '../../lib/errors'

type Props = {
  postId: string
  title: string
  saved: boolean
  onSavedChange: (postId: string, saved: boolean) => void
}

const SAVE_FAILED = 'Chưa lưu được phòng. Vui lòng thử lại.'

/** Heart toggle on a listing card. Guests sign in first; the room is saved as soon as they are back. */
export function ListingSaveButton({ postId, title, saved, onSavedChange }: Props) {
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  // Keep presses on the heart away from the card's long-press wheel and right-click menu.
  const isolate = (event: SyntheticEvent) => event.stopPropagation()

  const toggle = async () => {
    if (busy) return
    if (!isAuthenticated) {
      // After login the landing gives way to the signed-in map, so this card may be gone by then.
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
      className="guest-preview__save"
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu phòng: ${title}` : `Lưu phòng: ${title}`}
      disabled={busy}
      data-glass-exclude
      onPointerDown={isolate}
      onContextMenu={isolate}
      onClick={() => void toggle()}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
