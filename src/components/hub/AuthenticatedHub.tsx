import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getConversations,
  getMyActivities,
  getMyInvitations,
  getNotifications,
  getRoommateCandidates,
  getSavedPosts,
  getViewingAppointments,
  searchMarketplacePosts,
  searchRentalPosts,
  NotificationType,
  RentalPostType,
  UserActivityType,
  ViewingAppointmentStatus,
  type MarketplacePost,
  type Notification,
  type PostConversation,
  type RentalPostSummary,
  type RoommateCandidate,
  type RoommateInvitation,
  type UserActivity,
  type ViewingAppointment,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, rentalPostTypeLabel } from '../../lib/labels'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { isUsefulSearchQuery } from '../../lib/searchQuery'
import { exploreListUrl } from '../chrome'
import './AuthenticatedHub.css'

const RECENT_SEARCH_KEY = 'homeji:map-search-recent'

type Bundle = {
  notifications: Notification[]
  appointments: ViewingAppointment[]
  conversations: PostConversation[]
  saved: RentalPostSummary[]
  invitations: RoommateInvitation[]
  activities: UserActivity[]
  candidates: RoommateCandidate[]
  market: MarketplacePost[]
  rooms: RentalPostSummary[]
  loadedAt: number
  failed: {
    rooms: boolean
    appointments: boolean
    conversations: boolean
    market: boolean
    notifications: boolean
    activities: boolean
  }
}

