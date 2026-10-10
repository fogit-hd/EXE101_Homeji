import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getMyInvitations, RoommateInvitationStatus, type RoommateInvitation } from '../../api'
import {
  getMyRoommateProfile, inviteRoommate, RoommateIntent, searchRoommates, updateMyRoommateProfile,
  type RoommateDirectory, type RoommateDiscoveryProfile,
} from '../../api/roommateDiscovery'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice, petPreferenceLabel, sleepHabitLabel, smokingPreferenceLabel } from '../../lib/labels'
import { reconcileRoommateInvitations, upsertRoommateInvitation } from './roommateInvitationState'
import './RoommatePeople.css'

const INTENTS = [
  { value: RoommateIntent.SeekingAccommodation, label: 'Đang tìm phòng', description: 'Tìm người cùng tìm và thuê phòng.' },
  { value: RoommateIntent.HasAccommodation, label: 'Đã có chỗ ở', description: 'Tìm bạn ghép vào chỗ đang ở, không cần sở hữu phòng.' },
]
const EMPTY_PROFILE: RoommateDiscoveryProfile = { intent: RoommateIntent.SeekingAccommodation, isDiscoverable: false, introduction: '' }

export function RoommatePeople({ onViewInvitations }: { onViewInvitations: () => void }) {
  const [preferences, setPreferences] = useState<RoommateDiscoveryProfile>(EMPTY_PROFILE)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileReload, setProfileReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [notice, setNotice] = useState('')
  const [keyword, setKeyword] = useState('')
  const [intent, setIntent] = useState('')
  const [query, setQuery] = useState<{ keyword?: string; intent?: RoommateIntent; page: number; pageSize: number }>({ page: 1, pageSize: 12 })
  const [directory, setDirectory] = useState<RoommateDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reload, setReload] = useState(0)
  const [invitations, setInvitations] = useState<RoommateInvitation[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const inviteLock = useRef(false)
  const invitationRevision = useRef(0)
  const invitationMutations = useRef(new Map<string, number>())

  useEffect(() => {
    const controller = new AbortController()
    void getMyRoommateProfile(controller.signal).then(data => {
      if (controller.signal.aborted) return
      setPreferences(data); setProfileReady(true); setProfileError('')
    }).catch(reason => {
      if (!controller.signal.aborted) setProfileError(getErrorMessage(reason, 'Không tải được nhu cầu ở ghép.'))
    })
    return () => controller.abort()
  }, [profileReload])

  useEffect(() => {
    const controller = new AbortController()
    const snapshotRevision = invitationRevision.current
    async function load() {
      setLoading(true); setError('')
      try {
        const [data, pending] = await Promise.all([searchRoommates(query, controller.signal), getMyInvitations()])
        if (!controller.signal.aborted) {
          setDirectory(data)
          setInvitations(current => reconcileRoommateInvitations(pending, current, snapshotRevision, invitationMutations.current))
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(getErrorMessage(reason, 'Không tải được danh sách tìm bạn.'))
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [query, reload])

  async function savePreferences(event: FormEvent) {
    event.preventDefault()
    if (saveLock.current || !profileReady) return
    saveLock.current = true; setSaving(true); setProfileError(''); setNotice('')
    try {
      setPreferences(await updateMyRoommateProfile({ ...preferences, introduction: preferences.introduction?.trim() || null }))
      setNotice(preferences.isDiscoverable ? 'Đã lưu. Người dùng tìm bạn có thể thấy hồ sơ bạn.' : 'Đã lưu. Hồ sơ bạn đang ẩn khỏi Tìm bạn.')
      setReload(value => value + 1)
    } catch (reason) { setProfileError(getErrorMessage(reason, 'Không lưu được nhu cầu. Vui lòng thử lại.')) }
    finally { saveLock.current = false; setSaving(false) }
  }

  async function sendInvitation(userId: string) {
    if (inviteLock.current) return
    inviteLock.current = true; setSendingId(userId); setActionError(''); setNotice('')
    try {
      const created = await inviteRoommate(userId)
      invitationRevision.current += 1
      invitationMutations.current.set(created.id, invitationRevision.current)
      setInvitations(previous => upsertRoommateInvitation(previous, created))
      setNotice(created.status === RoommateInvitationStatus.Accepted
        ? 'Bạn và người này đã kết nối. Mở Lời mời để tiếp tục nhắn tin.'
        : 'Đã gửi lời mời. Bạn có thể nhắn tin sau khi người nhận chấp nhận.')
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'Không gửi được lời mời. Vui lòng thử lại.'))
      setReload(value => value + 1)
    } finally { inviteLock.current = false; setSendingId(null) }
  }

  return <section className="roommate-people" aria-label="Tìm bạn theo nhu cầu và lối sống">
    <header><h2>Tìm người cùng ở</h2><p>Kết nối trước khi chọn phòng, hoặc tìm bạn ghép vào chỗ đang ở.</p></header>
    <form className="roommate-people__profile" onSubmit={event => void savePreferences(event)}>
      <fieldset disabled={!profileReady || saving}>
        <legend>Nhu cầu của bạn</legend>
        <div className="roommate-people__intents">{INTENTS.map(option => <label key={option.value}>
          <input type="radio" name="roommate-intent" value={option.value} checked={preferences.intent === option.value}
            onChange={() => setPreferences(previous => ({ ...previous, intent: option.value }))} />
          <span><strong>{option.label}</strong><small>{option.description}</small></span>
        </label>)}</div>
        <label className="roommate-people__introduction">Giới thiệu ngắn
          <textarea maxLength={600} rows={3} value={preferences.introduction ?? ''} placeholder="Bạn muốn sống cùng người như thế nào?"
            onChange={event => setPreferences(previous => ({ ...previous, introduction: event.target.value }))} />
        </label>
        <label className="roommate-people__consent"><input type="checkbox" checked={preferences.isDiscoverable}
          onChange={event => setPreferences(previous => ({ ...previous, isDiscoverable: event.target.checked }))} />
          <span>Cho phép hiển thị tên, trường, khu vực, ngân sách, lối sống và giới thiệu trong Tìm bạn. Bạn có thể tắt bất cứ lúc nào.</span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu nhu cầu'}</button>
      </fieldset>
      {!profileReady && !profileError ? <p role="status">Đang tải nhu cầu của bạn…</p> : null}
      {profileError ? <div role="alert"><p className="roommate-workspace__error">{profileError}</p>{!profileReady ? <button type="button" className="btn btn-secondary" onClick={() => setProfileReload(value => value + 1)}>Thử tải lại</button> : null}</div> : null}
    </form>
    <form className="roommate-workspace__filters" onSubmit={event => {
      event.preventDefault(); setQuery({ keyword: keyword.trim() || undefined, intent: intent ? Number(intent) as RoommateIntent : undefined, page: 1, pageSize: 12 })
    }}>
      <label>Trường, đường hoặc khu vực<input className="form-input" value={keyword} maxLength={150} placeholder="Ví dụ: UEL, Võ Văn Ngân…" onChange={event => setKeyword(event.target.value)} /></label>
      <label>Nhu cầu<select className="form-input" value={intent} onChange={event => setIntent(event.target.value)}><option value="">Tất cả</option>{INTENTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button className="btn btn-secondary" type="submit">Tìm bạn</button>
    </form>
    {notice ? <p role="status" className="roommate-people__notice">{notice}</p> : null}
    {actionError ? <p role="alert" className="roommate-workspace__error">{actionError}</p> : null}
    {error ? <div role="alert"><p className="roommate-workspace__error">{error}</p><button className="btn btn-secondary" type="button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div> : null}
    {loading ? <p role="status">Đang tìm người cùng ở…</p> : !error && directory ? <>
      <p aria-live="polite">{directory.totalCount} người đang mở kết nối</p>
      {directory.items.length === 0 ? <p>Chưa có hồ sơ phù hợp. Thử trường hoặc đường gần đó, hoặc đổi nhu cầu.</p> : <div className="roommate-people__grid">{directory.items.map(person => {
        const existing = invitations.find(invitation => (invitation.senderId === person.userId || invitation.receiverId === person.userId) &&
          (invitation.status === RoommateInvitationStatus.Pending || invitation.status === RoommateInvitationStatus.Accepted))
        return <article className="roommate-people__person" key={person.userId}>
          <div className="roommate-people__person-header"><span className="roommate-people__avatar" aria-hidden="true">{person.displayName.slice(0, 1)}</span><div><h3>{person.displayName}</h3><span>{INTENTS.find(option => option.value === person.intent)?.label}</span></div></div>
          {person.introduction ? <p className="roommate-people__bio">{person.introduction}</p> : null}
          <dl><div><dt>Trường</dt><dd>{person.school || 'Chưa cập nhật'}</dd></div><div><dt>Khu vực</dt><dd>{person.preferredArea || 'Chưa cập nhật'}</dd></div><div><dt>Ngân sách/tháng</dt><dd>{person.maxBudget != null ? formatPrice(person.maxBudget) : 'Chưa cập nhật'}</dd></div></dl>
          <ul className="roommate-people__habits"><li>{sleepHabitLabel[person.sleepHabit]}</li><li>{petPreferenceLabel[person.petPreference]}</li><li>{smokingPreferenceLabel[person.smokingPreference]}</li></ul>
          <p className="roommate-people__score">{person.compatibilityScore != null ? `${person.compatibilityScore}% tương đồng lối sống đã khai báo` : 'Chưa đủ thông tin để so sánh lối sống'}</p>
          {existing ? <button type="button" className="btn btn-secondary" onClick={onViewInvitations}>{existing.status === RoommateInvitationStatus.Accepted ? 'Xem kết nối' : 'Xem lời mời đang chờ'}</button>
            : <button type="button" className="btn btn-primary" disabled={sendingId !== null} onClick={() => void sendInvitation(person.userId)}>{sendingId === person.userId ? 'Đang gửi…' : 'Mời kết nối'}</button>}
        </article>
      })}</div>}
      <nav aria-label="Trang tìm bạn" className="roommate-workspace__pagination"><button type="button" className="btn btn-secondary" disabled={query.page === 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Trang trước</button><span>Trang {query.page}</span><button type="button" className="btn btn-secondary" disabled={query.page * query.pageSize >= directory.totalCount} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Trang sau</button></nav>
    </> : null}
  </section>
}
