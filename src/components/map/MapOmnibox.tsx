import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RentalPostSummary, UserProfile } from '../../api/types'
import { UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { amenityLabel, formatPrice, rentalPostTypeLabel } from '../../lib/labels'
import { MAP_FOCUS_ZOOM } from '../../lib/googleMaps'
import {
  MAP_PIN_LAYER_OPTIONS,
  type MapPinLayer,
  type MapPinLayers,
} from '../../lib/mapPinLayers'
import { fetchPlacePredictions } from '../../lib/placeAutocomplete'
import type { GuestAreaOption } from '../landing/guestMapAreas'
import { GUEST_DISTRICTS, GUEST_WARDS } from '../landing/guestMapAreas'
import type { MapAppSection } from './MapAppPanel'
import { MapAccountMenu } from './MapAccountMenu'
import './MapMotion.css'
import './MapOmnibox.css'

const RECENT_KEY = 'homeji:map-search-recent'
const MAX_RECENT = 8
const MAP_TOUR_VERSION = 'v1'
const NEW_ACCOUNT_TOUR_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

const SECTION_GUIDE: Partial<Record<MapAppSection, { title: string; body: string; tip: string }>> = {
  listings: {
    title: 'Tìm phòng trên bản đồ',
    body: 'Lướt danh sách để Homeji tự đưa bản đồ tới ghim tương ứng.',
    tip: 'Click một lần để focus ghim; click lần hai để mở đầy đủ chi tiết phòng.',
  },
  marketplace: {
    title: 'Chợ đồ sinh viên',
    body: 'Mua bán đồ cũ, đồ ăn và vật dụng quanh khu trọ theo vị trí trên bản đồ.',
    tip: 'Kiểm tra người bán, điểm nhận và trạng thái đơn trước khi thanh toán.',
  },
  wanted: {
    title: 'Tin tìm phòng',
    body: 'Đăng nhu cầu về khu vực, ngân sách và ngày muốn chuyển vào để chủ phòng chủ động liên hệ.',
    tip: 'Mô tả càng rõ thì đề xuất nhận được càng sát nhu cầu.',
  },
  saved: {
    title: 'Phòng đã lưu',
    body: 'Giữ các lựa chọn đáng cân nhắc ở một nơi để xem lại và so sánh nhanh.',
    tip: 'Bạn có thể bỏ lưu bất cứ lúc nào mà không ảnh hưởng tới tin gốc.',
  },
  invitations: {
    title: 'Kết nối ở ghép',
    body: 'Theo dõi lời mời ở ghép đã gửi và đã nhận trước khi bắt đầu trò chuyện.',
    tip: 'Chỉ chấp nhận khi thông tin phòng và thói quen sinh hoạt đã rõ ràng.',
  },
  messages: {
    title: 'Tin nhắn',
    body: 'Trao đổi trực tiếp theo từng tin đăng và giữ toàn bộ ngữ cảnh trong một cuộc trò chuyện.',
    tip: 'Không gửi giấy tờ cá nhân hoặc đặt cọc khi phòng chưa được xác minh.',
  },
  appointments: {
    title: 'Lịch xem phòng',
    body: 'Quản lý yêu cầu, thời gian xác nhận và trạng thái các buổi xem phòng.',
    tip: 'Hãy xác nhận lại địa điểm và người liên hệ trước khi tới.',
  },
  notifications: {
    title: 'Thông báo',
    body: 'Xem thay đổi của tin đăng, lời mời, tin nhắn và lịch xem phòng.',
    tip: 'Mở thông báo sẽ đưa bạn tới đúng nội dung liên quan.',
  },
  profile: {
    title: 'Hồ sơ của bạn',
    body: 'Cập nhật trường học, khu vực mong muốn và thói quen để Homeji gợi ý phù hợp hơn.',
    tip: 'Chỉ chia sẻ các thông tin cần thiết cho việc tìm phòng và ở ghép.',
  },
  payments: {
    title: 'Gói đăng ký',
    body: 'Xem quyền lợi, thời hạn và trạng thái gói Homeji đang sử dụng.',
    tip: 'Đọc kỹ quyền lợi và tổng tiền trước khi bắt đầu thanh toán.',
  },
  activities: {
    title: 'Nhật ký hoạt động',
    body: 'Theo dõi những thao tác quan trọng đã thực hiện trên tài khoản.',
    tip: 'Nếu thấy hoạt động lạ, hãy kiểm tra lại phiên đăng nhập và bảo mật tài khoản.',
  },
  myPosts: {
    title: 'Tin của tôi',
    body: 'Quản lý tin nháp, tin chờ duyệt, tin đang hiển thị và trạng thái cho thuê.',
    tip: 'Cập nhật trạng thái kịp thời để người tìm phòng không liên hệ nhầm.',
  },
}

function shouldShowMapTour(profile: UserProfile | null): boolean {
  if (!profile?.id || !profile.createdAt) return false
  const createdAt = Date.parse(profile.createdAt)
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > NEW_ACCOUNT_TOUR_WINDOW_MS) {
    return false
  }
  try {
    return localStorage.getItem(`homeji:map-tour:${MAP_TOUR_VERSION}:${profile.id}`) !== 'done'
  } catch {
    return true
  }
}

