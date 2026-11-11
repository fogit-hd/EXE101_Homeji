import { useListingSearchParams } from '../../../hooks/useListingSearchParams'
import { RentalMapPreview as PreviewCard, BookmarkIcon } from './RentalMapPreview'
import { MoneyInput } from '../../ui/MoneyInput'
import { RentalSourceResults } from './RentalSourceResults'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { MarketplacePost, RentalPostSummary } from '../../../api/types'
import { marketplaceItemUrl } from '../../../lib/marketplaceSellers'
import { useDismissOnOutside } from '../../../lib/useDismissOnOutside'
import { shortListingAddress } from "../../MapListingCard.logic"
import { ListingTrustBadges } from '../../ListingTrustBadges'
import { MarketplaceSellerCatalog } from '../../marketplace/MarketplaceSellerCatalog'
import { ChoicePicker } from '../../ui/ChoicePicker'
import { RentalConsiderationToggle } from '../../ai/RentalConsiderationToggle'
import { listingThumbSrcSet } from '../../../lib/cloudinaryImage'
import {
  SnowflakeIcon,
  LoftLadderIcon,
  ShowerIcon,
  PawIcon,
  TagIcon,
  SparkleIcon,
  ArrowUpRightIcon,
  GraduationCapIcon,
  MetroTrainIcon,
  FloodFreeIcon,
  SecurityCameraIcon,
} from '../../icons/SvgIcons'
import {
  mapBackendListingToListingViewModel,
  mapFilterMetadataToFilterConfig,
  mapMarketplacePostToListingViewModel,
  parseFiltersFromURL,
  queryHasActiveFilters,
  serializeFiltersToQuery,
  type ListingCatalog,
  type ListingQuery,
  type MapListingsView,
} from './listingAdapters'

import { Sk, SkCard } from '../../skeletons/Skeleton'
import './MapListingsWorkspace.css'

const PAGE_SIZE = 20

type RangeDraft = { min: string; max: string }

type Props = {
  posts: RentalPostSummary[]
  marketPosts?: MarketplacePost[]
  selectedListingId: string | null
  hoveredListingId: string | null
  loading: boolean
  error: string
  savedIds?: Set<string>
  saveBusy?: boolean
  mapNode: ReactNode | null
  /** Contextual map content shares the results slot, outside the map's isolated layer. */
  contextPanel?: ReactNode
  viewportPaused?: boolean
  unreadNotifications?: number
  onHoverListing: (id: string) => void
  onLeaveListing: () => void
  onSelectListing: (id: string) => void
  onClearSelection?: () => void
  onOpenNearby?: () => void
  onOpenRoomDetail?: (id: string) => void
  onToggleSave?: (id: string) => void
  onResetFilters: () => void
  onUserSearch?: () => void
  onFocusSource?: (location: { lat: number; lng: number }) => void
  onRefresh?: () => Promise<void> | void
}

const SOURCE_OPTIONS: { id: ListingCatalog; label: string }[] = [
  { id: 'rooms', label: 'Phòng trọ' },
  { id: 'apartments', label: 'Căn hộ' },
  { id: 'market', label: 'Chợ Homeji' },
]

type QuickChip = {
  id: string
  label: string
  icon?: ReactNode
  focus?: { lat: number; lng: number }
  isActive: (query: ListingQuery) => boolean
  toggle: (query: ListingQuery) => Partial<ListingQuery>
}

const CAMPUS_METRO_OPTIONS = [
  { id: 'dhqg', label: 'ĐHQG TP.HCM', keyword: 'ĐHQG', focus: { lat: 10.878, lng: 106.806 }, isMetro: false },
  { id: 'ute', label: 'ĐH SPKT (UTE)', keyword: 'Sư phạm Kỹ thuật', focus: { lat: 10.8508, lng: 106.772 }, isMetro: false },
  { id: 'hutech', label: 'ĐH HUTECH', keyword: 'HUTECH', focus: { lat: 10.8015, lng: 106.7145 }, isMetro: false },
  { id: 'fpt', label: 'ĐH FPT', keyword: 'FPT', focus: { lat: 10.8415, lng: 106.8099 }, isMetro: false },
  { id: 'bachkhoa', label: 'ĐH Bách Khoa', keyword: 'Bách Khoa', focus: { lat: 10.7725, lng: 106.6579 }, isMetro: false },
  { id: 'kinhte', label: 'ĐH Kinh Tế', keyword: 'Kinh Tế', focus: { lat: 10.7828, lng: 106.6961 }, isMetro: false },
  { id: 'bx-miendong', label: 'Bến xe Miền Đông mới', keyword: 'Bến xe Miền Đông mới', focus: { lat: 10.865, lng: 106.835 }, isMetro: true },
  { id: 'metro1', label: 'Metro Tuyến 1', keyword: 'Metro', focus: { lat: 10.803, lng: 106.735 }, isMetro: true },
] as const

const matchesKeyword = (queryKeyword: string | undefined, ...targets: string[]) => {
  const norm = queryKeyword?.trim().toLowerCase()
  return Boolean(norm && targets.some((t) => t.toLowerCase() === norm))
}

