import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPlacePredictions, searchNearbyPlaces, type NearbyPlaceCategory } from '../lib/placeAutocomplete'
import { useGoogleMaps } from './GoogleMapsProvider'
import type { NearbyAnchor } from '../components/map/MapNearbyPanel'
import { isUsefulSearchQuery } from '../lib/searchQuery'

export type SearchContextName =
  | 'global'
  | 'housing'
  | 'map'
  | 'food'
  | 'marketplace'
  | 'myListings'
  | 'roommate'

export type SearchSuggestion = {
  id: string
  title: string
  subtitle: string
}

const PLACEHOLDER: Record<SearchContextName, string> = {
  global: 'Tìm phòng, khu vực, đồ dùng hoặc người ở ghép…',
  housing: 'Tìm khu vực, đường, trường học hoặc nơi làm việc…',
  map: 'Tìm địa điểm hoặc phòng trên bản đồ…',
  food: 'Tìm món, nguyên liệu hoặc tên bếp…',
  marketplace: 'Tìm sản phẩm…',
  myListings: 'Tìm trong tin của tôi…',
  roommate: 'Tìm người ở ghép theo khu vực…',
}

const CONTEXT_COPY: Record<SearchContextName, { title: string; scope: string }> = {
  global: { title: 'Tìm nơi ở hợp gu', scope: 'Phòng, khu vực và hơn thế nữa' },
  housing: { title: 'Tìm phòng', scope: 'Khu vực, đường, trường hoặc nơi làm' },
  map: { title: 'Tìm trên bản đồ', scope: 'Địa điểm hoặc phòng quanh bạn' },
  food: { title: 'Tìm món', scope: 'Nguyên liệu hoặc tên bếp' },
  marketplace: { title: 'Tìm sản phẩm', scope: 'Đồ dùng đang mở bán' },
  myListings: { title: 'Tin của tôi', scope: 'Tìm trong tin bạn đã đăng' },
  roommate: { title: 'Ở ghép', scope: 'Theo khu vực bạn quan tâm' },
}

const EMPTY_SUGGESTIONS: SearchSuggestion[] = []
const RECENT_KEY = 'homeji:map-search-recent'

type QueryMap = Partial<Record<SearchContextName, string>>

type SearchState = {
  nearbyAnchor: NearbyAnchor | null
  setNearbyAnchor: (anchor: NearbyAnchor | null) => void
  nearbyCategory: NearbyPlaceCategory
  setNearbyCategory: (category: NearbyPlaceCategory) => void
  nearbySuggestions: SearchSuggestion[]
  nearbyLoading: boolean
  context: SearchContextName
  query: string
  queryByContext: QueryMap
  placeholder: string
  contextTitle: string
  contextScope: string
  suggestions: SearchSuggestion[]
  recentSearches: string[]
  isLoading: boolean
  setQuery: (value: string) => void
  submit: (value?: string) => void
  clear: () => void
  pickSuggestion: (item: SearchSuggestion) => void
}

const SearchReactContext = createContext<SearchState | null>(null)

function resolveSearchContext(pathname: string, search: string): SearchContextName {
  if (pathname !== '/') return 'global'
  const params = new URLSearchParams(search)
  const section = params.get('section')
  if (section === 'invitations') return 'roommate'
  if (section === 'marketplace') {
    const market = params.get('market')
    if (market === 'mine') return 'myListings'
    if (market === 'browse') return 'marketplace'
    if (market === 'food' || (!market && !params.get('wallet'))) return 'food'
    return 'global'
  }
  if (section === 'listings' || params.get('post')) {
    return params.get('view') === 'list' ? 'housing' : 'map'
  }
  return 'global'
}

function readUrlQuery(context: SearchContextName, search: string): { value: string; explicit: boolean } {
  const params = new URLSearchParams(search)
  if (context === 'food' || context === 'marketplace' || context === 'myListings') {
    return { value: params.get('q') ?? '', explicit: params.has('q') }
  }
  if (context === 'housing' || context === 'map') {
    return { value: params.get('keyword') ?? '', explicit: params.has('keyword') }
  }
  return { value: '', explicit: false }
}

