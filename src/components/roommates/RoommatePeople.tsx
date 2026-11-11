import { ChoicePicker } from '../ui/ChoicePicker'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getMyInvitations, RoommateInvitationStatus, UserRole, type RoommateInvitation } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import {
  getMyRoommateProfile, inviteRoommate, RoommateIntent, searchRoommates, updateMyRoommateProfile,
  type RoommateDirectory, type RoommateDiscoveryProfile, type RoommatePerson,
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

function extractGenderPreference(text?: string | null): 'female' | 'male' | 'any' {
  if (!text) return 'any'
  const lower = text.toLowerCase()
  const isFemale = /(nữ|bạn nữ|tìm nữ|chỉ nữ|con gái)/i.test(lower)
  const isMale = /(nam|bạn nam|tìm nam|chỉ nam|con trai)/i.test(lower)
  if (isFemale && !isMale) return 'female'
  if (isMale && !isFemale) return 'male'
  return 'any'
}

function normalizeDistrict(text?: string | null): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/\b(thành phố|tp\.?|quận|huyện|q\.?)\b/gi, '')
    .trim()
}

function computeRoommateCompatibility(
  myProfile: ReturnType<typeof useAuth>['profile'],
  person: RoommatePerson,
) {
  let score = person.compatibilityScore ?? 75
  const reasons: string[] = []

  if (myProfile) {
    let points = 0
    let totalWeight = 0

    // 1. Giới tính & tiêu chí ở ghép (Gender match) - weight 15
    totalWeight += 15
    const myGender = extractGenderPreference(`${myProfile.rentalNeed || ''} ${myProfile.displayName || ''}`)
    const theirGender = extractGenderPreference(`${person.introduction || ''} ${person.displayName || ''}`)

    if (myGender !== 'any' && theirGender !== 'any') {
      if (myGender === theirGender) {
        points += 15
        reasons.push(myGender === 'female' ? 'Phù hợp tiêu chí ở ghép Nữ' : 'Phù hợp tiêu chí ở ghép Nam')
      } else {
        points += 3
      }
    } else if (myGender !== 'any' || theirGender !== 'any') {
      points += 12
      const matched = myGender !== 'any' ? (myGender === 'female' ? 'Nữ' : 'Nam') : (theirGender === 'female' ? 'Nữ' : 'Nam')
      reasons.push(`Tiêu chí giới tính hòa hợp (${matched})`)
    } else {
      points += 12
    }

    // 2. Ngân sách thuê phòng (Budget) - weight 20
    totalWeight += 20
    if (myProfile.maxBudget && person.maxBudget) {
      const diff = Math.abs(myProfile.maxBudget - person.maxBudget)
      if (diff <= 500000) {
        points += 20
        reasons.push(`Ngân sách tương đương (~${formatPrice(person.maxBudget)})`)
      } else if (diff <= 1500000) {
        points += 15
        reasons.push('Khoảng giá thuê phù hợp')
      } else {
        points += 6
      }
    } else {
      points += 14
    }

    // 3. Quận / Khu vực mong muốn & Trường học (Location / School) - weight 20
    totalWeight += 20
    const myArea = normalizeDistrict(myProfile.preferredArea)
    const theirArea = normalizeDistrict(person.preferredArea)
    const mySchool = (myProfile.school || '').trim().toLowerCase()
    const theirSchool = (person.school || '').trim().toLowerCase()

    if (myArea && theirArea && (myArea.includes(theirArea) || theirArea.includes(myArea))) {
      points += 20
      reasons.push(`Cùng khu vực mong muốn (${person.preferredArea})`)
    } else if (mySchool && theirSchool && (mySchool.includes(theirSchool) || theirSchool.includes(mySchool))) {
      points += 16
      reasons.push(`Cùng trường học (${person.school})`)
    } else {
      points += 10
    }

    // 4. Thói quen giờ giấc (Sleep) - weight 15
    totalWeight += 15
    if (myProfile.sleepHabit && person.sleepHabit) {
      if (myProfile.sleepHabit === person.sleepHabit) {
        points += 15
        reasons.push(`Giờ giấc tương đồng (${sleepHabitLabel[person.sleepHabit]})`)
      } else {
        points += 5
      }
    } else {
      points += 10
    }

    // 5. Nuôi thú cưng (Pet) - weight 15
    totalWeight += 15
    if (myProfile.petPreference && person.petPreference) {
      if (myProfile.petPreference === person.petPreference) {
        points += 15
        reasons.push(`Quan điểm thú cưng hòa hợp (${petPreferenceLabel[person.petPreference]})`)
      } else {
        points += 5
      }
    } else {
      points += 10
    }

    // 6. Hút thuốc (Smoking) - weight 15
    totalWeight += 15
    if (myProfile.smokingPreference && person.smokingPreference) {
      if (myProfile.smokingPreference === person.smokingPreference) {
        points += 15
        if (person.smokingPreference === 1) {
          reasons.push('Cùng không hút thuốc')
        } else {
          reasons.push(`Thói quen hút thuốc tương đồng (${smokingPreferenceLabel[person.smokingPreference]})`)
        }
      } else {
        points += 0
      }
    } else {
      points += 10
    }

    const calculated = Math.round((points / totalWeight) * 100)
    score = Math.max(50, Math.min(98, calculated))
  } else {
    if (person.compatibilityScore) {
      score = person.compatibilityScore
    }
    if (person.smokingPreference === 1) {
      reasons.push('Không hút thuốc')
    }
    if (person.preferredArea) {
      reasons.push(`Khu vực ${person.preferredArea}`)
    }
    if (person.maxBudget) {
      reasons.push(`Ngân sách ~${formatPrice(person.maxBudget)}`)
    }
  }

  const tier = score >= 85 ? 'high' : score >= 70 ? 'medium' : 'normal'
  const tierLabel = score >= 85 ? 'Rất phù hợp' : score >= 70 ? 'Phù hợp' : 'Cơ bản'

  return { score, reasons, tier, tierLabel }
}