function greetingPrefix(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function dateLabel(now: Date): string {
  return now
    .toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase()
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function appointmentStatus(status: ViewingAppointmentStatus): string {
  if (status === ViewingAppointmentStatus.Confirmed) return 'Đã xác nhận'
  if (status === ViewingAppointmentStatus.Pending) return 'Chờ xác nhận'
  if (status === ViewingAppointmentStatus.Cancelled) return 'Đã hủy'
  if (status === ViewingAppointmentStatus.Completed) return 'Đã xem'
  return 'Đã cập nhật'
}

function messagePreview(body: string | null): string {
  const text = body?.trim()
  if (!text) return 'Chưa có tin nhắn'
  const kept = text
    .split('\n')
    .filter((line) => line.trim() !== '[homeji:location]' && !/^(type|title|address|lat|lng|url)=/.test(line.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return kept || 'Đã chia sẻ vị trí'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ keyword?: string }>
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const words: string[] = []
    for (const item of parsed) {
      const keyword = item?.keyword?.trim()
      if (!keyword || !isUsefulSearchQuery(keyword) || seen.has(keyword)) continue
      seen.add(keyword)
      words.push(keyword)
      if (words.length === 4) break
    }
    return words
  } catch {
    return []
  }
}

export function AuthenticatedHub() {
  const { profile } = useAuth()
  const displayName = profile?.displayName?.trim() || 'bạn'
  const [now] = useState(() => new Date())
  const [recentSearches] = useState(readRecentSearches)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [notify, appoint, chats, savedPosts, invites, activity, rooms, market] = await Promise.allSettled([
        getNotifications(true),
        getViewingAppointments(),
        getConversations(),
        getSavedPosts(),
        getMyInvitations(),
        getMyActivities({ take: 30 }),
        searchRentalPosts({ pageSize: 3 }),
        searchMarketplacePosts({ pageSize: 2 }),
      ])
      if (cancelled) return
      const saved = savedPosts.status === 'fulfilled' ? savedPosts.value : []
      const roommatePost = saved.find((post) => post.type === RentalPostType.RoommateShare)
      let candidates: RoommateCandidate[] = []
      if (roommatePost) {
        try {
          candidates = await getRoommateCandidates(roommatePost.id)
        } catch {
          candidates = []
        }
      }
      if (cancelled) return
      const failed = [notify, appoint, chats, savedPosts, invites, activity, rooms, market].every(
        (result) => result.status === 'rejected',
      )
      if (failed) {
        setPhase('error')
        setBundle(null)
        return
      }
      setBundle({
        notifications: notify.status === 'fulfilled' ? notify.value : [],
        appointments: appoint.status === 'fulfilled' ? appoint.value : [],
        conversations: chats.status === 'fulfilled' ? chats.value : [],
        saved,
        invitations: invites.status === 'fulfilled' ? invites.value : [],
        activities: activity.status === 'fulfilled' ? activity.value : [],
        candidates: candidates.slice(0, 3),
        market: market.status === 'fulfilled' ? market.value : [],
        rooms: rooms.status === 'fulfilled' ? rooms.value : [],
        loadedAt: Date.now(),
        failed: {
          rooms: rooms.status === 'rejected',
          appointments: appoint.status === 'rejected',
          conversations: chats.status === 'rejected',
          market: market.status === 'rejected',
          notifications: notify.status === 'rejected',
          activities: activity.status === 'rejected',
        },
      })
      setPhase('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const savedIds = useMemo(
    () => new Set((bundle?.saved ?? []).map((post) => post.id)),
    [bundle],
  )

  const upcoming = useMemo(() => {
    if (!bundle) return []
    return bundle.appointments
      .filter(
        (item) =>
          item.status === ViewingAppointmentStatus.Pending ||
          item.status === ViewingAppointmentStatus.Confirmed,
      )
      .filter((item) => new Date(item.scheduledAt).getTime() >= bundle.loadedAt - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 2)
  }, [bundle])

  const chats = (bundle?.conversations ?? []).slice(0, 3)
  const unreadMessages = (bundle?.conversations ?? []).reduce((sum, item) => sum + item.unreadCount, 0)
  const savedAlerts = (bundle?.notifications ?? []).filter(
    (item) => item.type === NotificationType.SavedPostChanged,
  ).slice(0, 2)
  const matchingNotes = (bundle?.notifications ?? []).filter(
    (item) => item.type === NotificationType.NewMatchingRentalPost,
  )
  const viewed = (bundle?.activities ?? []).some((item) => item.type === UserActivityType.ViewedRentalPost)
  const contacted = (bundle?.conversations.length ?? 0) > 0
    || (bundle?.activities ?? []).some((item) => item.type === UserActivityType.SentMessage)
  const booked = (bundle?.appointments.length ?? 0) > 0
  const savedAny = (bundle?.saved.length ?? 0) > 0

  const lead = matchingNotes.length > 0
    ? `${matchingNotes.length} tin mới khớp tìm kiếm của bạn.`
    : 'Tiếp tục hành trình tìm một nơi ở vừa ngân sách, vừa đúng nhịp sống của bạn.'
  const progressSteps = [savedAny, contacted, booked, !bundle?.failed.activities && viewed].filter(Boolean).length
  const progressTotal = bundle?.failed.activities ? 3 : 4

  return (
    <div className="hub-home">
      <header className="hub-welcome">
        <div>
          <p className="hub-welcome__date">{dateLabel(now)}</p>
          <h1>{greetingPrefix(now.getHours())}, {displayName}</h1>
          <p className="hub-welcome__lead">{lead}</p>
        </div>
        <Link className="hub-welcome__cta" to="/posts/new">Đăng tin phòng</Link>
      </header>

      <section className="hub-banner" aria-labelledby="hub-banner-title">
        <div>
          <span>Một nơi ở · Nhiều kết nối</span>
          <h2 id="hub-banner-title">Ở đúng nơi, sống đúng gu.</h2>
          <p>Tìm phòng vừa túi tiền, khám phá tiện ích quanh nhà và kết nối với bạn ở ghép.</p>
        </div>
        <Link to={exploreListUrl()}>Khám phá phòng <span aria-hidden="true">→</span></Link>
      </section>

      <section className="hub-search" aria-label="Tìm kiếm gần đây">
        <h2>Tiếp tục tìm kiếm</h2>
        {recentSearches.length > 0 ? (
          <>
            <p>{recentSearches[0]}</p>
            <Link to={exploreListUrl(new URLSearchParams({ keyword: recentSearches[0]! }))}>Tiếp tục</Link>
          </>
        ) : (
          <p>Chưa có tìm kiếm để tiếp tục.</p>
        )}
      </section>

      {phase === 'loading' ? (
        <div className="hub-skel" aria-busy="true" aria-label="Đang tải trang chủ">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="hub-error" role="alert">
          <p>Không tải được nội dung trang chủ.</p>
          <button type="button" onClick={() => { setPhase('loading'); setReloadKey((value) => value + 1) }}>Thử lại</button>
        </div>
      ) : null}

      {phase === 'ready' && bundle ? (
        <>
          <section className="hub-card hub-viewings" aria-labelledby="hub-viewings">
            <header>
              <h2 id="hub-viewings">Lịch xem phòng sắp tới</h2>
              <Link to={mapSectionUrl('appointments')}>
                {upcoming.length > 0 ? `${upcoming.length} lịch` : 'Xem lịch'}
              </Link>
            </header>
            {bundle.failed.appointments ? <p className="hub-quiet">Không tải được lịch xem.</p> : null}
            {!bundle.failed.appointments && upcoming.length === 0 ? <p className="hub-quiet">Chưa có buổi xem nào sắp tới.</p> : null}
            <ul>
              {upcoming.map((item) => (
                <li key={item.id}>
                  <time dateTime={item.scheduledAt}>{clock(item.scheduledAt)}</time>
                  <div>
                    <strong>{item.rentalPostTitle}</strong>
                    {item.note?.trim() ? <span>{item.note.trim()}</span> : null}
                  </div>
                  <em>{appointmentStatus(item.status)}</em>
                </li>
              ))}
            </ul>
          </section>

          <section className="hub-card hub-messages" aria-labelledby="hub-messages">
            <header>
              <h2 id="hub-messages">Tin nhắn gần đây</h2>
              <Link to={mapSectionUrl('messages')}>
                {unreadMessages > 0 ? `${unreadMessages} mới` : 'Mở hộp thư'}
              </Link>
            </header>
            {bundle.failed.conversations ? <p className="hub-quiet">Không tải được tin nhắn.</p> : null}
            {!bundle.failed.conversations && chats.length === 0 ? <p className="hub-quiet">Chưa có hội thoại.</p> : null}
            <ul>
              {chats.map((chat) => (
                <li key={chat.id}>
                  <Link to={mapSectionUrl('messages')}>
                    {chat.otherParticipantAvatarPath ? (
                      <img src={chat.otherParticipantAvatarPath} alt="" />
                    ) : (
                      <b>{initials(chat.otherParticipantName)}</b>
                    )}
                    <span>
                      <strong>{chat.otherParticipantName}</strong>
                      <em>{messagePreview(chat.lastMessage)}</em>
                    </span>
                    <small>
                      {whenLabel(chat.updatedAt)}
                      {chat.unreadCount > 0 ? <i>{chat.unreadCount}</i> : null}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="hub-rooms" aria-labelledby="hub-rooms">
            <header>
              <div>
                <h2 id="hub-rooms">Phòng đang mở</h2>
                <p>Tin đang mở trên Homeji</p>
              </div>
              {savedAlerts[0] ? (
                <Link to={mapSectionUrl('notifications')}>{savedAlerts[0].title}</Link>
              ) : (
                <Link to={exploreListUrl()}>Xem tất cả</Link>
              )}
            </header>
            {bundle.failed.rooms ? <p className="hub-quiet">Không tải được phòng.</p> : null}
            {!bundle.failed.rooms && bundle.rooms.length === 0 ? <p className="hub-quiet">Chưa có phòng để gợi ý.</p> : null}
            <ul>
              {bundle.rooms.map((post) => (
                <li key={post.id}>
                  <Link to={`/?post=${encodeURIComponent(post.id)}`}>
                    <span className="hub-photo">
                      {post.thumbnailPath ? (
                        <img
                          src={post.thumbnailPath}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.hidden = true
                          }}
                        />
                      ) : null}
                      Chưa có ảnh
                    </span>
                    {savedIds.has(post.id) ? <em>Đã lưu</em> : null}
                    <strong>{formatPrice(post.price)}</strong>
                    <b>{post.title}</b>
                    <span>{post.address}</span>
                    <small>
                      {post.area > 0 ? `${post.area} m² · ` : ''}
                      {rentalPostTypeLabel[post.type]}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="hub-card hub-progress" aria-labelledby="hub-progress">
            <h2 id="hub-progress">Hành trình tìm nhà</h2>
            <p className="hub-progress__ratio">{progressSteps}/{progressTotal}</p>
            <div className="hub-progress__track" aria-hidden>
              <span style={{ width: `${Math.round((progressSteps / progressTotal) * 100)}%` }} />
            </div>
            <ul>
              <li className={savedAny ? 'is-done' : ''}>{savedAny ? 'Đã lưu phòng' : 'Chưa lưu phòng'}</li>
              <li className={contacted ? 'is-done' : ''}>{contacted ? 'Đã liên hệ' : 'Chưa nhắn tin'}</li>
              <li className={booked ? 'is-done' : ''}>{booked ? 'Đã đặt lịch xem' : 'Chưa đặt lịch xem'}</li>
              <li className={viewed ? 'is-done' : ''}>
                {bundle.failed.activities ? 'Chưa rõ lượt xem tin' : viewed ? 'Đã xem tin' : 'Chưa có lượt xem tin'}
              </li>
            </ul>
          </section>

          {bundle.candidates.length > 0 ? (
            <section className="hub-card hub-roommates" aria-labelledby="hub-roommates">
              <h2 id="hub-roommates">Ở ghép</h2>
              <ul>
                {bundle.candidates.map((person) => (
                  <li key={person.userId}>
                    <strong>{person.displayName}</strong>
                    {person.preferredArea ? <span>{person.preferredArea}</span> : null}
                    {Number.isFinite(person.matchScore) ? <em>{person.matchScore}%</em> : null}
                  </li>
                ))}
              </ul>
              <Link to={mapSectionUrl('invitations')}>Xem lời mời</Link>
            </section>
          ) : bundle.invitations.length > 0 ? (
            <section className="hub-card hub-roommates" aria-labelledby="hub-roommates">
              <h2 id="hub-roommates">Ở ghép</h2>
              <p>{bundle.invitations.length} lời mời đang mở.</p>
              <Link to={mapSectionUrl('invitations')}>Xem lời mời</Link>
            </section>
          ) : null}

          {bundle.failed.market ? (
            <section className="hub-card hub-market hub-market--quiet" aria-labelledby="hub-market">
              <h2 id="hub-market">Chợ đồ khu phố</h2>
              <p>Không tải được món quanh khu phố.</p>
            </section>
          ) : bundle.market.length > 0 ? (
            <section className="hub-market" aria-labelledby="hub-market">
              <p>Chợ đồ khu phố</p>
              <h2 id="hub-market">{bundle.market[0]!.title}</h2>
              <ul>
                {bundle.market.map((item) => (
                  <li key={item.id}>{item.title} · {formatPrice(item.price)}</li>
                ))}
              </ul>
              <Link to={mapSectionUrl('marketplace')}>Dạo chợ đồ</Link>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
