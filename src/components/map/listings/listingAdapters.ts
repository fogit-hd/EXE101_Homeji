import type { MarketplacePost, RentalPostSearchParams, RentalPostSummary } from '../../../api/types'
import { MarketplaceListingType } from '../../../api/types'
import { AMENITY_OPTIONS, amenityLabel, formatPrice, rentalPostTypeLabel } from '../../../lib/labels'
import { isValidCoord } from '../../../lib/googleMaps'
import { isInHomejiServiceArea } from '../../../lib/homejiServiceArea'
import type { MarketplaceMapPin } from '../../../lib/marketplaceSellerPins'
import type { MapSearchBBox } from '../../../lib/placeAutocomplete'

/** Query fields `GET /api/rental-posts` actually accepts. */
const SUPPORTED_FILTER_KEYS = [
  'excludedAmenities',
  'excludeRoommateShare',
  'ids',
  'keyword',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'maxDeposit',
  'minAvailableSlots',
  'availableFromBefore',
  'minLatitude',
  'maxLatitude',
  'minLongitude',
  'maxLongitude',
  'amenities',
  'page',
  'pageSize',
] as const

export type SupportedFilterKey = (typeof SUPPORTED_FILTER_KEYS)[number]

const UI_KEYS = ['section', 'post', 'view', 'searchOnMove', 'placeId', 'placeName'] as const

const GATEWAY_KEYS = [
  'paymentId',
  'orderCode',
  'orderId',
  'status',
  'code',
  'cancel',
  'partnerCode',
  'resultCode',
  'extraData',
  'signature',
  'requestId',
] as const

export type MapListingsView = 'split' | 'map' | 'list'

/**
 * `rooms` is GET /api/rental-posts (no listing-type param — vacant, roommate, and transfer share that feed).
 * `market` is GET /api/marketplace-posts.
 * Roommate has no search param and no separate listing endpoint, so it is not a catalog value.
 */
export type ListingCatalog = 'rooms' | 'market'

export type ListingQuery = {
  excludedAmenities?: string[]
  excludeRoommateShare?: boolean
  minAvailableSlots?: number
  ids?: string[]
  catalog: ListingCatalog
  keyword: string
  minPrice?: number
  maxPrice?: number
  minArea?: number
  maxArea?: number
  amenities: string[]
  page: number
  bounds: MapSearchBBox | null
  searchOnMove: boolean
  view: MapListingsView
}

export type ListingViewModel = {
  id: string
  title: string
  priceLabel: string
  areaLabel: string
  address: string
  thumbnailUrl: string | null
  latitude: number
  longitude: number
  typeLabel: string
  highlightTag: string | null
  ownerBadge: string | null
}

export type FilterConfig = {
  price: boolean
  area: boolean
  amenities: { code: string; label: string }[]
  bounds: boolean
}

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const moneyLabel = (value: number) =>
  Number.isFinite(value) ? money.format(value) : formatPrice(0)

export function mapBackendListingToListingViewModel(post: RentalPostSummary): ListingViewModel {
  const area = Number(post.area)
  return {
    id: post.id,
    title: post.title,
    priceLabel: moneyLabel(post.price),
    areaLabel: Number.isFinite(area) && area > 0 ? `${area} m²` : '',
    address: post.address,
    thumbnailUrl: post.thumbnailPath,
    latitude: post.latitude,
    longitude: post.longitude,
    typeLabel: rentalPostTypeLabel[post.type] ?? '',
    highlightTag: post.highlightTag?.trim() || null,
    ownerBadge: post.ownerBadge?.trim() || null,
  }
}

/** Amenity codes are the metadata the create form stores and search matches. */
export function mapFilterMetadataToFilterConfig(catalog: ListingCatalog = 'rooms'): FilterConfig {
  if (catalog === 'market') {
    return {
      price: true,
      area: false,
      amenities: [],
      bounds: true,
    }
  }
  return {
    price: true,
    area: true,
    amenities: validateFilterAgainstCapabilities('amenities')
      ? AMENITY_OPTIONS.map((code) => ({ code, label: amenityLabel(code) }))
      : [],
    bounds: true,
  }
}

export function mapMarketplacePostToListingViewModel(post: MarketplacePost): ListingViewModel {
  const latitude = Number(post.latitude)
  const longitude = Number(post.longitude)
  return {
    id: post.id,
    title: post.title,
    priceLabel: moneyLabel(post.price),
    areaLabel: '',
    address: post.address,
    thumbnailUrl: post.mediaUrls?.find((url) => url.trim()) ?? null,
    latitude,
    longitude,
    typeLabel: post.category?.trim() || 'Chợ đồ',
    highlightTag: null,
    ownerBadge: post.sellerDisplayName?.trim() || null,
  }
}

