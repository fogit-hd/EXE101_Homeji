import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RentalPostSummary } from '../../api/types'
import { UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, rentalPostTypeLabel } from '../../lib/labels'
import type { GuestAreaOption } from '../landing/guestMapAreas'
import { GUEST_DISTRICTS, GUEST_WARDS } from '../landing/guestMapAreas'
import type { MapAppSection } from './MapAppPanel'
import { MapAccountMenu } from './MapAccountMenu'
import { useMountTransition } from './useMountTransition'
import './MapMotion.css'
import './MapOmnibox.css'

const RECENT_KEY = 'homeji:map-search-recent'
const MAX_RECENT = 8

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
  kind: 'district' | 'ward' | 'school' | 'post' | 'recent' | 'query'
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
  filterLabel: string
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
    focus: { lat: post.latitude, lng: post.longitude, zoom: 16 },
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

function ChipScroller({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) {
      setCanPrev(false)
      setCanNext(false)
      return
    }
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(max > 4 && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => updateArrows())
    ro.observe(el)
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, children])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.65), behavior: 'smooth' })
  }

  return (
    <div className={`gmaps-omnibox__chips-wrap${canPrev ? ' has-prev' : ''}${canNext ? ' has-next' : ''}`}>
      {canPrev ? (
        <button
          type="button"
          className="gmaps-omnibox__chips-arrow is-prev map-motion-press"
          aria-label="Cuộn chip sang trái"
          onClick={() => scrollByDir(-1)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className="gmaps-omnibox__chips"
        role="list"
        aria-label={label}
      >
        {children}
      </div>

      {canNext ? (
        <button
          type="button"
          className="gmaps-omnibox__chips-arrow is-next map-motion-press"
          aria-label="Cuộn chip sang phải"
          onClick={() => scrollByDir(1)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      ) : null}
    </div>
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
        {item.kind === 'school' || item.kind === 'post' ? (
          item.kind === 'post' ? (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"
              />
            </svg>
          )
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
  filterLabel,
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
}: Props) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [recent, setRecent] = useState<MapOmniboxSuggestion[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navMotion = useMountTransition(navOpen, 280)
  const dropdownMotion = useMountTransition(open, 220)

  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

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
        districts: districts.slice(0, 2),
        wards: wards.slice(0, 5),
        schools: schoolItems.slice(0, 6),
        posts: postItems.slice(0, 5),
      }
    }

    return {
      recent: recentItems.slice(0, 4),
      districts: districts.slice(0, 4),
      wards: wards.slice(0, 8),
      schools: schoolItems.slice(0, 10),
      posts: postItems.slice(0, 8),
    }
  }, [query, schools, recent, posts])

  const totalHits =
    suggestions.recent.length +
    suggestions.districts.length +
    suggestions.wards.length +
    suggestions.schools.length +
    suggestions.posts.length

  const pick = (item: MapOmniboxSuggestion) => {
    saveRecent(item)
    setRecent(loadRecent())
    onQueryChange(item.title)
    onPickSuggestion(item)
    setOpen(false)
  }

  const submit = () => {
    const keyword = query.trim()
    if (!keyword) return
    const item: MapOmniboxSuggestion = {
      id: `query-${keyword}`,
      kind: 'query',
      title: keyword,
      subtitle: 'Tìm kiếm từ khóa trên Homeji',
      meta: 'Lọc tin đăng theo khu vực / địa chỉ / tên phòng',
      badge: 'Từ khóa',
      keyword,
    }
    saveRecent(item)
    setRecent(loadRecent())
    onSearch(keyword)
    setOpen(false)
  }

  const closeNav = () => setNavOpen(false)

  const openSection = (section: MapAppSection) => {
    onOpenSection?.(section)
    closeNav()
  }

  const chips = [
    {
      id: 'thu-duc',
      label: 'Thủ Đức',
      active: districtId === 'thu-duc' && !wardId && !schoolId,
      onClick: () => {
        const d = GUEST_DISTRICTS.find((x) => x.id === 'thu-duc')!
        pick(areaToSuggestion(d, 'district'))
      },
    },
    {
      id: 'q9',
      label: 'Quận 9',
      active: districtId === 'q9' && !wardId && !schoolId,
      onClick: () => {
        const d = GUEST_DISTRICTS.find((x) => x.id === 'q9')!
        pick(areaToSuggestion(d, 'district'))
      },
    },
    ...GUEST_WARDS.slice(0, 4).map((w) => ({
      id: w.id,
      label: w.label.replace(/^Phường\s+/i, ''),
      active: wardId === w.id,
      onClick: () => pick(areaToSuggestion(w, 'ward', w.districtId)),
    })),
    ...schools.slice(0, 3).map((s) => {
      const short = s.label
        .replace(/^Trường\s+/i, '')
        .replace(/^Đại học\s+/i, '')
        .split('(')[0]
        .trim()
      return {
        id: `chip-school-${s.id}`,
        label: short.length > 14 ? `${short.slice(0, 13)}…` : short,
        active: schoolId === s.id,
        onClick: () => pick(schoolToSuggestion(s)),
      }
    }),
  ]

  return (
    <>
      <aside className="gmaps-nav-rail" aria-label="Điều hướng Homeji">
        <button
          type="button"
          className="gmaps-nav-rail__btn map-motion-press"
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
          className={`gmaps-nav-rail__btn map-motion-press${activeSection === 'saved' ? ' is-active' : ''}`}
          onClick={() => openSection('saved')}
        >
          <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z"
            />
          </svg>
          <span className="gmaps-nav-rail__label">Đã lưu</span>
        </button>

        <button
          type="button"
          className={`gmaps-nav-rail__btn map-motion-press${activeSection === 'listings' ? ' is-active' : ''}`}
          onClick={() => {
            openSection('listings')
            setOpen(true)
            inputRef.current?.focus()
          }}
        >
          <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
            />
          </svg>
          <span className="gmaps-nav-rail__label">Gần đây</span>
        </button>

        <div className="gmaps-nav-rail__divider" role="presentation" />

        <button
          type="button"
          className={`gmaps-nav-rail__btn map-motion-press${activeSection === 'notifications' ? ' is-active' : ''}`}
          onClick={() => openSection('notifications')}
        >
          <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
            />
          </svg>
          <span className="gmaps-nav-rail__label">Thông báo</span>
        </button>

        <button
          type="button"
          className={`gmaps-nav-rail__btn map-motion-press${activeSection === 'invitations' ? ' is-active' : ''}`}
          onClick={() => openSection('invitations')}
        >
          <svg className="gmaps-nav-rail__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            />
          </svg>
          <span className="gmaps-nav-rail__label">Ở ghép</span>
        </button>
      </aside>

      <div className="gmaps-omnibox" ref={rootRef}>
        <div className={`gmaps-omnibox__card${open ? ' is-open' : ''}`}>
          <form
            className="gmaps-omnibox__bar"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
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

            <input
              ref={inputRef}
              className="gmaps-omnibox__input"
              value={query}
              placeholder="Tìm phòng, phường, trường, địa chỉ…"
              aria-label="Tìm kiếm trên Homeji Maps"
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                onQueryChange(e.target.value)
                setOpen(true)
              }}
            />

            {query ? (
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
          </form>

          {dropdownMotion.mounted ? (
            <div
              className={`gmaps-omnibox__dropdown${dropdownMotion.active ? ' is-visible' : ''}`}
              role="listbox"
            >
              {totalHits === 0 ? (
                <p className="gmaps-omnibox__empty">
                  {schoolsLoading
                    ? 'Đang tải gợi ý khu vực & trường…'
                    : 'Không có gợi ý. Thử “Linh Trung”, “FPT”, hoặc địa chỉ cụ thể.'}
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

              {advancedOpen ? (
                <div className="gmaps-omnibox__advanced map-motion-fade-up">
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
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <ChipScroller label={`Lọc nhanh · ${filterLabel}`}>
          {chips.map((chip, index) => (
            <button
              key={chip.id}
              type="button"
              role="listitem"
              className={`gmaps-omnibox__chip map-motion-press${chip.active ? ' is-on' : ''}`}
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              onClick={chip.onClick}
            >
              {chip.label}
            </button>
          ))}
        </ChipScroller>
      </div>

      {navMotion.mounted ? (
        <>
          <button
            type="button"
            className={`gmaps-nav-backdrop${navMotion.active ? ' is-visible' : ''}`}
            aria-label="Đóng menu"
            onClick={closeNav}
          />
          <aside
            className={`gmaps-nav-drawer${navMotion.active ? ' is-visible' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Homeji"
          >
            <div className="gmaps-nav-drawer__head">
              <Link to="/" className="gmaps-nav-drawer__brand" onClick={closeNav}>
                <img src="/brand/homeji-logo.png" alt="Homeji" width={120} height={34} />
              </Link>
            </div>

            <nav className="gmaps-nav-drawer__nav">
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'listings' ? ' is-active' : ''}`}
                onClick={() => openSection('listings')}
              >
                Tìm phòng
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'saved' ? ' is-active' : ''}`}
                onClick={() => openSection('saved')}
              >
                Đã lưu
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'invitations' ? ' is-active' : ''}`}
                onClick={() => openSection('invitations')}
              >
                Ở ghép
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'notifications' ? ' is-active' : ''}`}
                onClick={() => openSection('notifications')}
              >
                Thông báo
              </button>
              <button
                type="button"
                className={`gmaps-nav-drawer__item map-motion-press${activeSection === 'payments' ? ' is-active' : ''}`}
                onClick={() => openSection('payments')}
              >
                Thanh toán
              </button>
              {profile?.role === UserRole.Landlord ? (
                <Link to="/posts/new" className="gmaps-nav-drawer__item map-motion-press" onClick={closeNav}>
                  Đăng tin
                </Link>
              ) : null}
              {profile?.role === UserRole.Admin ? (
                <Link to="/admin" className="gmaps-nav-drawer__item map-motion-press" onClick={closeNav}>
                  Quản trị
                </Link>
              ) : null}
            </nav>
          </aside>
        </>
      ) : null}

      <MapAccountMenu onOpenProfile={() => openSection('profile')} />
    </>
  )
}