export function RoommatePeople({ onViewInvitations }: { onViewInvitations: () => void }) {
  const { profile } = useAuth()
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
        const [data, pending] = await Promise.all([searchRoommates(query, controller.signal), profile?.role === UserRole.Renter ? getMyInvitations() : Promise.resolve([])])
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
  }, [query, reload, profile?.id, profile?.role])

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
    <header><h2>Tìm người cùng ở</h2><a href="#roommate-discovery-settings">Hồ sơ tìm bạn của tôi</a><p>Kết nối trước khi chọn phòng, hoặc tìm bạn ghép vào chỗ đang ở.</p></header>
    <form className="roommate-people__profile" id="roommate-discovery-settings" data-glass-exclude onSubmit={event => void savePreferences(event)}>
      <fieldset disabled={!profileReady || saving}>
        <legend>Nhu cầu của bạn</legend>
        <div className="roommate-people__intents">{INTENTS.map(option => <label key={option.value}>
          <input type="radio" name="roommate-intent" value={option.value} checked={preferences.intent === option.value}
            onChange={() => setPreferences(previous => ({ ...previous, intent: option.value }))} />
          <span><strong>{option.label}</strong><small>{option.description}</small></span>
        </label>)}</div>
        <label className="roommate-people__introduction">Giới thiệu ngắn
          <textarea maxLength={600} rows={3} value={preferences.introduction ?? ''} placeholder="Ví dụ: Nữ sinh viên năm 2 tìm bạn nữ ở cùng quanh SPKT, sạch sẽ, ngủ trước 23h, không hút thuốc..."
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
      <label>Nhu cầu<ChoicePicker className="form-input" value={intent} onChange={event => setIntent(event.target.value)}><option value="">Tất cả</option>{INTENTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</ChoicePicker></label>
      <button className="btn btn-secondary" type="submit">Tìm bạn</button>
    </form>
    {notice ? <p role="status" className="roommate-people__notice">{notice}</p> : null}
    {actionError ? <p role="alert" className="roommate-workspace__error">{actionError}</p> : null}
    {error ? <div role="alert"><p className="roommate-workspace__error">{error}</p><button className="btn btn-secondary" type="button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div> : null}
    {loading ? <p role="status">Đang tìm người cùng ở…</p> : !error && directory ? <>
      <p aria-live="polite">{directory.totalCount} hồ sơ tìm bạn ở ghép</p>
      {directory.items.length === 0 ? <p>Chưa có hồ sơ phù hợp. Thử trường hoặc đường gần đó, hoặc đổi nhu cầu.</p> : <div className="roommate-people__grid">{directory.items.map(person => {
        const existing = invitations.find(invitation => (invitation.senderId === person.userId || invitation.receiverId === person.userId) &&
          (invitation.status === RoommateInvitationStatus.Pending || invitation.status === RoommateInvitationStatus.Accepted))
        const { score, reasons, tier, tierLabel } = computeRoommateCompatibility(profile, person)
        return <article className="roommate-people__person" key={person.userId}>
          <div className="roommate-people__person-header">
            <span className="roommate-people__avatar" aria-hidden="true">{person.displayName.slice(0, 1)}</span>
            <div>
              <h3>{person.displayName}</h3>
              <span>{INTENTS.find(option => option.value === person.intent)?.label}</span>
            </div>
            <div className={`roommate-compat-badge is-${tier}`} title={`${score}% phù hợp lối sống & nhu cầu`}>
              <span className="roommate-compat-score">{score}% Phù hợp</span>
              <span className="roommate-compat-tier">{tierLabel}</span>
            </div>
          </div>
          {person.introduction ? <p className="roommate-people__bio">{person.introduction}</p> : null}
          <dl><div><dt>Trường</dt><dd>{person.school || 'Chưa cập nhật'}</dd></div><div><dt>Khu vực</dt><dd>{person.preferredArea || 'Chưa cập nhật'}</dd></div><div><dt>Ngân sách/tháng</dt><dd>{person.maxBudget != null ? formatPrice(person.maxBudget) : 'Chưa cập nhật'}</dd></div></dl>
          <ul className="roommate-people__habits"><li>{sleepHabitLabel[person.sleepHabit]}</li><li>{petPreferenceLabel[person.petPreference]}</li><li>{smokingPreferenceLabel[person.smokingPreference]}</li></ul>
          {reasons.length > 0 && (
            <ul className="roommate-compat-reasons" aria-label="Điểm hòa hợp">
              {reasons.slice(0, 3).map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
            </ul>
          )}
          <p className="roommate-people__score">{person.compatibilityScore != null ? `${person.compatibilityScore}% tương đồng lối sống đã khai báo` : `${score}% tương đồng theo hồ sơ`}</p>
          {existing ? <button type="button" className="btn btn-secondary" onClick={onViewInvitations}>{existing.status === RoommateInvitationStatus.Accepted ? 'Xem kết nối' : 'Xem lời mời đang chờ'}</button>
            : <button type="button" className="btn btn-primary" disabled={sendingId !== null} onClick={() => void sendInvitation(person.userId)}>{sendingId === person.userId ? 'Đang gửi…' : 'Mời kết nối'}</button>}
        </article>
      })}</div>}
      <nav aria-label="Trang tìm bạn" className="roommate-workspace__pagination"><button type="button" className="btn btn-secondary" disabled={query.page === 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Trang trước</button><span>Trang {query.page}</span><button type="button" className="btn btn-secondary" disabled={query.page * query.pageSize >= directory.totalCount} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Trang sau</button></nav>
    </> : null}
  </section>
}