function destinationFor(context: SearchContextName, raw: string, currentSearch: string): string | null {
  const query = raw.trim()
  if (context === 'roommate') return null
  const params = new URLSearchParams(currentSearch)
  if (context === 'food' || context === 'marketplace' || context === 'myListings') {
    params.set('section', 'marketplace')
    params.set('market', context === 'food' ? 'food' : context === 'myListings' ? 'mine' : 'browse')
    params.delete('wallet')
    if (query) params.set('q', query)
    else params.delete('q')
    return `/?${params.toString()}`
  }
  if (context === 'housing' || context === 'map') {
    params.set('section', 'listings')
    params.delete('post')
    params.delete('placeId')
    params.delete('placeName')
    if (context === 'housing') params.set('view', 'list')
    else if (params.get('view') === 'list') params.delete('view')
    if (query) params.set('keyword', query)
    else params.delete('keyword')
    params.delete('page')
    return `/?${params.toString()}`
  }
  const next = new URLSearchParams()
  next.set('section', 'listings')
  next.set('view', 'list')
  if (query) next.set('keyword', query)
  return `/?${next.toString()}`
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
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
      if (words.length === 6) break
    }
    return words
  } catch {
    return []
  }
}

function remember(keyword: string) {
  if (!isUsefulSearchQuery(keyword)) return
  const prev = loadRecent().filter((item) => item !== keyword)
  const next = [{ keyword, title: keyword, kind: 'recent' }, ...prev.map((item) => ({ keyword: item, title: item, kind: 'recent' }))].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

type SuggestionPack = { key: string; items: SearchSuggestion[]; loading: boolean }

export function SearchProvider({ children }: { children: ReactNode }) {
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const [nearbyAnchor, setNearbyAnchor] = useState<NearbyAnchor | null>(null)
  const [nearbyCategory, setNearbyCategory] = useState<NearbyPlaceCategory>('food')
  const [nearbyPack, setNearbyPack] = useState<SuggestionPack>({ key: '', items: [], loading: false })
  const location = useLocation()
  const navigate = useNavigate()
  const context = resolveSearchContext(location.pathname, location.search)
  const url = readUrlQuery(context, location.search)
  const urlStamp = `${context}\0${url.explicit ? '1' : '0'}\0${url.explicit ? url.value : ''}`
  const [appliedStamp, setAppliedStamp] = useState(urlStamp)
  const [queryByContext, setQueryByContext] = useState<QueryMap>(() => url.explicit ? { [context]: url.value } : {})
  const [suggestionPack, setSuggestionPack] = useState<SuggestionPack>({ key: '', items: [], loading: false })
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecent)
  const suggestAbort = useRef<AbortController | null>(null)

  if (appliedStamp !== urlStamp) {
    setAppliedStamp(urlStamp)
    if (url.explicit) {
      setQueryByContext((prev) => {
        if ((prev[context] ?? '') === url.value) return prev
        return { ...prev, [context]: url.value }
      })
    }
  }

  const query = queryByContext[context] ?? ''
  const placeSearch = context === 'global' || context === 'housing' || context === 'map'
  const nearbyKey = placeSearch && nearbyAnchor ? `${nearbyAnchor.lat}:${nearbyAnchor.lng}:${nearbyAnchor.placeId ?? ''}:${nearbyCategory}` : ''
  const nearbySuggestions = nearbyKey && nearbyPack.key === nearbyKey ? nearbyPack.items : EMPTY_SUGGESTIONS
  const nearbyLoading = Boolean(nearbyKey && mapsLoaded && (nearbyPack.key !== nearbyKey || nearbyPack.loading))
  useEffect(() => {
    if (!nearbyKey || !nearbyAnchor || !mapsLoaded) return
    let cancelled = false
    void searchNearbyPlaces(nearbyAnchor, nearbyCategory, { limit: 5 })
      .then((items) => {
        if (!cancelled) setNearbyPack({ key: nearbyKey, loading: false, items: items
          .filter((item) => item.placeId !== nearbyAnchor.placeId)
          .map((item) => ({ id: item.placeId, title: item.title, subtitle: `${item.distanceMeters} m · ${item.typeLabel} · ${item.address}` })) })
      })
      .catch(() => {
        if (!cancelled) setNearbyPack({ key: nearbyKey, loading: false, items: [] })
      })
    return () => { cancelled = true }
  }, [nearbyAnchor, nearbyCategory, nearbyKey, mapsLoaded])
  const suggestText = query.trim()
  const canSuggest = placeSearch && suggestText.length >= 2 && isUsefulSearchQuery(suggestText)
  const suggestions = canSuggest && suggestionPack.key === suggestText ? suggestionPack.items : EMPTY_SUGGESTIONS
  const isLoading = canSuggest && (suggestionPack.key !== suggestText || suggestionPack.loading)

  const setQuery = useCallback((value: string) => {
    setQueryByContext((prev) => ({ ...prev, [context]: value }))
  }, [context])

  useEffect(() => {
    if (!canSuggest) return
    const controller = new AbortController()
    suggestAbort.current = controller
    const timer = window.setTimeout(() => {
      setSuggestionPack((prev) => (
        prev.key === suggestText && prev.loading ? prev : { key: suggestText, items: [], loading: true }
      ))
      void fetchPlacePredictions(suggestText, { limit: 6 })
        .then((items) => {
          if (controller.signal.aborted) return
          setSuggestionPack({
            key: suggestText,
            loading: false,
            items: items.map((item) => ({
              id: item.placeId,
              title: item.title,
              subtitle: item.subtitle,
            })),
          })
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setSuggestionPack({ key: suggestText, items: [], loading: false })
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [canSuggest, suggestText])

  const submit = useCallback((value?: string) => {
    const next = (value ?? query).trim()
    suggestAbort.current?.abort()
    setSuggestionPack({ key: next, items: [], loading: false })
    setQueryByContext((prev) => ({ ...prev, [context]: next }))
    if (isUsefulSearchQuery(next)) {
      remember(next)
      setRecentSearches(loadRecent())
    }
    const href = destinationFor(context, next, location.search)
    if (!href) return
    if (`${location.pathname}${location.search}` === href) return
    navigate(href)
  }, [context, location.pathname, location.search, navigate, query])

  const clear = useCallback(() => {
    setQueryByContext((prev) => ({ ...prev, [context]: '' }))
    setSuggestionPack({ key: '', items: [], loading: false })
    const href = destinationFor(context, '', location.search)
    if (href && `${location.pathname}${location.search}` !== href) navigate(href)
  }, [context, location.pathname, location.search, navigate])

  const pickSuggestion = useCallback((item: SearchSuggestion) => {
    const params = new URLSearchParams(location.search)
    params.set('section', 'listings')
    params.set('view', 'map')
    params.set('placeId', item.id)
    params.set('placeName', item.title)
    params.delete('post')
    params.delete('keyword')
    params.delete('page')
    navigate(`/?${params.toString()}`)
    setQueryByContext((prev) => ({ ...prev, map: item.title }))
  }, [location.search, navigate])

  const value = useMemo<SearchState>(() => ({
    nearbyAnchor, setNearbyAnchor, nearbyCategory, setNearbyCategory, nearbySuggestions, nearbyLoading,
    context,
    query,
    queryByContext,
    placeholder: PLACEHOLDER[context],
    contextTitle: CONTEXT_COPY[context].title,
    contextScope: CONTEXT_COPY[context].scope,
    suggestions,
    recentSearches,
    isLoading,
    setQuery,
    submit,
    clear,
    pickSuggestion,
  }), [clear, context, isLoading, pickSuggestion, query, queryByContext, recentSearches, setQuery, submit, suggestions, nearbyAnchor, nearbyCategory, nearbySuggestions, nearbyLoading])

  return <SearchReactContext.Provider value={value}>{children}</SearchReactContext.Provider>
}

// Hook lives next to the provider so callers share one import path.
// eslint-disable-next-line react-refresh/only-export-components
export function useSearch(): SearchState {
  const value = useContext(SearchReactContext)
  if (!value) throw new Error('useSearch must be used within SearchProvider')
  return value
}