const QUICK_CHIPS: QuickChip[] = [
  {
    id: 'hub-ktx-dhqg',
    label: 'KTX ĐHQG',
    icon: <GraduationCapIcon size={13} />,
    focus: { lat: 10.878, lng: 106.806 },
    isActive: (query) => matchesKeyword(query.keyword, 'KTX ĐHQG', 'ĐHQG'),
    toggle: (query) =>
      matchesKeyword(query.keyword, 'KTX ĐHQG', 'ĐHQG')
        ? { keyword: '' }
        : { keyword: 'KTX ĐHQG' },
  },
  {
    id: 'hub-spkt',
    label: 'ĐH SPKT',
    icon: <GraduationCapIcon size={13} />,
    focus: { lat: 10.8508, lng: 106.772 },
    isActive: (query) => matchesKeyword(query.keyword, 'Sư phạm Kỹ thuật', 'ĐH SPKT'),
    toggle: (query) =>
      matchesKeyword(query.keyword, 'Sư phạm Kỹ thuật', 'ĐH SPKT')
        ? { keyword: '' }
        : { keyword: 'Sư phạm Kỹ thuật' },
  },
  {
    id: 'hub-fpt',
    label: 'ĐH FPT',
    icon: <GraduationCapIcon size={13} />,
    focus: { lat: 10.8415, lng: 106.8099 },
    isActive: (query) => matchesKeyword(query.keyword, 'ĐH FPT', 'FPT'),
    toggle: (query) =>
      matchesKeyword(query.keyword, 'ĐH FPT', 'FPT')
        ? { keyword: '' }
        : { keyword: 'ĐH FPT' },
  },
  {
    id: 'hub-bx-mientay-dong',
    label: 'BX Miền Đông mới',
    icon: <MetroTrainIcon size={13} />,
    focus: { lat: 10.865, lng: 106.835 },
    isActive: (query) => matchesKeyword(query.keyword, 'Bến xe Miền Đông mới', 'BX Miền Đông mới'),
    toggle: (query) =>
      matchesKeyword(query.keyword, 'Bến xe Miền Đông mới', 'BX Miền Đông mới')
        ? { keyword: '' }
        : { keyword: 'Bến xe Miền Đông mới' },
  },
  {
    id: 'hub-metro1',
    label: 'Metro Tuyến 1',
    icon: <MetroTrainIcon size={13} />,
    focus: { lat: 10.803, lng: 106.735 },
    isActive: (query) => matchesKeyword(query.keyword, 'Metro', 'Metro Tuyến 1'),
    toggle: (query) =>
      matchesKeyword(query.keyword, 'Metro', 'Metro Tuyến 1')
        ? { keyword: '' }
        : { keyword: 'Metro' },
  },
  {
    id: 'under-3m',
    label: 'Dưới 3tr',
    isActive: (query) => query.maxPrice === 3_000_000 && (query.minPrice == null || query.minPrice === 0),
    toggle: (query) =>
      query.maxPrice === 3_000_000 && (query.minPrice == null || query.minPrice === 0)
        ? { minPrice: undefined, maxPrice: undefined }
        : { minPrice: undefined, maxPrice: 3_000_000 },
  },
  {
    id: '3m-5m',
    label: '3 - 5tr',
    isActive: (query) => query.minPrice === 3_000_000 && query.maxPrice === 5_000_000,
    toggle: (query) =>
      query.minPrice === 3_000_000 && query.maxPrice === 5_000_000
        ? { minPrice: undefined, maxPrice: undefined }
        : { minPrice: 3_000_000, maxPrice: 5_000_000 },
  },
  {
    id: 'over-5m',
    label: '> 5tr',
    isActive: (query) => query.minPrice === 5_000_000 && query.maxPrice == null,
    toggle: (query) =>
      query.minPrice === 5_000_000 && query.maxPrice == null
        ? { minPrice: undefined, maxPrice: undefined }
        : { minPrice: 5_000_000, maxPrice: undefined },
  },
  {
    id: 'ac',
    label: 'Có máy lạnh',
    icon: <SnowflakeIcon size={13} />,
    isActive: (query) => query.amenities.includes('AIR_CONDITIONER'),
    toggle: (query) => ({
      amenities: query.amenities.includes('AIR_CONDITIONER')
        ? query.amenities.filter((a) => a !== 'AIR_CONDITIONER')
        : [...query.amenities, 'AIR_CONDITIONER'],
    }),
  },
  {
    id: 'loft',
    label: 'Gác lửng',
    icon: <LoftLadderIcon size={13} />,
    isActive: (query) => query.amenities.includes('LOFT'),
    toggle: (query) => ({
      amenities: query.amenities.includes('LOFT')
        ? query.amenities.filter((a) => a !== 'LOFT')
        : [...query.amenities, 'LOFT'],
    }),
  },
  {
    id: 'wc',
    label: 'WC riêng',
    icon: <ShowerIcon size={13} />,
    isActive: (query) => query.amenities.includes('PRIVATE_BATHROOM'),
    toggle: (query) => ({
      amenities: query.amenities.includes('PRIVATE_BATHROOM')
        ? query.amenities.filter((a) => a !== 'PRIVATE_BATHROOM')
        : [...query.amenities, 'PRIVATE_BATHROOM'],
    }),
  },
  {
    id: 'pet',
    label: 'Cho nuôi pet',
    icon: <PawIcon size={13} />,
    isActive: (query) => query.amenities.includes('PET_FRIENDLY'),
    toggle: (query) => ({
      amenities: query.amenities.includes('PET_FRIENDLY')
        ? query.amenities.filter((a) => a !== 'PET_FRIENDLY')
        : [...query.amenities, 'PET_FRIENDLY'],
    }),
  },
]