export type MapOmniboxSchool = {
  id: string
  label: string
  keyword: string
  focus: { lat: number; lng: number; zoom?: number }
  address?: string
  description?: string
  badge?: string
}

export type MapOmniboxSuggestion = {
  id: string
  kind: 'district' | 'ward' | 'school' | 'post' | 'recent' | 'query' | 'place'
  title: string
  subtitle?: string
  meta?: string
  badge?: string
  keyword: string
  focus?: { lat: number; lng: number; zoom?: number }
  districtId?: string
  wardId?: string
  schoolId?: string
  postId?: string
  /** Google Place ID — resolve to lat/lng on pick. */
  placeId?: string
}

type Props = {
  query: string
  onQueryChange: (value: string) => void
  onSearch: (keyword: string) => void
  onPickSuggestion: (item: MapOmniboxSuggestion) => void
  posts?: RentalPostSummary[]
  schools: MapOmniboxSchool[]
  schoolsLoading?: boolean
  districtId: string
  wardId: string
  schoolId: string
  amenities: string[]
  selectedAmenities: string[]
  onToggleAmenity: (amenity: string) => void
  minPrice: string
  maxPrice: string
  onMinPriceChange: (v: string) => void
  onMaxPriceChange: (v: string) => void
  onApplyPrice: () => void
  onReset: () => void
  /** Open a section in the right map panel (Google Maps style). */
  onOpenSection?: (section: MapAppSection) => void
  activeSection?: MapAppSection | null
  onAiSearch?: (query: string) => void
  aiSearching?: boolean
  /** Unread chat / message notifications — badge on Chat rail button. */
  unreadMessageCount?: number
  /** Unread non-message notifications — animated bell + count badge. */
  unreadNotificationCount?: number
  pinLayers?: MapPinLayers
  onTogglePinLayer?: (layer: MapPinLayer) => void
  /** Close currently opened place/listing detail panel. */
  onClosePlaceDetail?: () => void
  /** Whether place/listing detail panel is currently visible. */
  placeDetailOpen?: boolean
  /** Collapse all chrome sections from parent shell. */
  uiCollapsed?: boolean
}

