import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { ProfilePage } from '../../pages/ProfilePage'
import { SavedPostsPage } from '../../pages/SavedPostsPage'
import { RoommateInvitationsPage } from '../../pages/RoommateInvitationsPage'
import { RoommateRooms } from './RoommateRooms'
import './RoommateWorkspace.css'

type Tab = 'people' | 'rooms' | 'invitations'
const TABS: { id: Tab; label: string }[] = [
  { id: 'people', label: 'Tìm bạn' }, { id: 'rooms', label: 'Tìm phòng' }, { id: 'invitations', label: 'Lời mời' },
]

export function RoommateWorkspace({ onOpenConversation }: { onOpenConversation?: (id: string) => void }) {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const raw = params.get('roommateTab')
  const tab: Tab = raw === 'rooms' || raw === 'people' ? raw : 'invitations'
  const [editingLifestyle, setEditingLifestyle] = useState(false)
  const isRenter = profile?.role === UserRole.Renter
  const selectTab = (next: Tab) => setParams(previous => { const result = new URLSearchParams(previous); result.set('roommateTab', next); return result })

  return <div className="roommate-workspace">
    {isRenter ? <section className="roommate-workspace__lifestyle">
      <div><h2>Lối sống của bạn</h2><p>Giờ ngủ, thú cưng, hút thuốc, ngân sách và khu vực muốn ở.</p></div>
      <button type="button" className="btn btn-secondary" aria-expanded={editingLifestyle}
        aria-controls="roommate-lifestyle" onClick={() => setEditingLifestyle(open => !open)}>
        {editingLifestyle ? 'Đóng form lối sống' : profile?.onboardingCompleted ? 'Cập nhật lối sống' : 'Nhập lối sống'}
      </button>
      {editingLifestyle ? <div id="roommate-lifestyle"><ProfilePage embedded lifestyleOnly /></div> : null}
    </section> : <p>Hồ sơ người thuê dùng lối sống để tìm người cùng ở và gửi lời mời. Bạn vẫn có thể xem phòng.</p>}
    <div className="roommate-workspace__tabs" role="tablist" aria-label="Khám phá ở ghép">
      {TABS.map(item => <button key={item.id} type="button" role="tab" id={`roommate-tab-${item.id}`}
        aria-selected={tab === item.id} aria-controls={`roommate-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const index = TABS.findIndex(item => item.id === tab)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
          selectTab(TABS[next].id)
          document.getElementById(`roommate-tab-${TABS[next].id}`)?.focus()
        }} onClick={() => selectTab(item.id)}>{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`roommate-panel-${tab}`} aria-labelledby={`roommate-tab-${tab}`}>
      {tab === 'rooms' ? <RoommateRooms key={`${profile?.id ?? 'guest'}:${profile?.maxBudget ?? 'all'}`} /> : null}
      {tab === 'people' ? isRenter ? <>
        <h2>Người cùng quan tâm phòng đã lưu</h2>
        <p>Chọn “Gợi ý người ở ghép” dưới phòng đã lưu để xem độ phù hợp và gửi lời mời. Cả hai cần lưu cùng phòng.</p>
        <SavedPostsPage embedded roommateOnly />
      </> : <p>Tìm bạn ở ghép dành cho hồ sơ người thuê.</p> : null}
      {tab === 'invitations' ? isRenter ? <RoommateInvitationsPage embedded onOpenConversation={onOpenConversation} />
        : <p>Lời mời ở ghép dành cho hồ sơ người thuê.</p> : null}
    </div>
  </div>
}