function formatListingDate(value: string): string | null {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' }).format(timestamp)
    : null
}

export function MapListingsWorkspace({
  viewportPaused = false,
  posts,
  marketPosts = [],
  selectedListingId,
  hoveredListingId,
  loading,
  error,
  savedIds,
  saveBusy,
  mapNode,
  contextPanel,
  onHoverListing,
  onLeaveListing,
  onSelectListing,
  onClearSelection,
  onOpenNearby,
  onOpenRoomDetail,
  onToggleSave,
  onResetFilters,
  onUserSearch,
  onFocusSource,
  onRefresh,
}: Props) {
  const [, setSourceCounts] = useState<{ total: number; mapped: number } | null>(null)
  const [searchParams, setSearchParams] = useListingSearchParams()
  const navigate = useNavigate()
  const [pullY, setPullY] = useState(0)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const panelBodyRef = useRef<HTMLDivElement>(null)
  const refreshTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  const PULL_THRESHOLD = 60
  const MAX_PULL = 90

  const isAtScrollTop = () => {
    const el = panelBodyRef.current
    if (!el) return true
    if (el.scrollTop > 0) return false
    if (typeof window !== 'undefined' && window.scrollY > 0) return false
    return true
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pullRefreshing) return
    if (isAtScrollTop()) {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
    } else {
      touchStartY.current = null
      touchStartX.current = null
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current == null || pullRefreshing) return
    if (!isAtScrollTop() && pullY === 0) {
      touchStartY.current = null
      touchStartX.current = null
      return
    }
    const currentY = e.touches[0].clientY
    const currentX = e.touches[0].clientX
    const diffY = currentY - touchStartY.current
    const diffX = touchStartX.current != null ? Math.abs(currentX - touchStartX.current) : 0

    // Ignore horizontal gesture before pull starts
    if (pullY === 0 && diffX > Math.abs(diffY)) {
      touchStartY.current = null
      touchStartX.current = null
      return
    }

    if (diffY > 0) {
      const distance = Math.min(diffY * 0.45, MAX_PULL)
      setPullY(distance)
    } else {
      setPullY(0)
    }
  }

  const handleTouchEnd = async () => {
    if (touchStartY.current == null || pullRefreshing) return
    touchStartY.current = null
    touchStartX.current = null
    if (pullY >= PULL_THRESHOLD) {
      setPullRefreshing(true)
      setPullY(45)
      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          onUserSearch?.()
        }
      } catch (err) {
        console.error('[pull-to-refresh] refresh failed', err)
      } finally {
        refreshTimerRef.current = window.setTimeout(() => {
          setPullRefreshing(false)
          setPullY(0)
        }, 400)
      }
    } else {
      setPullY(0)
    }
  }
  const query = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])
  const filterConfig = useMemo(() => mapFilterMetadataToFilterConfig(query.catalog), [query.catalog])
  const marketMode = query.catalog === 'market'
  const apartmentMode = query.catalog === 'apartments'
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'areaDesc'>('default')
  const sortChoices = [
    ['default', 'Mới nhất'],
    ['priceAsc', 'Giá thấp → cao'],
    ['priceDesc', 'Giá cao → thấp'],
    ['areaDesc', 'Diện tích lớn'],
  ] as const

  const cards = useMemo(
    () => {
      const items = marketMode
        ? marketPosts.map((post) => ({ id: post.id, view: mapMarketplacePostToListingViewModel(post) }))
        : posts.map((post) => ({ id: post.id, view: mapBackendListingToListingViewModel(post) }))
      if (sortBy === 'default') return items
      const copy = [...items]
      if (sortBy === 'priceAsc') {
        return copy.sort((a, b) => {
          const postA = posts.find((p) => p.id === a.id)
          const postB = posts.find((p) => p.id === b.id)
          return (postA?.price ?? 0) - (postB?.price ?? 0)
        })
      }
      if (sortBy === 'priceDesc') {
        return copy.sort((a, b) => {
          const postA = posts.find((p) => p.id === a.id)
          const postB = posts.find((p) => p.id === b.id)
          return (postB?.price ?? 0) - (postA?.price ?? 0)
        })
      }
      if (sortBy === 'areaDesc') {
        return copy.sort((a, b) => {
          const postA = posts.find((p) => p.id === a.id)
          const postB = posts.find((p) => p.id === b.id)
          return (postB?.area ?? 0) - (postA?.area ?? 0)
        })
      }
      return copy
    },
    [marketMode, marketPosts, posts, sortBy],
  )
  const selected = cards.find((item) => item.id === selectedListingId) ?? null

  const writeQuery = (patch: Partial<ListingQuery>, options?: { fit?: boolean }) => {
    const nextQuery: ListingQuery = { ...query, ...patch }
    const next = serializeFiltersToQuery(nextQuery, searchParams)
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    if (options?.fit) onUserSearch?.()
  }

  const setView = (view: MapListingsView) => {
    setMobilePane(view === 'list' ? 'list' : 'map')
    setPanelOpen(true)
    writeQuery({ view })
  }
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterAnchor = useRef<HTMLButtonElement>(null)
  const [priceDraft, setPriceDraft] = useState<RangeDraft>(() => ({
    min: query.minPrice != null ? String(query.minPrice) : '',
    max: query.maxPrice != null ? String(query.maxPrice) : '',
  }))
  const [areaDraft, setAreaDraft] = useState<RangeDraft>(() => ({
    min: query.minArea != null ? String(query.minArea) : '',
    max: query.maxArea != null ? String(query.maxArea) : '',
  }))
  const [amenityDraft, setAmenityDraft] = useState<string[]>(() => query.amenities)
  const resetFilters = () => {
    setPriceDraft({ min: '', max: '' })
    setAreaDraft({ min: '', max: '' })
    setAmenityDraft([])
    setFiltersOpen(false)
    onResetFilters()
  }
  const activeFilterCount = Number(query.minPrice != null || query.maxPrice != null)
    + Number(query.minArea != null || query.maxArea != null) + query.amenities.length
    + (query.excludedAmenities?.length ?? 0) + Number(query.excludeRoommateShare)
    + Number(query.minAvailableSlots != null)
  const openFilters = () => {
    setPriceDraft({ min: query.minPrice != null ? String(query.minPrice) : '', max: query.maxPrice != null ? String(query.maxPrice) : '' })
    setAreaDraft({ min: query.minArea != null ? String(query.minArea) : '', max: query.maxArea != null ? String(query.maxArea) : '' })
    setAmenityDraft(query.amenities)
    setFiltersOpen(true)
  }

  const showMap = query.view !== 'list' && mapNode != null
  const showList = query.view !== 'map'
  const contextPanelOpen = showMap && Boolean(contextPanel)
  const mapFirst = query.view !== 'list'
  const [panelOpen, setPanelOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<'map' | 'list'>(query.view === 'list' ? 'list' : 'map')
  const viewChoices = [
    ['map', 'Bản đồ'],
    ['split', 'Chia đôi'],
    ['list', 'Danh sách'],
  ] as const

  const infiniteSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (query.view === 'map' || loading || cards.length < PAGE_SIZE) return
    const sentinel = infiniteSentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && !loading) {
          writeQuery({ page: query.page + 1 })
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [query.view, query.page, loading, cards.length])

  const renderListingCard = (id: string, view: ReturnType<typeof mapMarketplacePostToListingViewModel>) => {
    const selectedCard = selectedListingId === id
    const hovered = hoveredListingId === id
    return (
        <article
          className={`map-listings__card${!marketMode && view.isPremium ? ' premium-listing' : ''}${selectedCard ? ' is-selected' : ''}${hovered ? ' is-hot' : ''}`}
        >
          <ListingTrustBadges premium={!marketMode && view.isPremium} verified={view.isOwnerVerified} />
          <button
            type="button"
            className="map-listings__card-hit"
            data-glass-exclude
            aria-pressed={selectedCard}
            onMouseEnter={() => onHoverListing(id)}
            onMouseLeave={onLeaveListing}
            onFocus={() => onHoverListing(id)}
            onBlur={onLeaveListing}
            onClick={() => {
              if (!marketMode && query.view === 'list' && onOpenRoomDetail) {
                onOpenRoomDetail(id)
                return
              }
              if (marketMode && query.view === 'list') {
                const post = marketPosts.find(item => item.id === id)
                if (post) navigate(marketplaceItemUrl(post))
                return
              }
              onSelectListing(id)
            }}
          >
            <span className="map-listings__card-photo">
              <span className="map-listings__card-photo-empty">Chưa có ảnh</span>
              {view.thumbnailUrl ? (
                <img
                  src={view.thumbnailUrl}
                  srcSet={listingThumbSrcSet(view.thumbnailUrl)}
                  sizes="(max-width: 640px) 100vw, 320px"
                  loading="lazy"
                  decoding="async"
                  alt=""
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                />
              ) : null}
            </span>
            <span className="map-listings__card-copy">
              <span className="map-listings__price">{view.priceLabel}{!marketMode ? <small> / tháng</small> : null}</span>
              <span className="map-listings__name">{view.title}</span>
                <span className="map-listings__address">
                  <img src="/figma/map/map-pin.svg" alt="" width={13} height={13} />
                  <span className="map-listings__address-text" title={view.address}>{shortListingAddress(view.address) || 'Chưa có địa chỉ'}</span>
                </span>
              <span className="map-listings__meta">
                {view.areaLabel ? <span>{view.areaLabel}</span> : null}
                {view.typeLabel ? <span>{view.typeLabel}</span> : null}
                {view.highlightTag ? <span>{view.highlightTag}</span> : null}
                {!marketMode && !view.isPremium && view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
              </span>
              <span className="map-listings__facts">
                <span className="map-listings__fact-tag is-flood-free" title="Tuyến đường cao ráo không ngập mùa mưa">
                  <FloodFreeIcon size={11} /> Tuyến không ngập
                </span>
                <span className="map-listings__fact-tag is-security" title="Khu vực an ninh tốt, có camera quan sát">
                  <SecurityCameraIcon size={11} /> An ninh 24/7
                </span>
                {view.facts.map(fact => <span key={fact}>{fact}</span>)}
                {view.updatedAt && formatListingDate(view.updatedAt) ? <time dateTime={view.updatedAt}>Cập nhật {formatListingDate(view.updatedAt)}</time> : null}
              </span>
            </span>
          </button>
          {!marketMode ? <div className="map-listings__consideration"><RentalConsiderationToggle post={{ id, title: view.title }} /></div> : null}
          {!marketMode && onOpenRoomDetail ? <button type="button" className="map-listings__card-open" data-glass-exclude onClick={() => onOpenRoomDetail(id)}>Chi tiết & liên hệ <ArrowUpRightIcon size={14} /></button> : null}
          {!marketMode && onToggleSave ? (
            <button
              type="button"
              className={`map-listings__save${savedIds?.has(id) ? ' is-on' : ''}`}
              data-glass-exclude aria-pressed={Boolean(savedIds?.has(id))}
              aria-label={savedIds?.has(id) ? 'Bỏ lưu phòng' : 'Lưu phòng'}
              disabled={saveBusy && selectedListingId === id}
              onClick={(event) => {
                event.stopPropagation()
                onToggleSave(id)
              }}
            >
              <BookmarkIcon saved={savedIds?.has(id)} />
            </button>
          ) : null}
        </article>
    )
  }


  return (
    <div className={`map-listings map-listings--${query.view}${mapFirst ? ' is-map-first' : ''}`}>
      <header className="map-listings__header">
        <div className="map-listings__toolbar" aria-label="Tùy chỉnh kết quả">
          <div className="map-listings__catalog" role="group" aria-label="Loại tin" data-glass-exclude>
            {SOURCE_OPTIONS.map((option) => (
              <button key={option.id} type="button" className={query.catalog === option.id ? 'is-on' : ''}
                aria-pressed={query.catalog === option.id}
                onClick={() => {
                  if (query.catalog === option.id) return
                  setFiltersOpen(false)
                  writeQuery({ catalog: option.id, page: 1 }, { fit: true })
                }}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="map-listings__tools">
            <button type="button" className="map-listings__mobile-view" data-glass-exclude
              onClick={() => setView(query.view === 'list' ? 'map' : 'list')}>
              {query.view === 'list' ? 'Bản đồ' : 'Danh sách'}
            </button>
            <button ref={filterAnchor} type="button"
              className={`map-listings__filter-trigger${activeFilterCount ? ' is-active' : ''}`}
              aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={() => filtersOpen ? setFiltersOpen(false) : openFilters()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
              </svg>
              Lọc {activeFilterCount > 0 ? <span className="map-listings__filter-count">{activeFilterCount}</span> : null}
            </button>
            <label className="map-listings__sort" title="Sắp xếp kết quả">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m3 16 4 4 4-4M7 20V4m14 4-4-4-4 4m4-4v16" />
              </svg>
              <span className="map-listings__sr-only">Sắp xếp</span>
              <ChoicePicker value={sortBy} onChange={(event) => setSortBy(event.target.value as any)}>
                {sortChoices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </ChoicePicker>
            </label>
            <label className="map-listings__display">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M10 4v16" />
              </svg>
              <span className="map-listings__sr-only">Chế độ xem</span>
              <ChoicePicker value={query.view} onChange={(event) => setView(event.target.value as MapListingsView)}>
                {viewChoices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </ChoicePicker>
            </label>
          </div>
        </div>
        {!marketMode ? (
          <div className="map-listings__quick-chips-bar" role="group" aria-label="Bộ lọc nhanh" data-glass-exclude>
            {QUICK_CHIPS.map((chip) => {
              const active = chip.isActive(query)
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`map-listings__quick-chip${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    const patch = chip.toggle(query)
                    if (!active && chip.focus && onFocusSource) {
                      onFocusSource(chip.focus)
                    }
                    writeQuery({ ...patch, page: 1 }, { fit: true })
                  }}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}
        <FilterPopover anchorRef={filterAnchor} open={filtersOpen} onClose={() => setFiltersOpen(false)}
          className="map-listings__popover map-listings__filter-sheet"
          onSubmit={() => {
            writeQuery({
              minPrice: readDraft(priceDraft.min), maxPrice: readDraft(priceDraft.max),
              ...(filterConfig.area ? { minArea: readDraft(areaDraft.min), maxArea: readDraft(areaDraft.max), amenities: amenityDraft } : {}),
              page: 1,
            }, { fit: true })
            setFiltersOpen(false)
          }}>
          <div className="map-listings__sheet-heading">
            <div><strong>Bộ lọc</strong><p>Chọn những điều bạn cần.</p></div>
            <button type="button" className="map-listings__sheet-close" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}>×</button>
          </div>
          <div className="map-listings__sheet-body">
            {filterConfig.price ? (
              <>
                <FilterRange label="Khoảng giá" unit="đ" draft={priceDraft} onChange={setPriceDraft} />
                <div className="map-listings__quick-chips" role="group" aria-label="Mức giá nhanh">
                  {[
                    { id: 'under-3', label: '< 3 triệu', min: '', max: '3000000' },
                    { id: '3-to-5', label: '3 - 5 triệu', min: '3000000', max: '5000000' },
                    { id: 'above-5', label: '> 5 triệu', min: '5000000', max: '' },
                  ].map((preset) => {
                    const active = priceDraft.min === preset.min && priceDraft.max === preset.max
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`map-listings__quick-chip${active ? ' is-active' : ''}`}
                        onClick={() => {
                          if (active) {
                            setPriceDraft({ min: '', max: '' })
                          } else {
                            setPriceDraft({ min: preset.min, max: preset.max })
                          }
                        }}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}
            <fieldset className="map-listings__amenity-group">
              <legend>Trường Đại học & Tuyến Metro</legend>
              <div className="map-listings__quick-chips" role="group" aria-label="Trường đại học và metro lân cận">
                {CAMPUS_METRO_OPTIONS.map((item) => {
                  const active = matchesKeyword(query.keyword, item.keyword)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`map-listings__quick-chip${active ? ' is-active' : ''}`}
                      onClick={() => {
                        const nextKeyword = active ? '' : item.keyword
                        if (!active && item.focus && onFocusSource) {
                          onFocusSource(item.focus)
                        }
                        writeQuery({
                          keyword: nextKeyword,
                          minPrice: readDraft(priceDraft.min),
                          maxPrice: readDraft(priceDraft.max),
                          ...(filterConfig.area ? { minArea: readDraft(areaDraft.min), maxArea: readDraft(areaDraft.max), amenities: amenityDraft } : {}),
                          page: 1,
                        }, { fit: true })
                        setFiltersOpen(false)
                      }}
                    >
                      {item.isMetro ? <MetroTrainIcon size={13} /> : <GraduationCapIcon size={13} />}
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            {filterConfig.area ? <FilterRange label="Diện tích" unit="m²" draft={areaDraft} onChange={setAreaDraft} /> : null}
            {filterConfig.amenities.length > 0 ? (
              <fieldset className="map-listings__amenity-group">
                <legend>Tiện ích</legend>
                <div className="map-listings__quick-chips" role="group" aria-label="Tiện ích nhanh">
                  {[
                    { code: 'AIR_CONDITIONER', label: 'Máy lạnh', icon: <SnowflakeIcon size={13} /> },
                    { code: 'LOFT', label: 'Gác lửng', icon: <LoftLadderIcon size={13} /> },
                    { code: 'PRIVATE_BATHROOM', label: 'WC riêng', icon: <ShowerIcon size={13} /> },
                    { code: 'PET_FRIENDLY', label: 'Cho nuôi pet', icon: <PawIcon size={13} /> },
                  ].map((preset) => {
                    const active = amenityDraft.includes(preset.code)
                    return (
                      <button
                        key={preset.code}
                        type="button"
                        className={`map-listings__quick-chip${active ? ' is-active' : ''}`}
                        onClick={() => {
                          setAmenityDraft((current) =>
                            current.includes(preset.code)
                              ? current.filter((c) => c !== preset.code)
                              : [...current, preset.code]
                          )
                        }}
                      >
                        {preset.icon}
                        <span>{preset.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="map-listings__amenity-grid">
                  {filterConfig.amenities.map((option) => <label key={option.code}>
                    <input type="checkbox" checked={amenityDraft.includes(option.code)}
                      onChange={() => setAmenityDraft(current => current.includes(option.code) ? current.filter(code => code !== option.code) : [...current, option.code])} />
                    <span>{option.label}</span>
                  </label>)}
                </div>
              </fieldset>
            ) : null}
          </div>
          <div className="map-listings__sheet-footer">
            <button type="button" className="map-listings__sheet-reset" disabled={!queryHasActiveFilters(query) && !priceDraft.min && !priceDraft.max && !areaDraft.min && !areaDraft.max && !amenityDraft.length} onClick={resetFilters}>Đặt lại</button>
            <button type="submit" className="map-listings__sheet-apply">
              {cards.length > 0 ? `Xem ${cards.length} kết quả` : 'Áp dụng'}
            </button>
          </div>
        </FilterPopover>
      </header>

      <div className={`map-listings__stage${contextPanelOpen ? ' has-context-panel' : ''}`}>
        {showMap && showList && !contextPanelOpen ? <div className="map-listings__mobile-toggle" role="group" aria-label="Bản đồ hoặc danh sách">
          <button
            type="button"
            aria-pressed={mobilePane === 'map'}
            className={mobilePane === 'map' ? 'is-on' : ''}
            onClick={() => setMobilePane('map')}
          >
            Bản đồ
          </button>
          <button
            type="button"
            aria-pressed={mobilePane === 'list'}
            className={mobilePane === 'list' ? 'is-on' : ''}
            onClick={() => setMobilePane('list')}
          >
            Danh sách
          </button>
        </div> : null}

        {showMap ? (
          <section
            className={`map-listings__map${mobilePane === 'list' && !contextPanelOpen ? ' is-mobile-hidden' : ''}`}
            aria-label="Bản đồ khu vực"
          >
            {mapNode}
            {query.view === 'split' && !panelOpen && !contextPanelOpen ? (
              <button type="button" className="map-listings__panel-open" onClick={() => setPanelOpen(true)}>
                Danh sách
              </button>
            ) : null}
            <button
                type="button"
                className={`map-listings__move${query.searchOnMove ? ' is-on' : ''}`}
                data-glass-exclude aria-pressed={query.searchOnMove}
                disabled={viewportPaused}
                title={viewportPaused ? 'Đóng vị trí đang xem để tiếp tục tìm tin khi di chuyển bản đồ.' : undefined}
                onClick={() =>
                  writeQuery({
                    searchOnMove: !query.searchOnMove,
                    bounds: query.searchOnMove ? null : query.bounds,
                  })
                }
              >
                <span className="map-listings__move-check" aria-hidden>
                  {query.searchOnMove ? <img src="/figma/map/check.svg" alt="" width={11} height={11} /> : null}
                </span>
                {viewportPaused ? 'Đang giữ khu vực tìm kiếm' : 'Tìm khi di chuyển bản đồ'}
              </button>
            {selected && query.view !== 'list' ? (
              <PreviewCard
                onClose={onClearSelection}
                onOpenNearby={onOpenNearby}
                view={selected.view}
                monthly={!marketMode}
                considerationPost={!marketMode ? { id: selected.id, title: selected.view.title } : undefined}
                saved={savedIds?.has(selected.id)}
                saveBusy={saveBusy}
                onToggleSave={!marketMode && onToggleSave ? () => onToggleSave(selected.id) : undefined}
                onOpen={() => {
                  if (!marketMode && onOpenRoomDetail) onOpenRoomDetail(selected.id)
                  else if (marketMode) { const post = marketPosts.find(item => item.id === selected.id); if (post) navigate(marketplaceItemUrl(post)) }
                  else onSelectListing(selected.id)
                }}
              />
            ) : null}
          </section>
        ) : null}

        {contextPanelOpen ? <div className="map-listings__context-panel">{contextPanel}</div> : null}

        {showList && !contextPanelOpen ? (
          <aside
            className={`map-listings__panel${mobilePane === 'map' && showMap ? ' is-mobile-hidden' : ''}${panelOpen ? '' : ' is-collapsed'}`}
            aria-label="Danh sách kết quả"
          >
            {query.view === 'split' ? <div className="map-listings__panel-head">
              <div><strong className="map-listings__panel-caption">{marketMode ? 'Đồ dùng trong khu vực' : apartmentMode ? 'Căn hộ trong khu vực' : 'Phòng trọ trong khu vực'}</strong></div>
            </div> : null}
            <div
              ref={panelBodyRef}
              className="map-listings__panel-body"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {(pullY > 0 || pullRefreshing) ? (
                <div
                  className={`map-listings__pull-indicator${pullRefreshing ? ' is-refreshing' : ''}`}
                  style={{ height: `${pullY}px` }}
                  role="status"
                  aria-live="polite"
                >
                  <div className="map-listings__pull-indicator-content">
                    {pullRefreshing ? (
                      <>
                        <span className="map-listings__pull-spinner" aria-hidden="true" />
                        <span>Đang làm mới…</span>
                      </>
                    ) : pullY >= PULL_THRESHOLD ? (
                      <>
                        <span className="map-listings__pull-arrow is-flipped" aria-hidden="true">↓</span>
                        <span>Thả để làm mới</span>
                      </>
                    ) : (
                      <>
                        <span className="map-listings__pull-arrow" aria-hidden="true">↓</span>
                        <span>Kéo để làm mới</span>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="map-listings__state" role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={resetFilters}>
                    Thử lại
                  </button>
                </div>
              ) : loading && cards.length === 0 && marketMode ? (
                <ul className="map-listings__cards sk-screen" role="status" aria-busy="true" aria-label={marketMode ? 'Đang tải chợ đồ…' : 'Đang tải phòng…'}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <li key={i}>
                      <SkCard style={{ padding: 0, overflow: 'hidden', gap: 0, width: '100%' }}>
                        <Sk h={140} r={0} />
                        <div className="sk-stack" style={{ padding: 12 }}>
                          <Sk w="85%" h={14} />
                          <Sk w="55%" h={11} />
                          <Sk w={100} h={16} />
                          <Sk w="70%" h={10} />
                        </div>
                      </SkCard>
                    </li>
                  ))}
                </ul>
              ) : cards.length === 0 && marketMode ? (
                <div className="map-listings__state map-listings__smart-empty" role="status">
                  <div className="map-listings__empty-icon" aria-hidden="true">
                    <TagIcon size={28} />
                    <SparkleIcon size={20} />
                  </div>
                  <h3 className="map-listings__empty-title">Chưa tìm thấy món đồ phù hợp</h3>
                  <p className="map-listings__empty-desc">Không có tin chợ khớp bộ lọc. Thử đặt lại bộ lọc để xem thêm đồ thanh lý từ sinh viên quanh đây.</p>
                  <div className="map-listings__empty-actions">
                    <button type="button" className="btn-empty-reset" onClick={resetFilters}>
                      Đặt lại bộ lọc
                    </button>
                  </div>
                </div>
              ) : (
                marketMode ? <MarketplaceSellerCatalog posts={marketPosts} layout="list"
                  renderItem={post => renderListingCard(post.id, mapMarketplacePostToListingViewModel(post))} /> :
                null
              )}
              {!marketMode && <RentalSourceResults nativeIds={cards.map(card => card.id)} nativeCards={cards.map(({ id, view }) => renderListingCard(id, view))} query={query} onCount={setSourceCounts} onResetFilters={resetFilters} onFocus={onFocusSource ? location => { if (query.view === 'list') writeQuery({ view: 'split' }); onFocusSource(location) } : undefined} />}
              <div ref={infiniteSentinelRef} className="map-listings__sentinel" aria-hidden="true" />
              {loading && query.page > 1 ? (
                <div className="map-listings__loading-more" role="status">
                  <span className="map-listings__loading-spinner" aria-hidden="true" />
                  <span>Đang tải thêm phòng…</span>
                </div>
              ) : null}
              {(query.view === 'list' || marketMode) && (query.page > 1 || cards.length >= PAGE_SIZE) ? (
                <div className="map-listings__pager">
                  {query.page > 1 ? (
                    <button type="button" onClick={() => writeQuery({ page: query.page - 1 })}>
                      Trang trước
                    </button>
                  ) : null}
                  {cards.length >= PAGE_SIZE ? (
                    <button type="button" onClick={() => writeQuery({ page: query.page + 1 })}>
                      Trang sau
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function readDraft(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

function FilterPopover({
  anchorRef,
  open,
  onClose,
  className,
  children,
  onSubmit,
}: {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  className: string
  children: ReactNode
  onSubmit: () => void
}) {
  const popRef = useRef<HTMLFormElement>(null)
  useDismissOnOutside(open, [anchorRef, popRef], onClose)
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = anchorRef.current
      const pop = popRef.current
      if (!anchor || !pop) return
      if (window.innerWidth <= 767) {
        pop.style.position = 'fixed'
        pop.style.zIndex = '80'
        pop.style.left = '0px'
        pop.style.right = '0px'
        pop.style.top = 'auto'
        pop.style.bottom = '0px'
        return
      }
      const rect = anchor.getBoundingClientRect()
      const margin = 8
      const width = pop.offsetWidth
      const height = pop.offsetHeight
      let left = rect.left
      let top = rect.bottom + 6
      if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
      if (left < margin) left = margin
      if (top + height > window.innerHeight - margin) {
        const above = rect.top - height - 6
        top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin)
      }
      pop.style.position = 'fixed'
      pop.style.zIndex = '80'
      pop.style.left = `${left}px`
      pop.style.top = `${top}px`
      pop.style.right = 'auto'
      pop.style.bottom = 'auto'
    }
    place()
    const form = popRef.current
    const trigger = anchorRef.current
    form?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      if (form?.contains(document.activeElement)) trigger?.focus({ preventScroll: true })
    }
  }, [open, anchorRef])
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <form
      ref={popRef}
      role="dialog"
      aria-label="Bộ lọc tìm kiếm"
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>,
    document.body,
  )
}

function FilterRange({ label, unit, draft, onChange }: {
  label: string; unit: string; draft: RangeDraft; onChange: (draft: RangeDraft) => void
}) {
  const field = (bound: 'min' | 'max') => {
    const props = { 'aria-label': `${label} ${bound === 'min' ? 'tối thiểu' : 'tối đa'}`, placeholder: 'Không giới hạn', value: draft[bound] }
    return unit === 'đ'
      ? <MoneyInput {...props} min={bound === 'min' ? '0' : draft.min || '0'} onValueChange={value => onChange({ ...draft, [bound]: value })} />
      : <input {...props} type="number" min={bound === 'min' ? '0' : draft.min || '0'} step="any" inputMode="decimal" onChange={event => onChange({ ...draft, [bound]: event.target.value })} />
  }
  return <fieldset className="map-listings__range-group">
    <legend>{label}</legend>
    <div className="map-listings__range-inputs" data-glass-exclude>
      <label>Từ<div>{field('min')}<span>{unit}</span></div></label>
      <span className="map-listings__range-dash" aria-hidden="true">—</span>
      <label>Đến<div>{field('max')}<span>{unit}</span></div></label>
    </div>
  </fieldset>
}
