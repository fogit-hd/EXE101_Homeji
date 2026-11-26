import { showHubPremiumBadges } from '../../lib/hubPremiumBadges'
import { isPendingReceivedInvitation } from '../../lib/roommateInvitations'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMyInvitations,
  getNotifications,
  getRoommateCandidates,
  getSavedPosts,
  getViewingAppointments,
  searchMarketplacePosts,
  searchRentalPosts,
  MarketplaceListingType,
  NotificationType,
  RentalPostType,
  UserRole,
  ViewingAppointmentStatus,
  type MarketplacePost,
  type Notification,
  type RentalPostSummary,
  type RoommateCandidate,
  type RoommateInvitation,
  type ViewingAppointment,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useConversationInbox } from '../../hooks/useConversationInbox'
import { useRentalJourney } from '../../contexts/rental-journey'
import { HeartIcon } from '../icons/SvgIcons'
import { formatPrice, formatCompactRent, formatListingArea } from '../../lib/labels'
import { mapMessagesUrl, mapSectionUrl, ROOMMATE_INVITATIONS_URL } from '../../lib/mapDeepLinks'
import { marketplaceItemUrl } from '../../lib/marketplaceSellers'
import { isUsefulSearchQuery } from '../../lib/searchQuery'
import { exploreListUrl } from '../chrome/exploreMode'
import { shortListingAddress } from '../MapListingCard.logic'
import { RentalConsiderationToggle } from '../ai/RentalConsiderationToggle'
import { PremiumBadge } from '../PremiumBadge'
import { HubBodySkeleton } from '../skeletons/PageSkeletons'
import { PromoBanner } from './PromoBanner'
import { useIsMobile } from '../../mobile/useIsMobile'
import { MobileRoomCard } from '../../mobile/listings/MobileRoomCard'
import '../../mobile/hub/mobile-hub.css'
import './AuthenticatedHub.css'

const RECENT_SEARCH_KEY = 'homeji:map-search-recent'

type Bundle = {
  notifications: Notification[]
  appointments: ViewingAppointment[]
  saved: RentalPostSummary[]
  invitations: RoommateInvitation[]
  candidates: RoommateCandidate[]
  market: MarketplacePost[]
  rooms: RentalPostSummary[]
  loadedAt: number
  failed: {
    rooms: boolean
    appointments: boolean
    market: boolean
    notifications: boolean
  }
}