/** One marker per marketplace post that already has a real coordinate. */
export function marketplacePostsToListingPins(posts: MarketplacePost[]): MarketplaceMapPin[] {
  const pins: MarketplaceMapPin[] = []
  for (const post of posts) {
    const lat = Number(post.latitude)
    const lng = Number(post.longitude)
    if (!isValidCoord(lat, lng) || !isInHomejiServiceArea(lat, lng)) continue
    pins.push({
      id: post.id,
      sellerId: post.sellerId,
      title: post.title?.trim() || 'Chợ đồ',
      lat,
      lng,
      itemCount: 1,
      foodCount: post.listingType === MarketplaceListingType.Food ? 1 : 0,
      postIds: [post.id],
    })
  }
  return pins
}

export function validateFilterAgainstCapabilities(key: string): boolean {
  return (SUPPORTED_FILTER_KEYS as readonly string[]).includes(key)
}

function readNumber(params: URLSearchParams, key: SupportedFilterKey): number | undefined {
  if (!validateFilterAgainstCapabilities(key)) return undefined
  const raw = params.get(key)
  if (raw == null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function readView(params: URLSearchParams): MapListingsView {
  const view = params.get('view')
  if (view === 'map' || view === 'list' || view === 'split') return view
  return 'split'
}

export function parseFiltersFromURL(params: URLSearchParams): ListingQuery {
  const searchOnMove = params.get('searchOnMove') !== '0'
  const minLatitude = readNumber(params, 'minLatitude')
  const maxLatitude = readNumber(params, 'maxLatitude')
  const minLongitude = readNumber(params, 'minLongitude')
  const maxLongitude = readNumber(params, 'maxLongitude')
  const bounds =
    searchOnMove &&
    minLatitude != null &&
    maxLatitude != null &&
    minLongitude != null &&
    maxLongitude != null
      ? { minLatitude, maxLatitude, minLongitude, maxLongitude }
      : null
  const page = readNumber(params, 'page')
  return {
    excludedAmenities: params.getAll('excludedAmenities'),
    excludeRoommateShare: params.get('excludeRoommateShare') === 'true',
    minAvailableSlots: readNumber(params, 'minAvailableSlots'),
    ids: params.getAll('ids'),
    catalog: params.get('catalog') === 'market' ? 'market' : 'rooms',
    keyword: params.get('keyword')?.trim() ?? '',
    minPrice: readNumber(params, 'minPrice'),
    maxPrice: readNumber(params, 'maxPrice'),
    minArea: readNumber(params, 'minArea'),
    maxArea: readNumber(params, 'maxArea'),
    amenities: params
      .getAll('amenities')
      .map((code) => code.trim())
      .filter((code) => code.length > 0),
    page: page != null && page >= 1 ? Math.floor(page) : 1,
    bounds,
    searchOnMove,
    view: readView(params),
  }
}

export function listingQueryToSearchParams(query: ListingQuery): RentalPostSearchParams {
  const params: RentalPostSearchParams = {
    page: query.page,
    pageSize: 20,
  }
  if (query.excludedAmenities?.length) params.excludedAmenities = query.excludedAmenities
  if (query.excludeRoommateShare) params.excludeRoommateShare = true
  if (query.minAvailableSlots != null) params.minAvailableSlots = query.minAvailableSlots
  if (query.ids?.length) params.ids = query.ids
  if (query.keyword && validateFilterAgainstCapabilities('keyword')) {
    params.keyword = query.keyword
  }
  if (query.minPrice != null && validateFilterAgainstCapabilities('minPrice')) {
    params.minPrice = query.minPrice
  }
  if (query.maxPrice != null && validateFilterAgainstCapabilities('maxPrice')) {
    params.maxPrice = query.maxPrice
  }
  if (query.minArea != null && validateFilterAgainstCapabilities('minArea')) {
    params.minArea = query.minArea
  }
  if (query.maxArea != null && validateFilterAgainstCapabilities('maxArea')) {
    params.maxArea = query.maxArea
  }
  if (query.amenities.length && validateFilterAgainstCapabilities('amenities')) {
    params.amenities = query.amenities
  }
  if (query.searchOnMove && query.bounds && validateFilterAgainstCapabilities('minLatitude')) {
    params.minLatitude = query.bounds.minLatitude
    params.maxLatitude = query.bounds.maxLatitude
    params.minLongitude = query.bounds.minLongitude
    params.maxLongitude = query.bounds.maxLongitude
  }
  return params
}

/** Marketplace search accepts a center and radius, not the rental bbox keys. Backend clamps radius to 50 km. */
export function listingQueryToMarketplaceParams(query: ListingQuery): {
  keyword?: string
  minPrice?: number
  maxPrice?: number
  latitude?: number
  longitude?: number
  radiusKm?: number
  page: number
  pageSize: number
} {
  const params: {
    keyword?: string
    minPrice?: number
    maxPrice?: number
    latitude?: number
    longitude?: number
    radiusKm?: number
    page: number
    pageSize: number
  } = {
    page: query.page,
    pageSize: 20,
  }
  if (query.keyword) params.keyword = query.keyword
  if (query.minPrice != null) params.minPrice = query.minPrice
  if (query.maxPrice != null) params.maxPrice = query.maxPrice
  if (query.searchOnMove && query.bounds) {
    const location = boundsToMarketLocation(query.bounds)
    if (location) {
      params.latitude = location.latitude
      params.longitude = location.longitude
      params.radiusKm = location.radiusKm
    }
  }
  return params
}

function boundsToMarketLocation(bounds: MapSearchBBox): {
  latitude: number
  longitude: number
  radiusKm: number
} | null {
  const latitude = (bounds.minLatitude + bounds.maxLatitude) / 2
  const longitude = (bounds.minLongitude + bounds.maxLongitude) / 2
  if (!isValidCoord(latitude, longitude)) return null
  const halfLatKm = (Math.abs(bounds.maxLatitude - bounds.minLatitude) * 111) / 2
  const cosine = Math.max(0.01, Math.cos((latitude * Math.PI) / 180))
  const halfLngKm = (Math.abs(bounds.maxLongitude - bounds.minLongitude) * 111 * cosine) / 2
  const radiusKm = Math.min(50, Math.max(0.1, Math.hypot(halfLatKm, halfLngKm)))
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    radiusKm: Number(radiusKm.toFixed(2)),
  }
}

export function filtersSignature(query: ListingQuery): string {
  return JSON.stringify(
    query.catalog === 'market' ? listingQueryToMarketplaceParams(query) : listingQueryToSearchParams(query),
  )
}

export function nonBoundsSignature(query: ListingQuery): string {
  if (query.catalog === 'market') {
    const { latitude, longitude, radiusKm, ...rest } = listingQueryToMarketplaceParams(query)
    void latitude
    void longitude
    void radiusKm
    return JSON.stringify({ catalog: 'market', ...rest })
  }
  const { minLatitude, maxLatitude, minLongitude, maxLongitude, ...rest } =
    listingQueryToSearchParams(query)
  void minLatitude
  void maxLatitude
  void minLongitude
  void maxLongitude
  return JSON.stringify({ catalog: 'rooms', ...rest })
}

function copyKeys(from: URLSearchParams, to: URLSearchParams, keys: readonly string[]) {
  for (const key of keys) {
    const values = from.getAll(key)
    for (const value of values) {
      if (value) to.append(key, value)
    }
  }
}

export function serializeFiltersToQuery(
  query: ListingQuery,
  incoming: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams()
  copyKeys(incoming, next, UI_KEYS)
  copyKeys(incoming, next, GATEWAY_KEYS)

  if (query.view === 'map') next.set('view', 'map')
  else if (query.view === 'list') next.set('view', 'list')
  else next.delete('view')

  if (query.catalog === 'market') next.set('catalog', 'market')
  else next.delete('catalog')

  if (query.searchOnMove) next.delete('searchOnMove')
  else next.set('searchOnMove', '0')

  if (query.keyword) next.set('keyword', query.keyword)
  else next.delete('keyword')

  const setNum = (key: SupportedFilterKey, value: number | undefined) => {
    if (value == null || !validateFilterAgainstCapabilities(key)) next.delete(key)
    else next.set(key, String(value))
  }
  setNum('minPrice', query.minPrice)
  setNum('maxPrice', query.maxPrice)
  setNum('minArea', query.minArea)
  setNum('maxArea', query.maxArea)
  setNum('minAvailableSlots', query.minAvailableSlots)
  if (query.excludeRoommateShare) next.set('excludeRoommateShare', 'true')
  for (const code of query.excludedAmenities ?? []) next.append('excludedAmenities', code)
  for (const id of query.ids ?? []) next.append('ids', id)
  next.delete('amenities')
  if (validateFilterAgainstCapabilities('amenities')) {
    for (const code of query.amenities) next.append('amenities', code)
  }
  if (query.page > 1) next.set('page', String(query.page))
  else next.delete('page')

  const bounds = query.searchOnMove ? query.bounds : null
  setNum('minLatitude', bounds?.minLatitude)
  setNum('maxLatitude', bounds?.maxLatitude)
  setNum('minLongitude', bounds?.minLongitude)
  setNum('maxLongitude', bounds?.maxLongitude)
  return next
}

export function queryHasActiveFilters(query: ListingQuery): boolean {
  return Boolean(
    query.keyword ||
      query.minPrice != null ||
      query.maxPrice != null ||
      query.minArea != null ||
      query.maxArea != null ||
      query.amenities.length ||
      (query.excludedAmenities?.length ?? 0) || query.excludeRoommateShare || query.minAvailableSlots || query.ids?.length,
  )
}
