import { useSearchParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { SourceRoomDetail } from './SourceRoomDetail'
import { RoomDetailHeader } from './RoomDetailPresentation'
import { sourcePublisherLink } from '../../../lib/sourcePublisherLinks'
import { useRentalPostSave } from '../../../hooks/useRentalPostSave'

const RoomDetailModal = lazy(() => import('./RoomDetailModal').then(module => ({ default: module.RoomDetailModal })))

export function SourceRoomDetailsHost() {
  const [params, setParams] = useSearchParams()
  const id = params.get('source')
  if (!id || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return null
  const close = () => { const next = new URLSearchParams(params); next.delete('source'); setParams(next, { replace: true }) }
  const nativeId = sourcePublisherLink(id)?.nativePostId
  return nativeId ? <LinkedNativeDetail key={nativeId} id={nativeId} onClose={close}
    onOpenSection={(section, conversation) => { const next = new URLSearchParams(params); next.delete('source'); next.delete('post'); next.set('section', section); if (conversation) next.set('conversation', conversation); setParams(next) }} />
    : <SourceRoomDetail key={id} id={id} onClose={close} />
}

function LinkedNativeDetail({ id, onClose, onOpenSection }: { id: string; onClose: () => void; onOpenSection: (section: string, conversation?: string) => void }) {
  const save = useRentalPostSave(id)
  return <Suspense fallback={createPortal(<div className="room-detail__backdrop"><div className="room-detail" role="dialog" aria-modal="true" aria-labelledby="native-detail-loading-title"
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } else if (event.key === 'Tab') event.preventDefault() }}>
    <RoomDetailHeader titleId="native-detail-loading-title" title="Chi tiết phòng trọ" onClose={onClose} autoFocusClose /><p className="room-detail__status" role="status">Đang tải chi tiết phòng…</p>
  </div></div>, document.body)}><RoomDetailModal listingId={id} saved={save.saved} saveBusy={save.busy} saveError={save.error} onClose={onClose}
      onToggleSave={() => { void save.toggle() }} onOpenMessages={conversation => onOpenSection('messages', conversation)}
      onOpenAppointments={() => onOpenSection('appointments')} /></Suspense>
}
