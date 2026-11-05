import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getSavedPosts, savePost, unsavePost } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useAuthModal } from '../contexts/AuthModalContext.logic'
import { getErrorMessage } from '../lib/errors'

/** Reused by the imported native preview and its standard detail modal. */
export function useRentalPostSave(postId: string) {
  const { isAuthenticated, profile } = useAuth()
  const { openAuthModal } = useAuthModal()
  const viewer = `${isAuthenticated ? 'member' : 'guest'}:${profile?.id ?? ''}:${postId}`
  const [snapshot, setSnapshot] = useState({ viewer: '', saved: false })
  const [action, setAction] = useState({ viewer: '', busy: false, error: '' })
  const epoch = useRef(0)
  const mutating = useRef(false)
  useLayoutEffect(() => { epoch.current++; mutating.current = false }, [viewer])
  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    const current = epoch.current
    const refresh = () => {
      void getSavedPosts(controller.signal).then(rows => {
        if (!controller.signal.aborted && current === epoch.current && !mutating.current) setSnapshot({ viewer, saved: rows.some(row => row.id === postId) })
      }).catch(() => { /* Saving remains available when the optional saved-list read fails. */ })
    }
    refresh()
    window.addEventListener('homeji:saved-posts-changed', refresh)
    return () => { controller.abort(); window.removeEventListener('homeji:saved-posts-changed', refresh) }
  }, [isAuthenticated, postId, viewer])
  const saved = snapshot.viewer === viewer && snapshot.saved
  async function toggle() {
    if (!isAuthenticated) { openAuthModal({ intent: 'save' }); return }
    if (mutating.current) return
    const current = epoch.current
    mutating.current = true; setAction({ viewer, busy: true, error: '' })
    try {
      if (saved) await unsavePost(postId)
      else await savePost(postId)
      if (current === epoch.current) setSnapshot({ viewer, saved: !saved })
      if (current === epoch.current) setAction({ viewer, busy: false, error: '' })
    } catch (reason) {
      if (current === epoch.current) setAction({ viewer, busy: false, error: getErrorMessage(reason, 'Chưa cập nhật được tin đã lưu. Bạn thử lại.') })
    } finally { if (current === epoch.current) mutating.current = false }
  }
  return { saved, busy: action.viewer === viewer && action.busy, error: action.viewer === viewer ? action.error : '', toggle }
}