function greetingPrefix(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
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
  const isMobile = useIsMobile()
  const { profile } = useAuth()
  const { conversations, error: inboxError, refresh: refreshInbox } = useConversationInbox(profile?.id ?? null)
  const navigate = useNavigate()
  const displayName = profile?.displayName?.trim() || 'bạn'
  const [now] = useState(() => new Date())
  const [recentSearches] = useState(readRecentSearches)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [notify, appoint, savedPosts, invites, rooms, market] = await Promise.allSettled([
        getNotifications(true),
        getViewingAppointments(),
        profile?.role === UserRole.Renter ? getSavedPosts() : Promise.resolve([]),
        profile?.role === UserRole.Renter ? getMyInvitations() : Promise.resolve([]),
        searchRentalPosts({ pageSize: 6 }),
        searchMarketplacePosts({ pageSize: 4 }),
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
      const failed = [notify, appoint, savedPosts, invites, rooms, market].every(
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
        saved,
        invitations: invites.status === 'fulfilled' ? invites.value : [],
        candidates: candidates.slice(0, 3),
        market: market.status === 'fulfilled' ? market.value : [],
        rooms: rooms.status === 'fulfilled' ? rooms.value : [],
        loadedAt: Date.now(),
        failed: {
          rooms: rooms.status === 'rejected',
          appointments: appoint.status === 'rejected',
          market: market.status === 'rejected',
          notifications: notify.status === 'rejected',
        },
      })
      setPhase('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey, profile?.id, profile?.role])

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

  const chats = conversations.slice(0, 3)
  const unreadMessages = conversations.reduce((sum, item) => sum + item.unreadCount, 0)
  const savedAlerts = (bundle?.notifications ?? []).filter(
    (item) => item.type === NotificationType.SavedPostChanged,
  ).slice(0, 2)
  const matchingNotes = (bundle?.notifications ?? []).filter(
    (item) => item.type === NotificationType.NewMatchingRentalPost,
  )
  const lead = matchingNotes.length > 0
    ? `${matchingNotes.length} tin mới khớp tìm kiếm của bạn.`
    : null
  const journey = useRentalJourney()
  const considering = journey?.enabled ? journey.choices.length : 0
  const pendingInvites = (bundle?.invitations ?? []).filter(
    (item) => isPendingReceivedInvitation(item, profile?.id),
  ).length
  // "Việc tiếp theo": only things that are really waiting on this member, most time-bound first.
  const nextSteps: { key: string; text: string; action: string; to: string }[] = []
  if (upcoming[0]) nextSteps.push({ key: 'viewing', text: `Lịch xem phòng ${clock(upcoming[0].scheduledAt)}, ${dayLabel(upcoming[0].scheduledAt)}`, action: 'Xem lịch', to: mapSectionUrl('appointments') })
  if (unreadMessages > 0) nextSteps.push({ key: 'messages', text: `${unreadMessages} tin nhắn chưa đọc`, action: 'Mở hộp thư', to: mapSectionUrl('messages') })
  if (considering > 0) nextSteps.push({ key: 'considering', text: `Đang cân nhắc ${considering} phòng`, action: considering >= 2 ? 'So sánh các lựa chọn' : 'Xem lựa chọn', to: '/?section=saved&view=considering' })
  if (pendingInvites > 0) nextSteps.push({ key: 'invites', text: `${pendingInvites} lời mời ở ghép chờ phản hồi`, action: 'Xem lời mời', to: ROOMMATE_INVITATIONS_URL })
  const hasSide = Boolean(
    bundle && (bundle.candidates.length > 0 || pendingInvites > 0),
  )

  return (
    <div className="hub-home" data-glass-exclude>
      <header className="hub-welcome">
        <div>
          <h1>{greetingPrefix(now.getHours())}, {displayName}</h1>
          {lead ? <Link className="hub-welcome__lead" to={mapSectionUrl('notifications')}>{lead} <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} /></Link> : null}
        </div>
      </header>

      {/* The renter's first job is search: the field leads on phones (the desktop header keeps its own),
          then the four places a member goes most, one tap each. */}
      <form className="hub-find" role="search" aria-label="Tìm phòng" onSubmit={(event) => {
        event.preventDefault()
        const keyword = new FormData(event.currentTarget).get('keyword')?.toString().trim() ?? ''
        navigate(exploreListUrl(keyword ? new URLSearchParams({ keyword }) : ''))
      }}>
        <input name="keyword" type="search" className="form-input" placeholder="Khu vực, trường…" aria-label="Từ khóa tìm phòng" />
        <button type="submit" className="btn btn-primary">Tìm phòng</button>
      </form>
      <nav className="hub-entries" aria-label="Lối vào nhanh">
        <Link to={exploreListUrl()}>Phòng trọ</Link>
        <Link to={exploreListUrl(new URLSearchParams({ catalog: 'apartments' }))}>Căn hộ</Link>
        <Link to={ROOMMATE_INVITATIONS_URL}>Ở ghép</Link>
        <Link to={mapSectionUrl('marketplace')}>Chợ đồ</Link>
      </nav>

      {recentSearches.length > 0 ? (
        <section className="hub-search" aria-label="Tìm kiếm gần đây">
          <h2>Gần đây</h2>
          <ul>{recentSearches.map((keyword) => (
            <li key={keyword}><Link to={exploreListUrl(new URLSearchParams({ keyword }))}>{keyword} <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} /></Link></li>
          ))}</ul>
        </section>
      ) : null}

      {nextSteps.length > 0 ? (
        <section className="hub-next" aria-labelledby="hub-next">
          <h2 id="hub-next">Việc tiếp theo</h2>
          <ul>{nextSteps.map((step) => (
            <li key={step.key}><span>{step.text}</span><Link to={step.to}>{step.action}</Link></li>
          ))}</ul>
        </section>
      ) : null}

      {phase === 'loading' ? (
        <div className="hub-skel-page sk-screen" role="status" aria-busy="true" aria-label="Đang tải trang chủ">
          <HubBodySkeleton />
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
          <div className="hub-main">
            <section className="hub-section hub-rooms" aria-labelledby="hub-rooms">
              <header>
                <div>
                  <h2 id="hub-rooms">Phòng đang mở</h2>
                </div>
                <Link to={exploreListUrl()}>Xem tất cả →</Link>
              </header>
              {bundle.failed.rooms ? <p className="hub-quiet">Không tải được phòng.</p> : null}
              {!bundle.failed.rooms && bundle.rooms.length === 0 ? <p className="hub-quiet">Chưa có phòng để gợi ý.</p> : null}
              <ul>
                {isMobile ? bundle.rooms.map((post) => (
                  <li key={post.id}>
                    <MobileRoomCard
                      id={post.id}
                      photo={post.thumbnailPath}
                      price={<>{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? <small>/tháng</small> : null}</>}
                      title={post.title}
                      meta={[Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', shortListingAddress((post.address || '').trim())].filter(Boolean).join(' · ')}
                      badge={post.isOwnerPremium === true && showHubPremiumBadges(bundle.rooms) ? <PremiumBadge variant="glass" />
                        : savedIds.has(post.id) ? <span className="m-room__pill">Đã lưu</span> : undefined}
                      to={`/?post=${encodeURIComponent(post.id)}`}
                      actions={<RentalConsiderationToggle compact post={post} />}
                    />
                  </li>
                )) : bundle.rooms.map((post, index) => (
                  <motion.li
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={`/?post=${encodeURIComponent(post.id)}`}
                      className={post.isOwnerPremium ? 'premium-listing' : undefined}
                    >
                      <span className="hub-room__photo">
                        {post.thumbnailPath ? (
                          <img decoding="async" width={640} height={400}
                            src={post.thumbnailPath}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.hidden = true
                            }}
                          />
                        ) : null}
                        <span className="hub-room__nophoto">Chưa có ảnh</span>
                        {!post.isOwnerPremium && savedIds.has(post.id) ? (
                          <em className="hub-room__saved">
                            <HeartIcon size={12} filled style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Đã lưu
                          </em>
                        ) : null}
                        {post.isOwnerPremium === true && showHubPremiumBadges(bundle.rooms) ? <PremiumBadge variant="glass" /> : null}
                      </span>
                      <span className="hub-room__copy">
                        <span className="hub-room__price"><strong>{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? '/tháng' : ''}</strong></span>
                        <b>{post.title}</b>
                        <span className="hub-room__meta">{[Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', shortListingAddress((post.address || '').trim())].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                    <footer className="hub-room__actions"><RentalConsiderationToggle compact post={post} /></footer>
                  </motion.li>
                ))}
              </ul>
            </section>

            <aside className="hub-rail" aria-label="Ưu đãi và Chợ Homeji">
              {bundle.failed.market || bundle.market.length > 0 ? (
                <section className="hub-section hub-market" aria-labelledby="hub-market">
                  <header>
                    <h2 id="hub-market">Chợ Homeji</h2>
                    <Link to={mapSectionUrl('marketplace')}>Dạo chợ đồ →</Link>
                  </header>
                  {bundle.failed.market ? (
                    <p className="hub-quiet">Không tải được món quanh khu phố.</p>
                  ) : (
                    <ul>
                      {bundle.market.map((item) => (
                        <li key={item.id}>
                          <Link to={item.sellerId ? marketplaceItemUrl(item) : mapSectionUrl('marketplace')}>
                            <span className="hub-market__thumb">
                              {item.mediaUrls[0] ? (
                                <img decoding="async" width={44} height={44}
                                  src={item.mediaUrls[0]}
                                  alt=""
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.hidden = true
                                  }}
                                />
                              ) : null}
                              <span className="hub-market__thumb-fallback" aria-hidden="true">
                                {item.listingType === MarketplaceListingType.Food ? (
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12h18" />
                                    <path d="M5 12a7 7 0 0 0 14 0" />
                                    <path d="M9 19h6" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 7h12l1 12H5L6 7z" />
                                    <path d="M9 7a3 3 0 0 1 6 0" />
                                  </svg>
                                )}
                              </span>
                            </span>
                            <b>{item.title}</b>
                            <span className="hub-market__meta">
                              <strong>{formatPrice(item.price)}</strong>
                              <small className="hub-market__kind">
                                {item.listingType === MarketplaceListingType.Food ? 'Đồ ăn' : 'Đồ cũ'}
                              </small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
              {/* Offers support the page; they do not lead it. */}
              <PromoBanner variant="rail" role={profile?.role} />
            </aside>
          </div>

          {savedAlerts[0] ? (
            <Link className="hub-update" to={mapSectionUrl('notifications')}>
              <span className="hub-update__dot" aria-hidden="true" />
              <strong>{savedAlerts[0].title}</strong>
              {savedAlerts[0].message?.trim() ? <span className="hub-update__body">{savedAlerts[0].message.trim()}</span> : null}
              <em>Xem thông báo →</em>
            </Link>
          ) : null}

          {bundle.failed.appointments || upcoming.length > 0 ? (
            <section className="hub-section hub-viewings" aria-labelledby="hub-viewings">
              <header>
                <h2 id="hub-viewings">Lịch xem phòng sắp tới</h2>
                <Link to={mapSectionUrl('appointments')}>
                  {upcoming.length > 0 ? `${upcoming.length} lịch` : 'Xem lịch'}
                </Link>
              </header>
              {bundle.failed.appointments ? <p className="hub-quiet">Không tải được lịch xem.</p> : null}
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
          ) : null}

          {inboxError || chats.length > 0 || hasSide ? (
            <div className={`hub-community${(inboxError || chats.length > 0) && hasSide ? '' : ' hub-community--single'}`}>
              {inboxError || chats.length > 0 ? <section className="hub-section hub-messages" aria-labelledby="hub-messages">
                <header>
                  <h2 id="hub-messages">Tin nhắn gần đây</h2>
                  <Link to={mapSectionUrl('messages')}>
                    {unreadMessages > 0 ? `${unreadMessages} mới` : 'Mở hộp thư'}
                  </Link>
                </header>
                {inboxError ? <p className="hub-quiet">Không tải được tin nhắn. <button type="button" onClick={refreshInbox}>Thử lại</button></p> : null}
                <ul>
                  {chats.map((chat) => (
                    <li key={chat.id}>
                      <Link to={mapMessagesUrl(chat.id)}>
                        {chat.otherParticipantAvatarPath ? (
                          <img loading="lazy" decoding="async" width={36} height={36} src={chat.otherParticipantAvatarPath} alt="" />
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
              </section> : null}

              {hasSide ? (
                <div className="hub-side">
                  {bundle.candidates.length > 0 || pendingInvites > 0 ? (
                    <section className="hub-section hub-roommates" aria-labelledby="hub-roommates">
                      <header>
                        <h2 id="hub-roommates">Ở ghép</h2>
                        <Link to={ROOMMATE_INVITATIONS_URL}>Xem lời mời</Link>
                      </header>
                      {bundle.candidates.length > 0 ? (
                        <ul>
                          {bundle.candidates.map((person) => (
                            <li key={person.userId}>
                              <b aria-hidden="true">{initials(person.displayName)}</b>
                              <span>
                                <strong>{person.displayName}</strong>
                                {person.preferredArea ? <small>{person.preferredArea}</small> : null}
                              </span>
                              {Number.isFinite(person.matchScore) ? <em>{person.matchScore}%</em> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="hub-roommates__count">
                          <strong>{pendingInvites}</strong>
                          <span>lời mời ở ghép<br />đang chờ bạn phản hồi</span>
                        </div>
                      )}
                      {bundle.candidates.length === 0 ? (
                        <Link className="hub-roommates__cta liquid-action" to={ROOMMATE_INVITATIONS_URL}>Xem lời mời</Link>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