function loadRecent(): MapOmniboxSuggestion[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MapOmniboxSuggestion[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function saveRecent(item: MapOmniboxSuggestion) {
  const prev = loadRecent().filter((r) => r.id !== item.id && r.keyword !== item.keyword)
  const next = [
    {
      ...item,
      kind: 'recent' as const,
      id: `recent-${item.kind}-${item.keyword}-${item.postId ?? ''}`,
    },
    ...prev,
  ].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function areaToSuggestion(
  area: GuestAreaOption,
  kind: 'district' | 'ward',
  districtId?: string,
): MapOmniboxSuggestion {
  return {
    id: `${kind}-${area.id}`,
    kind,
    title: area.label,
    subtitle: area.address || (kind === 'district' ? 'TP. Hồ Chí Minh' : 'Phường'),
    meta: area.description,
    badge: area.badge || (kind === 'district' ? 'Khu vực' : 'Phường'),
    keyword: area.keyword,
    focus: area.focus,
    districtId: kind === 'district' ? area.id : districtId,
    wardId: kind === 'ward' ? area.id : undefined,
  }
}

function schoolToSuggestion(s: MapOmniboxSchool): MapOmniboxSuggestion {
  return {
    id: `school-${s.id}`,
    kind: 'school',
    title: s.label,
    subtitle: s.address || 'TP. Thủ Đức, TP. Hồ Chí Minh',
    meta: s.description || 'Tìm phòng trọ quanh trường',
    badge: s.badge || 'Đại học',
    keyword: s.keyword,
    focus: s.focus,
    schoolId: s.id,
  }
}

function postToSuggestion(post: RentalPostSummary): MapOmniboxSuggestion {
  return {
    id: `post-${post.id}`,
    kind: 'post',
    title: post.title || 'Tin đăng',
    subtitle: post.address,
    meta: `${formatPrice(post.price)}/tháng · ${post.area} m² · ${rentalPostTypeLabel[post.type]}`,
    badge: rentalPostTypeLabel[post.type],
    keyword: post.address || post.title,
    focus: { lat: post.latitude, lng: post.longitude, zoom: MAP_FOCUS_ZOOM },
    postId: post.id,
  }
}

function matchesQuery(item: MapOmniboxSuggestion, q: string) {
  if (!q) return true
  return (
    item.title.toLowerCase().includes(q) ||
    item.keyword.toLowerCase().includes(q) ||
    (item.subtitle?.toLowerCase().includes(q) ?? false) ||
    (item.meta?.toLowerCase().includes(q) ?? false) ||
    (item.badge?.toLowerCase().includes(q) ?? false)
  )
}

function SuggestionRow({
  item,
  active,
  onPick,
}: {
  item: MapOmniboxSuggestion
  active?: boolean
  onPick: (item: MapOmniboxSuggestion) => void
}) {
  return (
    <button
      type="button"
      className={`gmaps-omnibox__row map-motion-press${active ? ' is-active' : ''}`}
      onClick={() => onPick(item)}
    >
      <span className={`gmaps-omnibox__row-icon is-${item.kind}`} aria-hidden>
        {item.kind === 'post' ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
            />
          </svg>
        ) : item.kind === 'school' ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"
            />
          </svg>
        ) : item.kind === 'place' ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
            />
          </svg>
        ) : item.kind === 'recent' ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
            />
          </svg>
        )}
      </span>
      <span className="gmaps-omnibox__row-copy">
        <strong>{item.title}</strong>
        {item.subtitle ? <span className="gmaps-omnibox__row-sub">{item.subtitle}</span> : null}
        {item.meta ? <span className="gmaps-omnibox__row-meta">{item.meta}</span> : null}
      </span>
      {item.badge ? <span className="gmaps-omnibox__row-badge">{item.badge}</span> : null}
    </button>
  )
}

