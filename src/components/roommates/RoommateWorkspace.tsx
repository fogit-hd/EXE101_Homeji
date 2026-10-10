import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { ProfilePage } from '../../pages/ProfilePage'
import { RoommateInvitationsPage } from '../../pages/RoommateInvitationsPage'
import { RoommateRooms } from './RoommateRooms'
import { RoommatePeople } from './RoommatePeople'
import { MotionTabs } from '../motion/MotionTabs'
import { useTabTransition } from '../motion/useTabTransition'
import './RoommateWorkspace.css'

type Tab = 'people' | 'rooms' | 'invitations'
const TABS: { id: Tab; label: string }[] = [
  { id: 'people', label: 'Tìm bạn' }, { id: 'rooms', label: 'Tin ở ghép' }, { id: 'invitations', label: 'Lời mời' },
]

const TAB_ORDER = TABS.map(item => item.id)

export function RoommateWorkspace({ onOpenConversation }: { onOpenConversation?: (id: string) => void }) {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const raw = params.get('roommateTab')
  const tab: Tab = raw === 'rooms' || raw === 'people' ? raw : 'invitations'
  const panelRef = useTabTransition(tab, TAB_ORDER)
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
    <MotionTabs items={TABS} value={tab} onChange={selectTab} label="Khám phá ở ghép"
      className="roommate-workspace__tabs" idPrefix="roommate-tab" panelId="roommate-panel" />
    <div ref={panelRef} className="roommate-workspace__panel" role="tabpanel" id="roommate-panel" aria-labelledby={`roommate-tab-${tab}`}>
      {tab === 'rooms' ? <RoommateRooms initialKeyword={params.get('roommateQuery')?.slice(0, 200) ?? ''}
        onOpenConversation={onOpenConversation}
        key={`${profile?.id ?? 'guest'}:${profile?.maxBudget ?? 'all'}:${params.get('roommateQuery') ?? ''}`} /> : null}
      {tab === 'people' ? isRenter ? <RoommatePeople onViewInvitations={() => selectTab('invitations')} />
        : <p>Tìm bạn ở ghép dành cho hồ sơ người thuê.</p> : null}
      {tab === 'invitations' ? isRenter ? <RoommateInvitationsPage embedded onOpenConversation={onOpenConversation} />
        : <p>Lời mời ở ghép dành cho hồ sơ người thuê.</p> : null}
    </div>
  </div>
}