export function MapOmnibox({
  query,
  onQueryChange,
  onSearch,
  onPickSuggestion,
  posts = [],
  schools,
  schoolsLoading,
  districtId,
  wardId,
  schoolId,
  amenities,
  selectedAmenities,
  onToggleAmenity,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPrice,
  onReset,
  onOpenSection,
  activeSection = null,
  unreadMessageCount = 0,
  unreadNotificationCount = 0,
  pinLayers,
  onTogglePinLayer,
  onClosePlaceDetail,
  placeDetailOpen = false,
  uiCollapsed = false,
}: Props) {
  const { profile } = useAuth()
  const { apiKey, isLoaded: mapsLoaded } = useGoogleMaps()
  const [open, setOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [tourDismissed, setTourDismissed] = useState(false)
  const [tourSection, setTourSection] = useState<MapAppSection | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [recent, setRecent] = useState<MapOmniboxSuggestion[]>(loadRecent)
  const [placeSuggestions, setPlaceSuggestions] = useState<MapOmniboxSuggestion[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false,
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const tourVisible = !tourDismissed && shouldShowMapTour(profile)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const page = rootRef.current?.closest('.home-map-page')
    if (!page) return
    const on = open && isMobile
    page.classList.toggle('is-mobile-searching', on)
    return () => page.classList.remove('is-mobile-searching')
  }, [open, isMobile])

  useEffect(() => {
    if (!uiCollapsed) return
    setOpen(false)
    setNavOpen(false)
    setAdvancedOpen(false)
    inputRef.current?.blur()
  }, [uiCollapsed])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (isMobile && open) return // backdrop handles dismiss on mobile
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isMobile, open])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  // Google Places address / POI suggestions (debounced) for detailed addresses.
  useEffect(() => {
    const q = query.trim()
    if (!apiKey || !mapsLoaded || q.length < 2) {
      const clearTimer = window.setTimeout(() => {
        setPlaceSuggestions([])
        setPlacesLoading(false)
      }, 0)
      return () => window.clearTimeout(clearTimer)
    }

    let cancelled = false
    const t = window.setTimeout(() => {
      setPlacesLoading(true)
      void fetchPlacePredictions(q, { limit: 6 })
        .then((items) => {
          if (cancelled) return
          setPlaceSuggestions(
            items.map((p) => ({
              id: `place-${p.placeId}`,
              kind: 'place' as const,
              title: p.title,
              subtitle: p.subtitle,
              keyword: p.title,
              placeId: p.placeId,
            })),
          )
        })
        .catch(() => {
          if (!cancelled) setPlaceSuggestions([])
        })
        .finally(() => {
          if (!cancelled) setPlacesLoading(false)
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query, apiKey, mapsLoaded])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const districts = GUEST_DISTRICTS.map((d) => areaToSuggestion(d, 'district')).filter((i) =>
      matchesQuery(i, q),
    )
    const wards = GUEST_WARDS.map((w) => areaToSuggestion(w, 'ward', w.districtId)).filter((i) =>
      matchesQuery(i, q),
    )
    const schoolItems = schools.map(schoolToSuggestion).filter((i) => matchesQuery(i, q))
    const postItems = posts
      .filter((p) => p.latitude && p.longitude)
      .map(postToSuggestion)
      .filter((i) => matchesQuery(i, q))

    const recentItems = recent.filter((r) => matchesQuery(r, q))

    if (!q) {
      return {
        recent: recentItems.slice(0, 5),
        places: [] as MapOmniboxSuggestion[],
        districts: districts.slice(0, 2),
        wards: wards.slice(0, 5),
        schools: schoolItems.slice(0, 6),
        posts: postItems.slice(0, 5),
      }
    }

    return {
      recent: recentItems.slice(0, 4),
      places: placeSuggestions.slice(0, 6),
      districts: districts.slice(0, 4),
      wards: wards.slice(0, 8),
      schools: schoolItems.slice(0, 10),
      posts: postItems.slice(0, 8),
    }
  }, [query, schools, recent, posts, placeSuggestions])

  const totalHits =
    suggestions.recent.length +
    suggestions.places.length +
    suggestions.districts.length +
    suggestions.wards.length +
    suggestions.schools.length +
    suggestions.posts.length

  const pick = (item: MapOmniboxSuggestion) => {
    saveRecent(item)
    setRecent(loadRecent())
    onQueryChange(item.kind === 'place' && item.subtitle ? `${item.title}` : item.title)
    onPickSuggestion(item)
    setOpen(false)
  }

  const submit = () => {
    const keyword = query.trim()
    if (!keyword) return
    // Prefer the top Google place row so Enter flies to the location.
    const topPlace = placeSuggestions[0]
    if (topPlace?.placeId) {
      pick(topPlace)
      return
    }
    const item: MapOmniboxSuggestion = {
      id: `query-${keyword}`,
      kind: 'query',
      title: keyword,
      subtitle: 'Tìm kiếm địa chỉ / từ khóa trên Homeji',
      meta: 'Bay tới địa điểm hoặc lọc tin đăng',
      badge: 'Tìm kiếm',
      keyword,
    }
    saveRecent(item)
    setRecent(loadRecent())
    onSearch(keyword)
    setOpen(false)
  }

  const closeSearch = () => {
    setOpen(false)
    inputRef.current?.blur()
  }

  const closeNav = () => setNavOpen(false)
  const canClosePlaceDetail = placeDetailOpen && !!onClosePlaceDetail

  const finishTour = () => {
    if (profile?.id) {
      try {
        localStorage.setItem(`homeji:map-tour:${MAP_TOUR_VERSION}:${profile.id}`, 'done')
      } catch {
        /* The guide can still be dismissed when storage is unavailable. */
      }
    }
    setTourDismissed(true)
    setTourSection(null)
  }

  const openSection = (section: MapAppSection, revealGuide = false) => {
    onOpenSection?.(section)
    closeNav()
    if (revealGuide && tourVisible && SECTION_GUIDE[section]) setTourSection(section)
  }

  return (
    <>
      <aside className="gmaps-nav-rail" aria-label="Điều hướng Homeji">
        <button
          type="button"
          className="gmaps-nav-rail__btn gmaps-nav-rail__btn--menu map-motion-press"
          aria-label="Mở menu"
          aria-expanded={navOpen}
          onClick={() => {
            setOpen(false)
            setNavOpen(true)
          }}
        >
          <span className="gmaps-nav-rail__menu" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>

        <button
          type="button"
          className={`gmaps-nav-rail__btn gmaps-nav-rail__btn--saved map-motion-press${activeSection === 'saved' ? ' is-active' : ''}`}
          aria-pressed={activeSection === 'saved'}
          onClick={() => openSection('saved')}
        >
          <span className="gmaps-nav-rail__icon-wrap">
            <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z"
              />
            </svg>
          </span>
          <span className="gmaps-nav-rail__label">Đã lưu</span>
        </button>

        <div className="gmaps-nav-rail__divider" role="presentation" />

        <button
          type="button"
          className={`gmaps-nav-rail__btn gmaps-nav-rail__btn--messages map-motion-press${activeSection === 'messages' ? ' is-active' : ''}`}
          aria-pressed={activeSection === 'messages'}
          onClick={() => openSection('messages')}
        >
          <span className="gmaps-nav-rail__icon-wrap">
            <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
              />
            </svg>
            {unreadMessageCount > 0 ? (
              <span
                className="gmaps-nav-rail__badge"
                aria-label={`${unreadMessageCount} tin nhắn chưa đọc`}
              >
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            ) : null}
          </span>
          <span className="gmaps-nav-rail__label">Chat</span>
        </button>

        <button
          type="button"
          className={`gmaps-nav-rail__btn gmaps-nav-rail__btn--appointments map-motion-press${activeSection === 'appointments' ? ' is-active' : ''}`}
          aria-pressed={activeSection === 'appointments'}
          onClick={() => openSection('appointments')}
        >
          <span className="gmaps-nav-rail__icon-wrap">
            <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
              />
            </svg>
          </span>
          <span className="gmaps-nav-rail__label">Lịch</span>
        </button>

        <button
          type="button"
          className={`gmaps-nav-rail__btn gmaps-nav-rail__btn--invitations map-motion-press${activeSection === 'invitations' ? ' is-active' : ''}`}
          aria-pressed={activeSection === 'invitations'}
          onClick={() => openSection('invitations')}
        >
          <span className="gmaps-nav-rail__icon-wrap">
            <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
              />
            </svg>
          </span>
          <span className="gmaps-nav-rail__label">Ở ghép</span>
        </button>
      </aside>

      <div
        className={`gmaps-omnibox${open && isMobile ? ' is-mobile-search' : ''}`}
        ref={rootRef}
      >
        <button
          type="button"
          className={`gmaps-omnibox__search-scrim${open && isMobile ? ' is-visible' : ''}`}
          aria-label="Đóng tìm kiếm"
          aria-hidden={!(open && isMobile)}
          tabIndex={open && isMobile ? 0 : -1}
          onClick={closeSearch}
        />

        <div className={`gmaps-omnibox__card${open ? ' is-open' : ''}`}>
          <form
            className={`gmaps-omnibox__bar${canClosePlaceDetail ? ' is-place-open' : ''}`}
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {open && isMobile ? (
              <button
                type="button"
                className="gmaps-omnibox__icon-btn gmaps-omnibox__back-btn map-motion-press"
                aria-label="Quay lại bản đồ"
                onClick={closeSearch}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="gmaps-omnibox__icon-btn gmaps-omnibox__menu-btn map-motion-press"
                aria-label="Mở menu"
                aria-expanded={navOpen}
                onClick={() => {
                  setOpen(false)
                  setNavOpen(true)
                }}
              >
                <span className="gmaps-omnibox__menu" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            )}

            <input
              ref={inputRef}
              className="gmaps-omnibox__input"
              value={query}
              placeholder={
                isMobile
                  ? 'Tìm một địa điểm'
                  : 'Tìm kiếm với Homeji...'
              }
              aria-label="Tìm kiếm trên Homeji Maps"
              autoComplete="off"
              enterKeyHint="search"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                onQueryChange(e.target.value)
                setOpen(true)
              }}
            />

            {!canClosePlaceDetail && query ? (
              <button
                type="button"
                className="gmaps-omnibox__icon-btn map-motion-press"
                aria-label="Xóa tìm kiếm"
                onClick={() => {
                  onQueryChange('')
                  inputRef.current?.focus()
                  setOpen(true)
                }}
              >
                ×
              </button>
            ) : null}

            <button
              type="submit"
              className="gmaps-omnibox__icon-btn gmaps-omnibox__search map-motion-press"
              aria-label="Tìm kiếm"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </button>

            {canClosePlaceDetail ? (
              <button
                type="button"
                className="gmaps-omnibox__icon-btn gmaps-omnibox__detail-close map-motion-press"
                aria-label="Đóng thông tin địa điểm"
                title="Đóng thông tin địa điểm"
                onClick={() => {
                  onQueryChange('')
                  onClosePlaceDetail?.()
                  setOpen(true)
                  window.requestAnimationFrame(() => {
                    inputRef.current?.focus()
                  })
                }}
              >
                ×
              </button>
            ) : null}
          </form>

          <div
            className={`gmaps-omnibox__dropdown${open ? ' is-visible' : ''}`}
            role="listbox"
            aria-hidden={!open}
          >
              {totalHits === 0 && !placesLoading ? (
                <p className="gmaps-omnibox__empty">
                  {schoolsLoading
                    ? 'Đang tải gợi ý khu vực & trường…'
                    : 'Không có gợi ý. Thử địa chỉ cụ thể (số nhà, đường), “Linh Trung”, hoặc “FPT”.'}
                </p>
              ) : null}

              {suggestions.recent.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Gần đây</p>
                  {suggestions.recent.map((item) => (
                    <SuggestionRow key={item.id} item={item} onPick={pick} />
                  ))}
                </div>
              ) : null}

              {suggestions.places.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Địa điểm</p>
                  {suggestions.places.map((item) => (
                    <SuggestionRow key={item.id} item={item} onPick={pick} />
                  ))}
                </div>
              ) : placesLoading && query.trim().length >= 2 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Địa điểm</p>
                  <p className="gmaps-omnibox__empty">Đang tìm địa chỉ chi tiết…</p>
                </div>
              ) : null}

              {suggestions.districts.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Khu vực</p>
                  {suggestions.districts.map((item) => (
                    <SuggestionRow
                      key={item.id}
                      item={item}
                      active={item.districtId === districtId && item.kind === 'district' && !wardId && !schoolId}
                      onPick={pick}
                    />
                  ))}
                </div>
              ) : null}

              {suggestions.wards.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Phường</p>
                  {suggestions.wards.map((item) => (
                    <SuggestionRow
                      key={item.id}
                      item={item}
                      active={item.wardId === wardId}
                      onPick={pick}
                    />
                  ))}
                </div>
              ) : null}

              {suggestions.schools.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Trường đại học</p>
                  {suggestions.schools.map((item) => (
                    <SuggestionRow
                      key={item.id}
                      item={item}
                      active={item.schoolId === schoolId}
                      onPick={pick}
                    />
                  ))}
                </div>
              ) : null}

              {suggestions.posts.length > 0 ? (
                <div className="gmaps-omnibox__section">
                  <p className="gmaps-omnibox__section-title">Tin đăng phù hợp</p>
                  {suggestions.posts.map((item) => (
                    <SuggestionRow key={item.id} item={item} onPick={pick} />
                  ))}
                </div>
              ) : null}

              <div className="gmaps-omnibox__footer">
                <button
                  type="button"
                  className={`gmaps-omnibox__link${advancedOpen ? ' is-open' : ''}`}
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  {advancedOpen ? 'Ẩn bộ lọc nâng cao' : 'Bộ lọc nâng cao'}
                </button>
                <button type="button" className="gmaps-omnibox__link" onClick={onReset}>
                  Đặt lại
                </button>
              </div>

              <div
                className={`gmaps-omnibox__advanced${advancedOpen ? ' is-visible' : ''}`}
                aria-hidden={!advancedOpen}
              >
                  <div className="gmaps-omnibox__price">
                    <label>
                      <span>Giá tối thiểu</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="VND"
                        value={minPrice}
                        onChange={(e) => onMinPriceChange(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Giá tối đa</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="VND"
                        value={maxPrice}
                        onChange={(e) => onMaxPriceChange(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="gmaps-omnibox__apply map-motion-press"
                      onClick={onApplyPrice}
                    >
                      Áp dụng
                    </button>
                  </div>
                  <div className="gmaps-omnibox__amenities" role="group" aria-label="Tiện ích">
                    {amenities.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        className={`gmaps-omnibox__amenity map-motion-press${
                          selectedAmenities.includes(amenity) ? ' is-on' : ''
                        }`}
                        onClick={() => onToggleAmenity(amenity)}
                      >
                        {amenityLabel(amenity)}
                      </button>
                    ))}
                  </div>
              </div>
            </div>
        </div>

        {pinLayers && onTogglePinLayer ? (
          <div className="gmaps-omnibox__chips-wrap" role="group" aria-label="Lọc loại ghim">
            <div className="gmaps-omnibox__chips">
              {MAP_PIN_LAYER_OPTIONS.map((opt) => {
                const on = pinLayers[opt.id]
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`gmaps-omnibox__chip map-motion-press${on ? ' is-on' : ''}`}
                    style={
                      on
                        ? {
                            borderColor: opt.accent,
                            background: `color-mix(in srgb, ${opt.accent} 18%, var(--surface-elevated))`,
                            color: opt.accent,
                          }
                        : undefined
                    }
                    aria-pressed={on}
                    onClick={() => onTogglePinLayer(opt.id)}
                  >
                    <span
                      className="gmaps-omnibox__chip-dot"
                      style={{ background: opt.accent }}
                      aria-hidden
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="gmaps-omnibox__top-actions">
          <button
            type="button"
            className={[
              'gmaps-omnibox__notify',
              'map-motion-press',
              activeSection === 'notifications' ? 'is-active' : '',
              unreadNotificationCount > 0 ? 'is-unread' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={
              unreadNotificationCount > 0
                ? `Thông báo, ${unreadNotificationCount} chưa đọc`
                : 'Thông báo'
            }
            aria-pressed={activeSection === 'notifications'}
            title="Thông báo"
            onClick={() => openSection('notifications')}
          >
            <span
              className={`gmaps-omnibox__notify-motion${
                unreadNotificationCount > 0 ? ' is-animating' : ''
              }`}
              aria-hidden
            >
              <svg
                className="gmaps-omnibox__notify-bell"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  className="gmaps-omnibox__notify-bell-body"
                  fill="currentColor"
                  d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                />
              </svg>
            </span>
            {unreadNotificationCount > 0 ? (
              <svg
                className="gmaps-omnibox__notify-badge"
                viewBox="0 0 22 22"
                width="18"
                height="18"
                aria-hidden
              >
                <circle cx="11" cy="11" r="10" className="gmaps-omnibox__notify-badge-bg" />
                <text
                  x="11"
                  y="11.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="gmaps-omnibox__notify-badge-text"
                >
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </text>
              </svg>
            ) : null}
          </button>
          <MapAccountMenu onOpenProfile={() => openSection('profile')} />
        </div>
      </div>

      <button
        type="button"
        className={`gmaps-nav-backdrop${navOpen ? ' is-visible' : ''}`}
        aria-label="Đóng menu"
        aria-hidden={!navOpen}
        tabIndex={navOpen ? 0 : -1}
        onClick={closeNav}
      />
      <aside
        className={`gmaps-nav-drawer${navOpen ? ' is-visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!navOpen}
        aria-label="Menu Homeji"
      >
            <div className="gmaps-nav-drawer__head">
              <Link to="/" className="gmaps-nav-drawer__brand" onClick={closeNav}>
                <img src="/brand/homeji-logo.png" alt="Homeji" width={120} height={34} />
              </Link>
            </div>

            <nav className="gmaps-nav-drawer__nav">
              {tourVisible && !tourSection ? (
                <div className="gmaps-tour__drawer-note" role="status">
                  <strong>Chọn một mục để xem hướng dẫn</strong>
                  <span>Homeji chỉ giải thích chức năng sau khi bạn chọn, không bắt xem một tour dài.</span>
                </div>
              ) : null}
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'listings' ? ' is-active' : ''}`}
                onClick={() => openSection('listings', true)}
              >
                Tìm phòng
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'marketplace' ? ' is-active' : ''}`}
                onClick={() => openSection('marketplace', true)}
              >
                Chợ đồ
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'wanted' ? ' is-active' : ''}`}
                onClick={() => openSection('wanted', true)}
              >
                Tin tìm phòng
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'saved' ? ' is-active' : ''}`}
                onClick={() => openSection('saved', true)}
              >
                Đã lưu
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'invitations' ? ' is-active' : ''}`}
                onClick={() => openSection('invitations', true)}
              >
                Ở ghép
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'notifications' ? ' is-active' : ''}`}
                onClick={() => openSection('notifications', true)}
              >
                Thông báo
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'messages' ? ' is-active' : ''}`}
                onClick={() => openSection('messages', true)}
              >
                Tin nhắn
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'appointments' ? ' is-active' : ''}`}
                onClick={() => openSection('appointments', true)}
              >
                Lịch xem phòng
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'payments' ? ' is-active' : ''}`}
                onClick={() => openSection('payments', true)}
              >
                Gói Đăng Ký
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'activities' ? ' is-active' : ''}`}
                onClick={() => openSection('activities', true)}
              >
                Nhật ký hoạt động
              </button>
              {profile?.role === UserRole.Landlord || profile?.role === UserRole.Renter ? (
                <>
                  <button
                    type="button"
                    className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'myPosts' ? ' is-active' : ''}`}
                    onClick={() => openSection('myPosts', true)}
                  >
                    Tin của tôi
                  </button>
                  <Link
                    to={profile?.role === UserRole.Renter ? '/posts/new?type=pass' : '/posts/new'}
                    className="gmaps-nav-drawer__item map-motion-press"
                    onClick={closeNav}
                  >
                    Đăng tin
                  </Link>
                </>
              ) : null}
              {profile?.role === UserRole.Admin ? (
                <Link to="/admin" className="gmaps-nav-drawer__item map-motion-press" onClick={closeNav}>
                  Quản trị
                </Link>
              ) : null}
            </nav>
      </aside>

      {tourVisible && !navOpen && !tourSection ? (
        <aside className="gmaps-tour gmaps-tour--menu" aria-label="Hướng dẫn bắt đầu">
          <span className="gmaps-tour__eyebrow">Bắt đầu với Homeji</span>
          <strong>Mở menu ba gạch ở góc trái</strong>
          <p>Chọn Tìm phòng, Chợ đồ, Ở ghép… rồi Homeji mới giải thích chi tiết mục đó.</p>
          <div className="gmaps-tour__actions">
            <button type="button" className="gmaps-tour__secondary" onClick={finishTour}>Bỏ qua</button>
            <button
              type="button"
              className="gmaps-tour__primary"
              onClick={() => {
                setOpen(false)
                setNavOpen(true)
              }}
            >
              Mở menu
            </button>
          </div>
        </aside>
      ) : null}

      {tourVisible && tourSection && SECTION_GUIDE[tourSection] ? (
        <aside className="gmaps-tour gmaps-tour--section" role="dialog" aria-modal="false" aria-label={`Hướng dẫn ${SECTION_GUIDE[tourSection]!.title}`}>
          <span className="gmaps-tour__eyebrow">Bạn vừa mở</span>
          <strong>{SECTION_GUIDE[tourSection]!.title}</strong>
          <p>{SECTION_GUIDE[tourSection]!.body}</p>
          <small>{SECTION_GUIDE[tourSection]!.tip}</small>
          <div className="gmaps-tour__actions">
            <button
              type="button"
              className="gmaps-tour__secondary"
              onClick={() => {
                setTourSection(null)
                setNavOpen(true)
              }}
            >
              Xem mục khác
            </button>
            <button type="button" className="gmaps-tour__primary" onClick={finishTour}>Đã hiểu</button>
          </div>
        </aside>
      ) : null}
    </>
  )
}
