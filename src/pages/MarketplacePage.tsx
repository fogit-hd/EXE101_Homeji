import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  acceptMarketplaceOrder,
  archiveMarketplacePost,
  cancelMarketplaceOrder,
  completeMarketplaceOrder,
  createMarketplaceCartOrder,
  createMarketplaceOrder,
  createMarketplacePost,
  createMomoPayment,
  createPayOsPayment,
  getMyMarketplaceOrders,
  getMyMarketplacePosts,
  getMyWallet,
  getMyWalletTransactions,
  getMyWalletWithdrawals,
  getStoredSession,
  markMarketplacePostSold,
  markMarketplaceOrderDelivered,
  rejectMarketplaceOrder,
  searchMarketplacePosts,
  startMarketplaceConversation,
  startMarketplaceOrderConversation,
  updateMarketplacePost,
  createWalletWithdrawal,
  uploadImages,
  type MarketplaceOrder,
  type MarketplacePost,
  type Wallet,
  type WalletTransaction,
  type WalletWithdrawal,
} from '../api'
import {
  MarketplaceListingType,
  MarketplaceOrderStatus,
  MarketplacePostStatus,
} from '../api/types'
import {
  DeferredMapBlock,
  PageFrame,
  exploreMapUrl,
  usePageFrameChromePortals,
} from '../components/chrome'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { MarketplaceLoadingSkeleton } from '../components/MarketplaceLoadingSkeleton'
import { AddressAutocomplete, type PlaceResult } from '../components/map/AddressAutocomplete'
import { LocationPickerMap } from '../components/map/LocationPickerMap'
import { MapToast } from '../components/map/MapToast'
import {
  marketplacePostsToSellerPins,
  type MarketplaceMapPin,
} from '../lib/marketplaceSellerPins'
import { useAuth } from '../contexts/AuthContext'
import { isValidCoord, MAP_FOCUS_ZOOM } from '../lib/googleMaps'
import { getErrorMessage } from '../lib/errors'
import { mapMessagesUrl } from '../lib/mapDeepLinks'
import { FOOD_PRESETS, type FoodPreset } from '../lib/foodPresets'
import { catalogCategories, filterCatalog } from '../lib/marketplaceFilters'
import {
  purchaseKindLabel,
  resolvePurchaseKinds,
  type PurchaseKind,
} from '../lib/purchaseCatalog'
import { groupMarketplaceOrderRefunds } from '../lib/walletTransactionDisplay'
import { marketplaceOrderGroupKey } from '../lib/marketplaceOrderGroups'
import {
  resolveMarketplaceDestination,
  subscribeToMarketplaceTabRequests,
  takeMarketplaceTabRequest,
  type MarketplaceTab,
} from '../lib/marketplaceNavigation'
import {
  formatDate,
  formatPrice,
  MARKETPLACE_CATEGORIES,
  FOOD_CATEGORIES,
  GOODS_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  marketplaceOrderStatusLabel,
  marketplacePostStatusLabel,
} from '../lib/labels'
import { FoodMarketplaceView } from '../components/marketplace/food/FoodMarketplaceView'
import { MarketplaceHeader, type WalletHeaderStatus } from '../components/marketplace/MarketplaceHeader'
import {
  WalletPage,
  type DepositMethod,
} from '../components/marketplace/wallet/WalletPage'
import { formatWalletAmount, parseWalletTab, readDepositReturn } from '../lib/walletMoney'
import '../components/marketplace/food/FoodMarketplaceView.css'
import './MarketplacePage.css'

const DEFAULT_LAT = 10.8706
const DEFAULT_LNG = 106.7974
/** Placeholder — API requires ≥1 media URL when no file selected. */
const DEFAULT_MEDIA = '/brand/homeji-logo.png'
const MAX_MEDIA = 10
const MINIMUM_FOOD_CART_TOTAL = 25_000

type MediaDraft = {
  id: string
  file: File
  previewUrl: string
}

type MarketplaceCartItem = {
  postId: string
  sellerId: string
  sellerName: string
  sellerAddress: string
  title: string
  price: number
  unit: string
  quantity: number
  availableQuantity: number
  imageUrl: string | null
  preparationMinutes: number
}

type OrderStatusFilter = 'all' | MarketplaceOrderStatus

const ORDER_STATUS_FILTERS: { id: OrderStatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: MarketplaceOrderStatus.Requested, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Requested] ?? 'Chờ xác nhận' },
  { id: MarketplaceOrderStatus.Accepted, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Accepted] ?? 'Đã nhận' },
  { id: MarketplaceOrderStatus.Delivered, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Delivered] ?? 'Đã giao' },
  { id: MarketplaceOrderStatus.Completed, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Completed] ?? 'Hoàn tất' },
  { id: MarketplaceOrderStatus.Cancelled, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Cancelled] ?? 'Đã hủy' },
  { id: MarketplaceOrderStatus.Rejected, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Rejected] ?? 'Từ chối' },
  { id: MarketplaceOrderStatus.Expired, label: marketplaceOrderStatusLabel[MarketplaceOrderStatus.Expired] ?? 'Hết hạn' },
]

const ORDER_STEPS = [
  marketplaceOrderStatusLabel[MarketplaceOrderStatus.Requested] ?? 'Chờ xác nhận',
  marketplaceOrderStatusLabel[MarketplaceOrderStatus.Accepted] ?? 'Đã nhận',
  marketplaceOrderStatusLabel[MarketplaceOrderStatus.Delivered] ?? 'Đã giao',
  marketplaceOrderStatusLabel[MarketplaceOrderStatus.Completed] ?? 'Hoàn tất',
] as const

type MarketplaceOrderGroup = {
  groupKey: string
  name: string
  role: string
  address: string
  orders: MarketplaceOrder[]
  status: MarketplaceOrder['status']
  createdAt: string
  pickupAt: string
  total: number
  isBuyer: boolean
  isSeller: boolean
}

function matchesOrderStatusFilter(
  group: MarketplaceOrderGroup,
  filter: OrderStatusFilter,
): boolean {
  if (filter === 'all') return true
  return group.status === filter
}

function formatOrderEta(group: MarketplaceOrderGroup): string {
  if (group.status === MarketplaceOrderStatus.Requested) {
    const expiresAt = new Date(group.createdAt).getTime() + 30 * 60 * 1000
    const remainingMinutes = Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000))
    return remainingMinutes > 0
      ? `Người bán còn ${remainingMinutes} phút để xác nhận`
      : 'Đang kiểm tra thời hạn xác nhận'
  }

  if (group.status === MarketplaceOrderStatus.Delivered
      || (group.status === MarketplaceOrderStatus.Completed
        && group.orders.some((order) => !order.fundsReleasedAt))) {
    const releaseDueAt = group.orders[0]?.fundsReleaseDueAt
    return releaseDueAt
      ? `Tự giải ngân lúc ${formatDate(releaseDueAt)}`
      : 'Tiền đang được giữ trong 24 giờ'
  }

  const pickupAt = new Date(group.pickupAt)
  const remainingMinutes = Math.ceil((pickupAt.getTime() - Date.now()) / 60_000)
  if (remainingMinutes <= 0) return `Dự kiến nhận: ${formatDate(group.pickupAt)}`
  if (remainingMinutes < 60) return `Dự kiến sẵn sàng sau ${remainingMinutes} phút`
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return `Dự kiến sẵn sàng sau ${hours} giờ${minutes ? ` ${minutes} phút` : ''}`
}

function orderProgressStep(status: MarketplaceOrder['status']): number | null {
  if (status === MarketplaceOrderStatus.Completed) return 4
  if (status === MarketplaceOrderStatus.Delivered) return 3
  if (status === MarketplaceOrderStatus.Accepted) return 2
  if (status === MarketplaceOrderStatus.Requested) return 1
  return null
}

type ResolvedPurchaseKind = PurchaseKind | 'mixed' | 'unknown'

function resolvedPurchaseKind(
  group: MarketplaceOrderGroup,
  kinds: Record<string, PurchaseKind>,
  failed: ReadonlySet<string>,
): ResolvedPurchaseKind | null {
  const ids = [...new Set(group.orders.map((order) => order.marketplacePostId))]
  if (ids.some((id) => !kinds[id] && !failed.has(id))) return null
  if (ids.some((id) => failed.has(id) || !kinds[id])) return 'unknown'
  const present = new Set(ids.map((id) => kinds[id]))
  if (present.size > 1) return 'mixed'
  return present.has('food') ? 'food' : 'goods'
}

type Props = {
  embedded?: boolean
  onPostsForMap?: (pins: MarketplaceMapPin[]) => void
  onFocusMap?: (loc: { lat: number; lng: number; zoom?: number }) => void
  selectedMarketplaceId?: string | null
  onSelectMarketplaceId?: (id: string | null) => void
  userLocation?: { lat: number; lng: number } | null
  onRequestLocation?: () => void
  locating?: boolean
  onCartOpenChange?: (open: boolean) => void
}

function postThumb(p: MarketplacePost): string | null {
  const url = p.mediaUrls?.find((u) => u && !u.endsWith('/vite.svg'))
  return url || null
}

function formatDistanceKm(distanceKm: number): string {
  const digits = distanceKm < 10 ? 1 : 0
  return `${new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(distanceKm)} km`
}

function formatNearbyDistance(
  distanceKm: number | null,
  locating: boolean,
  hasUserLocation: boolean,
): string {
  if (distanceKm == null) {
    if (locating) return 'Đang định vị…'
    return hasUserLocation ? 'Chưa rõ khoảng cách' : 'Chưa có vị trí'
  }
  const limit = distanceKm <= 1 ? 1 : Math.ceil(distanceKm)
  return `< ${new Intl.NumberFormat('vi-VN').format(limit)} km`
}

function readCart(storageKey: string): MarketplaceCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as MarketplaceCartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) =>
      item
      && typeof item.postId === 'string'
      && typeof item.sellerId === 'string'
      && typeof item.title === 'string'
      && Number.isFinite(item.price)
      && Number.isInteger(item.quantity)
      && item.quantity > 0,
    ).map((item) => ({
      ...item,
      preparationMinutes: Number.isFinite(item.preparationMinutes)
        ? Math.max(0, item.preparationMinutes)
        : 30,
    }))
  } catch {
    return []
  }
}

export function MarketplacePage({
  embedded = false,
  onPostsForMap,
  onFocusMap,
  selectedMarketplaceId = null,
  onSelectMarketplaceId,
  userLocation = null,
  onRequestLocation,
  locating = false,
  onCartOpenChange,
}: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const myUserId = profile?.id ?? getStoredSession()?.userId ?? null
  const cartStorageKey = `homeji:marketplace-cart:v1:${myUserId ?? 'guest'}`

  const [tab, setTab] = useState<MarketplaceTab>(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = resolveMarketplaceDestination(params).tab
    if (fromUrl) return fromUrl
    return takeMarketplaceTabRequest('food')
  })
  const [posts, setPosts] = useState<MarketplacePost[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [categorySelection, setCategorySelection] = useState({ tab, value: '' })
  const category = categorySelection.tab === tab ? categorySelection.value : ''
  const setCategory = (value: string) => setCategorySelection({ tab, value })
  const [kindFilter, setKindFilter] = useState('')
  const [postStatusFilter, setPostStatusFilter] = useState('')
  const [priceFilter, setPriceFilter] = useState('')
  const [catalogSort, setCatalogSort] = useState('default')
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [orderingPostId, setOrderingPostId] = useState<string | null>(null)
  const [contactingPostId, setContactingPostId] = useState<string | null>(null)
  const [purchaseReceipt, setPurchaseReceipt] = useState<{ message: string; orderId: string } | null>(null)
  const [purchaseKinds, setPurchaseKinds] = useState<Record<string, PurchaseKind>>({})
  const [purchaseKindFailures, setPurchaseKindFailures] = useState<string[]>([])
  const purchaseKindAttempts = useRef(new Set<string>())

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<string>(MARKETPLACE_CONDITIONS[2])
  const [sellCategory, setSellCategory] = useState<string>('Cơm nhà')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaDraft[]>([])
  const [uploading, setUploading] = useState(false)
  const [listingType, setListingType] = useState<MarketplaceListingType>(MarketplaceListingType.Food)
  const [availableQuantity, setAvailableQuantity] = useState('10')
  const [unit, setUnit] = useState('phần')
  const [preparationMinutes, setPreparationMinutes] = useState('20')
  const [presetImageUrl, setPresetImageUrl] = useState('')
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([])
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({})
  const [cartItems, setCartItems] = useState<MarketplaceCartItem[]>(() => readCart(cartStorageKey))
  const [cartOpen, setCartOpen] = useState(false)
  const [cartBusy, setCartBusy] = useState(false)
  const [checkoutConfirmationOpen, setCheckoutConfirmationOpen] = useState(false)
  const [cartNote, setCartNote] = useState('')
  const [orderGroupBusy, setOrderGroupBusy] = useState('')
  const [inventoryBusy, setInventoryBusy] = useState(false)
  const inventoryActionLock = useRef(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all')
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const handledMarketplaceSelectionRef = useRef<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletHeaderStatus, setWalletHeaderStatus] = useState<WalletHeaderStatus>('loading')
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [withdrawalsUnavailable, setWithdrawalsUnavailable] = useState(false)
  const [walletBusy, setWalletBusy] = useState('')
  const walletTab = parseWalletTab(searchParams.get('wallet')) ?? 'deposit'

  const setWalletTab = useCallback((next: 'deposit' | 'withdraw' | 'history') => {
    const params = new URLSearchParams(searchParams)
    if (!params.get('section')) params.set('section', 'marketplace')
    params.set('wallet', next)
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!myUserId) return
    let active = true
    void getMyWallet()
      .then((next) => {
        if (!active) return
        setWallet(next)
        setWalletHeaderStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setWalletHeaderStatus((current) => (current === 'ready' ? 'ready' : 'error'))
      })
    return () => {
      active = false
    }
  }, [myUserId])

  const keyword = searchParams.get('q') ?? ''
  const destination = resolveMarketplaceDestination(searchParams)
  if (destination.tab && destination.tab !== tab) {
    setTab(destination.tab)
  }

  const openLeaf = useCallback((next: MarketplaceTab, options?: { replace?: boolean; purchaseId?: string }) => {
    if (next === 'food' || next === 'browse') onSelectMarketplaceId?.(null)
    setTab(next)
    const params = new URLSearchParams(searchParams)
    if (!params.get('section')) params.set('section', 'marketplace')
    const nextPurchase = next === 'purchases' ? (options?.purchaseId ?? '') : ''
    const unchanged = params.get('market') === next
      && !params.get('order')
      && !params.get('side')
      && !params.get('role')
      && (params.get('purchase') ?? '') === nextPurchase
      && (next === 'wallet'
        ? Boolean(parseWalletTab(params.get('wallet')))
        : !params.get('wallet'))
    if (unchanged) return
    params.set('market', next)
    params.delete('order')
    params.delete('side')
    params.delete('role')
    if (nextPurchase) params.set('purchase', nextPurchase)
    else params.delete('purchase')
    if (next === 'wallet') params.set('wallet', parseWalletTab(params.get('wallet')) ?? 'deposit')
    else params.delete('wallet')
    setSearchParams(params, { replace: options?.replace ?? false })
  }, [onSelectMarketplaceId, searchParams, setSearchParams])

  useEffect(() => subscribeToMarketplaceTabRequests((next) => openLeaf(next)), [openLeaf])

  useEffect(() => {
    if (!destination.legacy || !destination.tab) return
    const params = new URLSearchParams(searchParams)
    if (!params.get('section')) params.set('section', 'marketplace')
    params.set('market', destination.tab)
    params.delete('order')
    params.delete('side')
    params.delete('role')
    setSearchParams(params, { replace: true })
  }, [destination.legacy, destination.tab, searchParams, setSearchParams])

  useEffect(() => {
    if (tab !== 'wallet') return
    const current = searchParams.get('wallet')
    const parsed = parseWalletTab(current)
    if (parsed && current === parsed) return
    const params = new URLSearchParams(searchParams)
    if (!params.get('section')) params.set('section', 'marketplace')
    params.set('wallet', parsed ?? 'deposit')
    setSearchParams(params, { replace: true })
  }, [tab, searchParams, setSearchParams])

  useEffect(() => {
    if (!myUserId) return
    let active = true
    const refreshOrders = () => {
      void getMyMarketplaceOrders()
        .then((nextOrders) => {
          if (active) setOrders(nextOrders)
        })
        .catch(() => undefined)
    }
    refreshOrders()
    const intervalId = window.setInterval(refreshOrders, 30_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [myUserId])

  useEffect(() => {
    if (tab !== 'purchases' || !myUserId) return
    const ids = [...new Set(
      orders.filter((order) => order.buyerId === myUserId).map((order) => order.marketplacePostId),
    )]
    const missing = ids.filter((id) => !purchaseKindAttempts.current.has(id))
    if (missing.length === 0) return
    let cancelled = false
    void resolvePurchaseKinds(missing).then((result) => {
      if (cancelled) return
      for (const postId of missing) purchaseKindAttempts.current.add(postId)
      setPurchaseKinds((current) => ({ ...current, ...result.kinds }))
      if (result.failedIds.length > 0) {
        setPurchaseKindFailures((current) => [...new Set([...current, ...result.failedIds])])
      }
    }).catch(() => {
      if (cancelled) return
      for (const postId of missing) purchaseKindAttempts.current.add(postId)
      setPurchaseKindFailures((current) => [...new Set([...current, ...missing])])
    })
    return () => {
      cancelled = true
    }
  }, [tab, orders, myUserId])

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems))
  }, [cartItems, cartStorageKey])

  useEffect(() => {
    if (!cartOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cartBusy) setCartOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cartBusy, cartOpen])

  useEffect(() => {
    onCartOpenChange?.(cartOpen)
  }, [cartOpen, onCartOpenChange])

  useEffect(() => () => onCartOpenChange?.(false), [onCartOpenChange])


  const isMine = useCallback(
    (p: MarketplacePost) => Boolean(myUserId && p.sellerId === myUserId),
    [myUserId],
  )

  const browsePosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          !isMine(p) &&
          (p.status === MarketplacePostStatus.Active || p.status == null),
      ),
    [posts, isMine],
  )

  const myPosts = useMemo(() => posts.filter((p) => isMine(p)), [posts, isMine])
  const sellerLocationPost = useMemo(() => [...myPosts].filter(post => post.id !== editingPostId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0] ?? null, [myPosts, editingPostId])
  const sellingAddress = sellerLocationPost?.address ?? address
  const latNum = sellerLocationPost?.latitude ?? (latitude.trim() ? Number(latitude) : Number.NaN)
  const lngNum = sellerLocationPost?.longitude ?? (longitude.trim() ? Number(longitude) : Number.NaN)

  useEffect(() => {
    if (!selectedMarketplaceId) {
      handledMarketplaceSelectionRef.current = null
      return
    }
    if (
      posts.length === 0 ||
      handledMarketplaceSelectionRef.current === selectedMarketplaceId
    ) return
    const sellerPosts = posts.filter(
      (post) =>
        post.sellerId === selectedMarketplaceId &&
        (post.status === MarketplacePostStatus.Active || post.status == null),
    )
    const nextTab = sellerPosts.some(
      (post) => post.listingType === MarketplaceListingType.Food,
    )
      ? 'food'
      : 'browse'
    setTab((current) => (current === nextTab ? current : nextTab))
    handledMarketplaceSelectionRef.current = selectedMarketplaceId
    const params = new URLSearchParams(window.location.search)
    if (params.get('market') === nextTab) return
    params.set('section', 'marketplace')
    params.set('market', nextTab)
    params.delete('wallet')
    params.delete('order')
    params.delete('side')
    params.delete('role')
    setSearchParams(params, { replace: true })
  }, [posts, selectedMarketplaceId, setSearchParams])

  useEffect(() => {
    return () => {
      for (const m of mediaFiles) URL.revokeObjectURL(m.previewUrl)
    }
    // Only revoke on unmount; drafts manage revoke on remove.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMediaFiles = (list: FileList | null) => {
    if (!list?.length) return
    setMediaFiles((prev) => {
      const room = MAX_MEDIA - prev.length
      if (room <= 0) return prev
      const next: MediaDraft[] = []
      for (const file of Array.from(list)) {
        if (next.length >= room) break
        if (!file.type.startsWith('image/')) continue
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return [...prev, ...next]
    })
  }

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const target = prev.find((m) => m.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((m) => m.id !== id)
    })
  }

  const inventoryRequest = useRef(0)
  const loadFn = useCallback(async () => {
    const requestId = ++inventoryRequest.current
    if (tab === 'wallet') {
      const [nextWallet, transactions, marketplaceOrders, withdrawalResult] = await Promise.all([
        getMyWallet(),
        getMyWalletTransactions(50),
        getMyMarketplaceOrders(),
        getMyWalletWithdrawals()
          .then((items) => ({ items, unavailable: false }))
          .catch(() => ({ items: [] as WalletWithdrawal[], unavailable: true })),
      ])
      setWallet(nextWallet)
      setWalletHeaderStatus('ready')
      setWalletTransactions(transactions)
      setOrders(marketplaceOrders)
      setWithdrawals(withdrawalResult.items)
      setWithdrawalsUnavailable(withdrawalResult.unavailable)
      return
    }
    if (tab === 'purchases' || tab === 'sales') {
      setOrders(await getMyMarketplaceOrders())
      return
    }
    if (tab === 'sell' || tab === 'mine') {
      const ownPosts = await getMyMarketplacePosts()
      if (requestId === inventoryRequest.current) setPosts(ownPosts)
      return
    }
    const list = await searchMarketplacePosts({
      keyword: keyword.trim() || undefined,
      category: category.trim() || undefined,
      minPrice: priceFilter === '100to500' ? 100_000 : priceFilter === 'over500' ? 500_001 : undefined,
      maxPrice: priceFilter === 'under100' ? 99_999 : priceFilter === '100to500' ? 500_000 : undefined,
      listingType:
        tab === 'food'
          ? MarketplaceListingType.Food
          : tab === 'browse'
            ? MarketplaceListingType.SecondHand
            : undefined,
      latitude: userLocation?.lat,
      longitude: userLocation?.lng,
      radiusKm: userLocation ? 50 : undefined,
      pageSize: 50,
    })
    if (requestId !== inventoryRequest.current) return
    setPosts(list)

    if (tab === 'browse' || tab === 'food') {
      const forMap = list.filter(
        (p) =>
          isValidCoord(p.latitude, p.longitude) &&
          (p.status === MarketplacePostStatus.Active || p.status == null),
      )
      onPostsForMap?.(marketplacePostsToSellerPins(forMap))
    }
  }, [tab, keyword, category, priceFilter, onPostsForMap, userLocation])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(
    loadFn,
    [tab, keyword, category, priceFilter, myUserId],
    { holdForIntro: false },
  )

  const depositReturn = readDepositReturn(searchParams)
  const refreshedGatewayReturn = useRef(false)
  useEffect(() => {
    if (tab !== 'wallet' || depositReturn !== 'processing' || refreshedGatewayReturn.current) return
    refreshedGatewayReturn.current = true
    void reload()
  }, [tab, depositReturn, reload])

  const [hiddenLoadError, setHiddenLoadError] = useState('')

  const toastMessage =
    actionError ||
    actionMsg ||
    (error && !disrupted && error !== hiddenLoadError ? error : '') ||
    null
  const toastTone = actionMsg && !actionError ? 'success' : 'error'

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => {
      setActionMsg('')
      setActionError('')
      if (error && !disrupted) setHiddenLoadError(error)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [toastMessage, error, disrupted])

  const handlePlaceSelect = (place: PlaceResult) => {
    setAddress(place.address)
    setLatitude(String(place.lat))
    setLongitude(String(place.lng))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError('')
    setActionMsg('')
    if (!sellingAddress.trim()) {
      setActionError('Nhập địa chỉ bán đồ.')
      return
    }
    if (!isValidCoord(latNum, lngNum)) {
      setActionError('Chọn vị trí trên bản đồ hoặc gợi ý địa chỉ.')
      return
    }
    try {
      setUploading(true)
      let urls: string[] = presetImageUrl ? [presetImageUrl] : existingMediaUrls.length ? existingMediaUrls : [DEFAULT_MEDIA]
      if (mediaFiles.length > 0) {
        const uploaded = await uploadImages(
          mediaFiles.map((m) => m.file),
          'marketplace',
        )
        urls = uploaded.map((u) => u.url).filter(Boolean)
        if (urls.length === 0) {
          setActionError('Upload ảnh thất bại. Thử lại.')
          return
        }
      }
      if (listingType === MarketplaceListingType.Food && urls[0] === DEFAULT_MEDIA) {
        setActionError('Chọn ảnh món thật hoặc một ảnh mẫu có giấy phép trước khi đăng.')
        return
      }
      const createdOrUpdated = editingPostId
        ? await updateMarketplacePost(editingPostId, {
          title,
          description,
          price: Number(price) || 0,
          condition,
          category: sellCategory,
          address: sellingAddress.trim(),
          latitude: latNum,
          longitude: lngNum,
          mediaUrls: urls,
          listingType,
          availableQuantity: Number(availableQuantity) || 1,
          unit: unit.trim() || 'phần',
          preparationMinutes:
            listingType === MarketplaceListingType.Food ? Number(preparationMinutes) || 0 : null,
        })
        : await createMarketplacePost({
          title,
          description,
          price: Number(price) || 0,
          condition,
          category: sellCategory,
          address: sellingAddress.trim(),
          latitude: latNum,
          longitude: lngNum,
          mediaUrls: urls,
          listingType,
          availableQuantity: Number(availableQuantity) || 1,
          unit: unit.trim() || 'phần',
          preparationMinutes:
            listingType === MarketplaceListingType.Food ? Number(preparationMinutes) || 0 : null,
        })
      if (editingPostId) {
        setEditingPostId(null)
        setActionMsg('Đã cập nhật tin.')
        setTitle('')
        setDescription('')
        setPrice('')
        setPresetImageUrl('')
        for (const m of mediaFiles) URL.revokeObjectURL(m.previewUrl)
        setMediaFiles([])
        openLeaf('mine')
        void reload()
        return
      }
      const destinationTab = createdOrUpdated.listingType === MarketplaceListingType.Food
        ? 'food'
        : 'browse'
      setActionMsg(
        destinationTab === 'food'
          ? 'Đã đăng món ăn — tin được chuyển vào “Đồ ăn”.'
          : 'Đã đăng vật dụng — tin được chuyển vào “Chợ đồ”.',
      )
      setTitle('')
      setDescription('')
      setPrice('')
      setPresetImageUrl('')
      for (const m of mediaFiles) URL.revokeObjectURL(m.previewUrl)
      setMediaFiles([])
      openLeaf(destinationTab)
      void reload()
      onFocusMap?.({ lat: latNum, lng: lngNum, zoom: MAP_FOCUS_ZOOM })
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đăng tin thất bại'))
    } finally {
      setUploading(false)
    }
  }

  const updateInventoryStatus = async (postId: string, action: 'sold' | 'archive') => {
    if (inventoryActionLock.current) return
    inventoryActionLock.current = true
    setInventoryBusy(true)
    setActionError('')
    setActionMsg('')
    try {
      await (action === 'sold' ? markMarketplacePostSold(postId) : archiveMarketplacePost(postId))
      await reload()
      setActionMsg(action === 'sold' ? 'Đã đánh dấu tin đã bán.' : 'Đã ẩn tin.')
    } catch (error) {
      setActionError(getErrorMessage(error, 'Không cập nhật được trạng thái tin. Vui lòng thử lại.'))
    } finally {
      inventoryActionLock.current = false
      setInventoryBusy(false)
    }
  }

  const rememberCreatedPurchase = async (orderId: string, message: string) => {
    setPurchaseReceipt({ message, orderId })
    try {
      setOrders(await getMyMarketplaceOrders())
    } catch {
      setActionError('Đơn đã tạo, nhưng danh sách Đơn mua chưa tải lại. Mở Đơn mua để thử lại.')
    }
  }

  const handleOrder = async (post: MarketplacePost) => {
    if (orderingPostId) return
    setOrderingPostId(post.id)
    setActionError('')
    try {
      const pickupAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const quantity = orderQuantities[post.id] ?? 1
      const created = await createMarketplaceOrder(post.id, {
        pickupAt,
        pickupAddress: 'Thỏa thuận khi chat',
        note: 'Đặt từ Homeji map',
        quantity,
      })
      await rememberCreatedPurchase(created.id, 'Đã gửi yêu cầu mua.')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đặt mua thất bại'))
    } finally {
      setOrderingPostId(null)
    }
  }

  const applyFoodPreset = (preset: FoodPreset) => {
    setListingType(MarketplaceListingType.Food)
    setTitle(preset.title)
    setDescription(preset.description)
    setPrice(String(preset.price))
    setCondition('Mới làm trong ngày')
    setSellCategory(preset.category)
    setUnit(preset.unit)
    setPreparationMinutes(String(preset.preparationMinutes))
    setAvailableQuantity('10')
    setPresetImageUrl(preset.imageUrl)
  }

  const startWalletTopUp = async (amount: number, method: DepositMethod) => {
    setWalletBusy(method)
    try {
      let url: string | null | undefined
      if (method === 'momo') {
        const result = await createMomoPayment(amount, 'Nạp Số dư Homeji')
        url = result.payUrl ?? result.deeplink ?? result.qrCodeUrl
      } else {
        const result = await createPayOsPayment(amount, 'Nạp Số dư Homeji')
        url = result.checkoutUrl
      }
      if (!url) throw new Error('Cổng thanh toán chưa trả về đường dẫn thanh toán.')
      window.open(url, '_blank', 'noopener,noreferrer')
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, message: getErrorMessage(err, 'Không tạo được giao dịch nạp số dư') }
    } finally {
      setWalletBusy('')
    }
  }

  const addToCart = (post: MarketplacePost) => {
    const quantity = orderQuantities[post.id] ?? 1
    const currentSellerId = cartItems[0]?.sellerId
    if (currentSellerId && currentSellerId !== post.sellerId) {
      const replaceCart = window.confirm(
        'Giỏ hàng đang có món của một bếp khác. Xóa giỏ cũ để thêm món này?',
      )
      if (!replaceCart) return
    }

    setCartItems((current) => {
      const sameSellerItems = currentSellerId && currentSellerId !== post.sellerId ? [] : current
      const existing = sameSellerItems.find((item) => item.postId === post.id)
      if (existing) {
        return sameSellerItems.map((item) => item.postId === post.id
          ? {
              ...item,
              quantity: Math.min(item.availableQuantity, item.quantity + quantity),
            }
          : item)
      }

      return [...sameSellerItems, {
        postId: post.id,
        sellerId: post.sellerId,
        sellerName: post.sellerDisplayName || 'Bếp Homeji',
        sellerAddress: post.address,
        title: post.title,
        price: post.price,
        unit: post.unit,
        quantity,
        availableQuantity: post.availableQuantity,
        imageUrl: postThumb(post),
        preparationMinutes: post.preparationMinutes ?? 30,
      }]
    })
    setOrderQuantities((current) => ({ ...current, [post.id]: 1 }))
    setActionError('')
    setActionMsg(`Đã thêm ${post.title} vào giỏ.`)
  }

  const updateCartQuantity = (postId: string, quantity: number) => {
    setCartItems((current) => current.map((item) => item.postId === postId
      ? { ...item, quantity: Math.max(1, Math.min(item.availableQuantity, quantity)) }
      : item))
  }

  const removeFromCart = (post: MarketplacePost) => {
    setCartItems((current) => current.filter((item) => item.postId !== post.id))
    setActionError('')
    setActionMsg(`Đã xóa ${post.title} khỏi giỏ.`)
  }

  const checkoutCart = async () => {
    if (!checkoutConfirmationOpen || tab !== 'food') return
    if (cartItems.length === 0 || cartBusy) return
    setCartBusy(true)
    setActionError('')
    try {
      const estimatedPreparationMinutes = Math.max(
        10,
        ...cartItems.map((item) => item.preparationMinutes),
      )
      const created = await createMarketplaceCartOrder({
        items: cartItems.map((item) => ({ postId: item.postId, quantity: item.quantity })),
        pickupAt: new Date(Date.now() + estimatedPreparationMinutes * 60 * 1000).toISOString(),
        pickupAddress: cartItems[0]?.sellerAddress || 'Nhận tại bếp Homeji',
        note: cartNote.trim() || 'Đặt từ giỏ hàng Homeji',
      })
      const createdOrder = created[0]
      if (!createdOrder) {
        setActionError('Máy chủ chưa trả về đơn vừa tạo.')
        return
      }
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
      setCartItems([])
      setCartNote('')
      setCartOpen(false)
      setCheckoutConfirmationOpen(false)
      await rememberCreatedPurchase(createdOrder.id, `Đã đặt ${itemCount} món. Chờ bếp xác nhận.`)
      await reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Thanh toán giỏ hàng thất bại'))
    } finally {
      setCartBusy(false)
    }
  }

  const submitWithdrawal = async (input: {
    amount: number
    bankName: string
    accountNumber: string
    accountHolder: string
  }) => {
    const reserve = wallet?.minimumWithdrawalReserve ?? 20_000
    if (!wallet || wallet.balance - input.amount < reserve) {
      return {
        ok: false as const,
        message: `Ví phải còn tối thiểu ${formatWalletAmount(reserve)} sau khi rút.`,
      }
    }
    setWalletBusy('withdraw')
    try {
      await createWalletWithdrawal(input)
      await reload()
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, message: getErrorMessage(err, 'Không thể tạo yêu cầu rút tiền.') }
    } finally {
      setWalletBusy('')
    }
  }

  const showOnMap = (p: MarketplacePost) => {
    if (!isValidCoord(p.latitude, p.longitude)) return
    onSelectMarketplaceId?.(p.sellerId)
    if (onFocusMap) {
      onFocusMap({ lat: p.latitude, lng: p.longitude, zoom: MAP_FOCUS_ZOOM })
      return
    }
    navigate(exploreMapUrl())
  }

  const renderPostCard = (p: MarketplacePost, mode: 'browse' | 'mine') => {
    const thumb = postThumb(p)
    const mine = mode === 'mine'
    return (
      <article
        key={p.id}
        className={`marketplace-card marketplace-card--${mine ? 'mine' : 'browse'} map-motion-fade-up${
          selectedMarketplaceId === p.sellerId ? ' is-selected' : ''
        }`}
      >
        <div className="marketplace-card__main">
          {thumb ? (
            <img className="marketplace-card__thumb" src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="marketplace-card__thumb marketplace-card__thumb--empty" aria-hidden>
              Đồ
            </div>
          )}
          <div className="marketplace-card__body">
            <div className="marketplace-card__meta-row">
              <span className={`marketplace-card__badge${mine ? ' is-mine' : ''}`}>
                {mine
                  ? 'Tin của tôi'
                  : p.listingType === MarketplaceListingType.Food
                    ? formatNearbyDistance(p.distanceKm, locating, Boolean(userLocation))
                    : marketplacePostStatusLabel[p.status] ?? p.category}
              </span>
              {mine ? (
                <span className="marketplace-card__status">
                  {marketplacePostStatusLabel[p.status] ?? p.category}
                </span>
              ) : null}
            </div>
            <h3 className="marketplace-card__title">{p.title}</h3>
            <p className="marketplace-card__price">
              {formatPrice(p.price)}{p.unit ? ` / ${p.unit}` : ''}
            </p>
            <p className="marketplace-card__info">
              {p.condition}
              {p.category ? ` · ${p.category}` : ''}
            </p>
            {p.listingType === MarketplaceListingType.Food ? (
              <p className="marketplace-card__info">
                Còn {p.availableQuantity} {p.unit}
                {p.preparationMinutes ? ` · Chuẩn bị khoảng ${p.preparationMinutes} phút` : ''}
              </p>
            ) : null}
            {!mine && p.distanceKm != null ? (
              <p
                className="marketplace-card__distance"
                title="Khoảng cách ước tính từ vị trí của bạn"
              >
                <span aria-hidden="true">◎</span>
                Cách bạn khoảng {formatDistanceKm(p.distanceKm)}
              </p>
            ) : null}
            {p.address ? <p className="marketplace-card__addr">{p.address}</p> : null}
            {!mine && p.sellerDisplayName ? (
              <p className="marketplace-card__seller">Người bán: {p.sellerDisplayName}</p>
            ) : null}
          </div>
        </div>
        <div className="marketplace-card__actions">
          {isValidCoord(p.latitude, p.longitude) ? (
            <button type="button" className="btn btn-ghost btn-sm btn-map-cta" onClick={() => showOnMap(p)}>
              Xem trên bản đồ
            </button>
          ) : null}
          {mine && p.status === MarketplacePostStatus.Active ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={inventoryBusy}
                onClick={() => beginEdit(p)}
              >
                Chỉnh sửa
              </button>
              {p.listingType !== MarketplaceListingType.Food ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={inventoryBusy}
                  onClick={() => void updateInventoryStatus(p.id, 'sold')}
                >
                  Đánh dấu đã bán
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={inventoryBusy}
                onClick={() => void updateInventoryStatus(p.id, 'archive')}
              >
                Ẩn tin
              </button>
            </>
          ) : null}
          {!mine && p.sellerId !== profile?.id && p.status === MarketplacePostStatus.Active ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm"
                disabled={contactingPostId !== null}
                onClick={() => void contactAboutPost(p.id)}>
                {contactingPostId === p.id ? 'Đang mở…' : 'Nhắn người bán'}
              </button>
              {p.listingType === MarketplaceListingType.Food ? (
                <label className="marketplace-quantity">
                  <span>Số lượng</span>
                  <input
                    type="number"
                    min={1}
                    max={p.availableQuantity}
                    value={orderQuantities[p.id] ?? 1}
                    onChange={(event) => setOrderQuantities((current) => ({
                      ...current,
                      [p.id]: Math.max(1, Math.min(p.availableQuantity, Number(event.target.value) || 1)),
                    }))}
                    aria-label={`Số lượng ${p.title}`}
                  />
                </label>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={orderingPostId != null}
                onClick={() => void handleOrder(p)}
              >
                {orderingPostId === p.id ? 'Đang đặt…' : 'Mua bằng số dư'}
              </button>
            </>
          ) : null}
        </div>
      </article>
    )
  }

  const filterCategories = useMemo(() => {
    const kind = tab === 'food' ? MarketplaceListingType.Food
      : tab === 'browse' ? MarketplaceListingType.SecondHand
        : kindFilter ? Number(kindFilter) : null
    const defaults = kind === MarketplaceListingType.Food ? FOOD_CATEGORIES
      : kind === MarketplaceListingType.SecondHand ? GOODS_CATEGORIES : MARKETPLACE_CATEGORIES
    return catalogCategories(tab === 'mine' ? myPosts : browsePosts, defaults, kind, category)
  }, [tab, myPosts, browsePosts, kindFilter, category])

  const listForTab = useMemo(() => {
    const unfiltered = tab === 'mine'
      ? myPosts
      : tab === 'food'
        ? browsePosts.filter((post) => post.listingType === MarketplaceListingType.Food)
        : browsePosts.filter((post) => post.listingType !== MarketplaceListingType.Food)
    const selectedList = selectedMarketplaceId && tab !== 'mine'
      ? unfiltered.filter((post) => post.sellerId === selectedMarketplaceId)
      : unfiltered
    const list = filterCatalog(selectedList, { keyword, category, kind: tab === 'mine' ? kindFilter : '', status: tab === 'mine' ? postStatusFilter : '', price: priceFilter, sort: catalogSort })
    return list
  }, [tab, myPosts, browsePosts, selectedMarketplaceId, keyword, category, kindFilter, postStatusFilter, priceFilter, catalogSort])
  const foodSellerGroups = useMemo(() => {
    if (tab !== 'food') return []
    const grouped = new Map<string, MarketplacePost[]>()
    for (const post of listForTab) {
      const current = grouped.get(post.sellerId) ?? []
      current.push(post)
      grouped.set(post.sellerId, current)
    }
    return Array.from(grouped.entries()).map(([sellerId, sellerPosts]) => ({
      sellerId,
      sellerName: sellerPosts[0]?.sellerDisplayName || 'Bếp Homeji',
      address: sellerPosts[0]?.address || '',
      distanceKm: sellerPosts.reduce<number | null>((nearest, post) => {
        if (post.distanceKm == null) return nearest
        return nearest == null ? post.distanceKm : Math.min(nearest, post.distanceKm)
      }, null),
      preparationMinutes: sellerPosts.reduce<number | null>((fastest, post) => {
        const minutes = post.preparationMinutes ?? 0
        if (minutes <= 0) return fastest
        return fastest == null ? minutes : Math.min(fastest, minutes)
      }, null),
      posts: sellerPosts,
      categoryHint: sellerPosts[0]?.category || 'Cơm nhà',
    }))
  }, [tab, listForTab])

  const foodKitchens = useMemo(
    () => foodSellerGroups.map((group) => ({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      address: group.address,
      distanceKm: group.distanceKm,
      preparationMinutes: group.preparationMinutes,
      postsCount: group.posts.length,
      categoryHint: group.categoryHint,
    })),
    [foodSellerGroups],
  )

  const locationPrimary = userLocation
    ? 'Vị trí hiện tại của bạn'
    : 'Chưa chọn điểm giao'
  const locationSecondary = userLocation
    ? 'Đang xếp bếp theo khoảng cách gần nhất'
    : locating
      ? 'Đang lấy vị trí…'
      : 'Bật định vị để xếp gần nhất'
  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  )
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  )
  const displayedWalletTransactions = useMemo(
    () => groupMarketplaceOrderRefunds(walletTransactions, orders),
    [walletTransactions, orders],
  )

  const orderGroups = useMemo<MarketplaceOrderGroup[]>(() => {
    const grouped = new Map<string, MarketplaceOrder[]>()
    for (const order of orders) {
      const groupKey = marketplaceOrderGroupKey(order)
      const current = grouped.get(groupKey) ?? []
      current.push(order)
      grouped.set(groupKey, current)
    }
    return Array.from(grouped.entries()).map(([groupKey, groupedOrders]) => {
      const first = groupedOrders[0]!
      const iAmBuyer = first?.buyerId === myUserId
      return {
        groupKey,
        name: iAmBuyer
          ? first?.sellerDisplayName || 'Người bán Homeji'
          : first?.buyerDisplayName || 'Người mua Homeji',
        role: iAmBuyer ? 'Người bán' : 'Người mua',
        address: first?.sellerAddress || '',
        orders: groupedOrders,
        status: first.status,
        createdAt: first.createdAt,
        pickupAt: first.pickupAt,
        total: groupedOrders.reduce((sum, order) => sum + order.agreedPrice, 0),
        isBuyer: iAmBuyer,
        isSeller: first?.sellerId === myUserId,
      }
    }).sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  }, [orders, myUserId])

  const buyingOrderGroups = useMemo(
    () => orderGroups.filter((group) => group.isBuyer),
    [orderGroups],
  )
  const sellingOrderGroups = useMemo(
    () => orderGroups.filter((group) => group.isSeller),
    [orderGroups],
  )
  const sellerActionCount = useMemo(
    () => sellingOrderGroups.filter(
      (group) => group.status === MarketplaceOrderStatus.Requested,
    ).length,
    [sellingOrderGroups],
  )
  const selectedOrderGroups = tab === 'sales' ? sellingOrderGroups : buyingOrderGroups
  const filteredOrderGroups = selectedOrderGroups.filter((group) =>
    matchesOrderStatusFilter(group, orderStatusFilter),
  )
  const purchaseFocusId = searchParams.get('purchase')
  const buyerPurchasePostIds = useMemo(() => {
    if (!myUserId) return [] as string[]
    return [...new Set(
      orders.filter((order) => order.buyerId === myUserId).map((order) => order.marketplacePostId),
    )]
  }, [orders, myUserId])
  const purchaseKindsReady = buyerPurchasePostIds.every((id) =>
    Boolean(purchaseKinds[id]) || purchaseKindFailures.includes(id))
  const failedPurchaseIdSet = useMemo(
    () => new Set(purchaseKindFailures),
    [purchaseKindFailures],
  )
  const purchaseBuckets = useMemo(() => {
    const food: MarketplaceOrderGroup[] = []
    const goods: MarketplaceOrderGroup[] = []
    const other: MarketplaceOrderGroup[] = []
    for (const group of filteredOrderGroups) {
      const kind = resolvedPurchaseKind(group, purchaseKinds, failedPurchaseIdSet)
      if (kind === 'food') food.push(group)
      else if (kind === 'goods') goods.push(group)
      else if (kind) other.push(group)
    }
    return { food, goods, other }
  }, [filteredOrderGroups, purchaseKinds, failedPurchaseIdSet])

  useEffect(() => {
    if (tab !== 'purchases' || !purchaseFocusId || !purchaseKindsReady) return
    document.querySelector('.marketplace-order-group.is-purchase-focus')
      ?.scrollIntoView({ block: 'nearest' })
  }, [tab, purchaseFocusId, purchaseKindsReady, orders, orderStatusFilter])

  const handleOrderGroupAction = async (
    groupKey: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    if (orderGroupBusy) return
    setOrderGroupBusy(groupKey)
    setActionError('')
    setActionMsg('')
    try {
      await action()
      setActionMsg(successMessage)
      await reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không thể cập nhật đơn hàng'))
    } finally {
      setOrderGroupBusy('')
    }
  }
  const selectedFoodPreset = FOOD_PRESETS.find((preset) => preset.imageUrl === presetImageUrl)

  const beginEdit = (post: MarketplacePost) => {
    setEditingPostId(post.id)
    setListingType(post.listingType)
    setTitle(post.title)
    setDescription(post.description)
    setPrice(String(post.price))
    setCondition(post.condition)
    setSellCategory(post.category)
    setAddress(post.address)
    setLatitude(String(post.latitude))
    setLongitude(String(post.longitude))
    setAvailableQuantity(String(post.availableQuantity))
    setUnit(post.unit || 'phần')
    setPreparationMinutes(String(post.preparationMinutes ?? 0))
    setPresetImageUrl('')
    setExistingMediaUrls(post.mediaUrls ?? [])
    openLeaf('sell')
  }

  const contactAboutPost = async (postId: string, orderId?: string) => {
    if (contactingPostId !== null) return
    setContactingPostId(postId)
    setActionError('')
    try {
      const conversation = await (orderId ? startMarketplaceOrderConversation(orderId) : startMarketplaceConversation(postId))
      navigate(mapMessagesUrl(conversation.id))
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không mở được cuộc trò chuyện'))
    } finally {
      setContactingPostId(null)
    }
  }

  const beginNewSale = () => {
    setEditingPostId(null)
    setExistingMediaUrls([])
    setTitle('')
    setDescription('')
    setPrice('')
    setPresetImageUrl('')
    mediaFiles.forEach(media => URL.revokeObjectURL(media.previewUrl))
    setMediaFiles([])
    openLeaf('sell')
  }

  const sellAction = (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={beginNewSale}
    >
      Đăng bán
    </button>
  )

  const catalogToolbar = (
    <div className="marketplace-toolbar" aria-label="Bộ lọc">
      <label className="marketplace-toolbar__field">
        <span>Danh mục</span>
        <select
          className="form-select"
          aria-label="Lọc danh mục"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {filterCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      {tab === 'mine' && <>
        <label className="marketplace-toolbar__field"><span>Loại tin</span><select className="form-select" value={kindFilter} onChange={(event) => { setKindFilter(event.target.value); setCategory('') }}><option value="">Tất cả loại tin</option><option value={MarketplaceListingType.Food}>Đồ ăn</option><option value={MarketplaceListingType.SecondHand}>Đồ dùng</option></select></label>
        <label className="marketplace-toolbar__field"><span>Trạng thái</span><select className="form-select" value={postStatusFilter} onChange={(event) => setPostStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(marketplacePostStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </>}
      <label className="marketplace-toolbar__field"><span>Khoảng giá</span><select className="form-select" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}><option value="">Tất cả mức giá</option><option value="under100">Dưới 100.000 đ</option><option value="100to500">100.000–500.000 đ</option><option value="over500">Trên 500.000 đ</option></select></label>
      <label className="marketplace-toolbar__field"><span>Sắp xếp</span><select className="form-select" value={catalogSort} onChange={(event) => setCatalogSort(event.target.value)}><option value="default">Mới nhất</option><option value="priceAsc">Giá tăng dần</option><option value="priceDesc">Giá giảm dần</option>{userLocation && <option value="nearby">Gần nhất</option>}</select></label>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCategory(''); setKindFilter(''); setPostStatusFilter(''); setPriceFilter(''); setCatalogSort('default') }}>Xóa bộ lọc</button>
      {tab === 'browse' ? (
        <div className={`marketplace-distance-sort${userLocation ? ' is-active' : ''}`}>
          {userLocation ? (
            <span>{catalogSort === 'nearby' ? 'Xếp từ gần đến xa' : 'Trong phạm vi 50 km quanh bạn'}</span>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={locating || !onRequestLocation}
              onClick={onRequestLocation}
            >
              {locating ? 'Đang lấy vị trí…' : 'Dùng vị trí để xếp gần nhất'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )

  const orderToolbar = (
    <div className="marketplace-toolbar" aria-label="Lọc trạng thái đơn">
      <span className="marketplace-toolbar__label">Trạng thái</span>
      <div className="marketplace-status-filter" role="group">
        {ORDER_STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={orderStatusFilter === item.id ? 'is-active' : ''}
            aria-pressed={orderStatusFilter === item.id}
            onClick={() => setOrderStatusFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )

  const mapCta = (
    <Link to={exploreMapUrl()} className="btn btn-secondary btn-sm btn-map-cta">
      Xem trên bản đồ
    </Link>
  )
  const frameActions =
    tab !== 'sell' ? (
      <>
        {mapCta}
        {sellAction}
      </>
    ) : (
      mapCta
    )
  const chromePortals = usePageFrameChromePortals({
    actions: frameActions,
  })

  const openWalletDeposit = () => openLeaf('wallet')

  const body = (
    <>
      {chromePortals}

      <MarketplaceHeader
        tab={tab}
        availableBalance={wallet?.balance ?? null}
        walletStatus={!myUserId ? 'error' : wallet ? 'ready' : walletHeaderStatus}
        sellerActionCount={sellerActionCount}
        onTabChange={openLeaf}
        onOpenSell={beginNewSale}
        onTopUp={openWalletDeposit}
      />

      {purchaseReceipt ? (
        <div className="marketplace-purchase-receipt" role="status">
          <p>{purchaseReceipt.message}</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openLeaf('purchases', { purchaseId: purchaseReceipt.orderId })}
          >
            Xem đơn
          </button>
        </div>
      ) : null}

      {tab === 'food' && checkoutConfirmationOpen ? (
        <div className="food-checkout-confirmation-backdrop">
        <div className="food-checkout-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="checkout-confirmation-title" onKeyDown={(event) => {
          if (event.key === 'Escape' && !cartBusy) setCheckoutConfirmationOpen(false)
          if (event.key === 'Tab') {
            const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
            const first = buttons[0], last = buttons.at(-1)
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
          }
        }}>
          <h2 id="checkout-confirmation-title">Xác nhận đặt món</h2>
          <p>{cartItemCount} món · Tổng cộng {formatPrice(cartTotal)}</p>
          <p>Nhận tại {cartItems[0]?.sellerAddress || 'bếp Homeji'}. Chỉ xác nhận khi đã kiểm tra món và tổng tiền.</p>
          <button type="button" className="btn btn-secondary" autoFocus disabled={cartBusy} onClick={() => setCheckoutConfirmationOpen(false)}>Quay lại giỏ</button>
          <button type="button" className="btn btn-primary" disabled={cartBusy || cartItems.length === 0} onClick={() => void checkoutCart()}>{cartBusy ? 'Đang đặt…' : 'Xác nhận đặt món'}</button>
        </div>
        </div>
      ) : null}

      {tab === 'food' ? (
        <>
        {catalogToolbar}
        <FoodMarketplaceView
          posts={listForTab}
          kitchens={foodKitchens}
          quantities={orderQuantities}
          cartItems={cartItems.map((item) => ({
            postId: item.postId,
            sellerName: item.sellerName,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            availableQuantity: item.availableQuantity,
            imageUrl: item.imageUrl,
          }))}
          cartItemCount={cartItemCount}
          cartTotal={cartTotal}
          cartBusy={cartBusy}
          cartNote={cartNote}
          cartOpen={cartOpen}
          loading={Boolean(showLoader)}
          error={error && !disrupted ? error : null}
          locating={Boolean(locating)}
          hasUserLocation={Boolean(userLocation)}
          locationLabel={locationPrimary}
          locationSecondary={locationSecondary}
          minimumCartTotal={MINIMUM_FOOD_CART_TOTAL}
          onQuantityChange={(postId, quantity) => {
            setOrderQuantities((current) => ({ ...current, [postId]: quantity }))
          }}
          onAddToCart={(post) => {
            const cartItem = cartItems.find((item) => item.postId === post.id)
            if (cartItem) removeFromCart(post)
            else addToCart(post)
          }}
          onShowOnMap={showOnMap}
          onRequestLocation={onRequestLocation}
          onUpdateCartQuantity={updateCartQuantity}
          onRemoveCartItem={(postId) => {
            setCartItems((current) => current.filter((item) => item.postId !== postId))
          }}
          onClearCart={() => setCartItems([])}
          onCheckout={() => setCheckoutConfirmationOpen(true)}
          onCartNoteChange={setCartNote}
          onCartOpenChange={setCartOpen}
          onSelectKitchen={(sellerId) => onSelectMarketplaceId?.(sellerId)}
        />
        </>
      ) : tab === 'wallet' ? (
        <WalletPage
          tab={walletTab}
          wallet={wallet}
          transactions={displayedWalletTransactions}
          withdrawals={withdrawals}
          withdrawalsUnavailable={withdrawalsUnavailable}
          loading={Boolean(showLoader)}
          busy={Boolean(walletBusy)}
          depositReturn={depositReturn}
          onTabChange={setWalletTab}
          onDeposit={startWalletTopUp}
          onWithdraw={submitWithdrawal}
        />
      ) : (
      <div className="marketplace-workspace">
        {tab === 'mine' ? (
          <div className="marketplace-workspace__intro">
            <h2>Tin của tôi</h2>
            <p>Quản lý tin bạn đã đăng — đánh dấu đã bán hoặc ẩn tin.</p>
          </div>
        ) : null}
        {tab === 'purchases' ? (
          <div className="marketplace-workspace__intro">
            <h2>Đơn mua</h2>
            <p>Đơn đồ ăn và đồ dùng của bạn. Mỗi đơn giữ đúng trạng thái và thao tác của loại đó.</p>
          </div>
        ) : null}
        {tab === 'sales' ? (
          <div className="marketplace-workspace__intro">
            <h2>Đơn bán của bạn</h2>
          </div>
        ) : null}
        {tab === 'sell' ? (
          <div className="marketplace-type-choice">
            <p>Bạn muốn đăng gì?</p>
            <div role="group" aria-label="Loại tin đăng">
              <button
                type="button"
                className={listingType === MarketplaceListingType.Food ? 'is-active' : ''}
                onClick={() => {
                  setListingType(MarketplaceListingType.Food)
                  setCondition('Mới làm trong ngày')
                  setSellCategory('Cơm nhà')
                  setUnit('phần')
                  setAvailableQuantity('10')
                }}
              >
                Đồ ăn
              </button>
              <button
                type="button"
                className={listingType === MarketplaceListingType.SecondHand ? 'is-active' : ''}
                onClick={() => {
                  setListingType(MarketplaceListingType.SecondHand)
                  setCondition(MARKETPLACE_CONDITIONS[2])
                  setSellCategory('Nội thất')
                  setUnit('sản phẩm')
                  setAvailableQuantity('1')
                  setPresetImageUrl('')
                }}
              >
                Đồ dùng
              </button>
            </div>
          </div>
        ) : null}
        {tab === 'browse' || tab === 'mine' ? catalogToolbar : null}
        {tab === 'purchases' || tab === 'sales' ? orderToolbar : null}
      {showLoader ? (
        disrupted ? (
          <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
        ) : (
          <MarketplaceLoadingSkeleton tab={tab}  />
        )
      ) : tab === 'sell' ? (
        <form className="card marketplace-sell-form" onSubmit={(e) => void handleCreate(e)}>
          <header className="sell-form-heading"><span>{editingPostId ? 'Chỉnh sửa tin bán' : 'Tạo tin bán mới'}</span><h2>{listingType === MarketplaceListingType.Food ? 'Chia sẻ món ngon quanh nhà' : 'Trao đồ cũ, đón giá trị mới'}</h2><p>Điền thông tin, thêm ảnh và kiểm tra điểm bán trước khi đăng.</p></header>
          {listingType === MarketplaceListingType.Food ? (
            <section className="food-preset-section" aria-labelledby="food-preset-heading">
              <div>
                <h3 id="food-preset-heading">Món phổ biến cho sinh viên</h3>
                <p>Chọn để điền nhanh giá gợi ý. Ảnh chỉ là mẫu có giấy phép; hãy thay bằng ảnh món thật trước khi bán.</p>
              </div>
              <div className="food-preset-grid">
                {FOOD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={presetImageUrl === preset.imageUrl ? 'is-selected' : ''}
                    onClick={() => applyFoodPreset(preset)}
                  >
                    <img src={preset.imageUrl} alt="" />
                    <span>{preset.title}</span>
                    <strong>{formatPrice(preset.price)}</strong>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="form-group">
            <label className="form-label" htmlFor="sale-title">Tiêu đề</label>
            <input id="sale-title" className="form-input" aria-label="Tiêu đề tin bán" maxLength={200} placeholder={listingType === MarketplaceListingType.Food ? 'Ví dụ: Cơm gà nhà làm' : 'Ví dụ: Bàn học gỗ còn tốt'} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sale-description">Mô tả</label>
            <textarea id="sale-description" className="form-textarea" maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="marketplace-sell-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="sale-price">Giá (VND)</label>
              <input id="sale-price" className="form-input" aria-label="Giá bán" type="number" min={1} step={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sale-condition">Tình trạng</label>
              <select
                id="sale-condition"
                className="form-select"
                aria-label="Tình trạng sản phẩm"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                {listingType === MarketplaceListingType.Food ? (
                  <option value="Mới làm trong ngày">Mới làm trong ngày</option>
                ) : null}
                {(listingType === MarketplaceListingType.Food ? [] : MARKETPLACE_CONDITIONS).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sale-category">Danh mục</label>
              <select
                id="sale-category"
                className="form-select"
                aria-label="Danh mục tin bán"
                value={sellCategory}
                onChange={(e) => setSellCategory(e.target.value)}
                required
              >
                {[...new Set([...(listingType === MarketplaceListingType.Food ? FOOD_CATEGORIES : GOODS_CATEGORIES), ...(editingPostId ? [sellCategory] : [])])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sale-quantity">Số lượng sẵn bán</label>
              <input
                id="sale-quantity"
                className="form-input"
                type="number"
                aria-label="Số lượng sẵn bán"
                min={1}
                max={listingType === MarketplaceListingType.Food ? 100 : 1}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sale-unit">Đơn vị</label>
              <input
                id="sale-unit"
                className="form-input"
                aria-label="Đơn vị bán"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={30}
                placeholder="phần, ly, ổ..."
                required
              />
            </div>
            {listingType === MarketplaceListingType.Food ? (
              <div className="form-group">
                <label className="form-label" htmlFor="sale-preparation">Thời gian chuẩn bị (phút)</label>
                <input
                  id="sale-preparation"
                  className="form-input"
                  type="number"
                  aria-label="Thời gian chuẩn bị (phút)"
                  min={0}
                  max={240}
                  value={preparationMinutes}
                  onChange={(e) => setPreparationMinutes(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={sellerLocationPost ? undefined : 'sale-address'}>Địa chỉ / điểm giao cố định</label>
            {sellerLocationPost ? (
              <div className="seller-location-lock">
                <strong>{sellerLocationPost.address}</strong>
                <span>Mọi tin bán của bạn dùng chung điểm này để người mua dễ nhận hàng.</span>
              </div>
            ) : (
              <AddressAutocomplete
                id="sale-address"
                value={address}
                onChange={(value) => { setAddress(value); setLatitude(''); setLongitude('') }}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Nhập địa chỉ — gợi ý Places API"
                required
              />
            )}
          </div>
          <div className="form-group post-form-map-block">
            <div className="post-form-map-block__head">
              <div>
                <span className="form-label" id="marketplace-map-label">
                  Vị trí trên bản đồ
                </span>
                {sellerLocationPost ? (
                  <p className="form-hint">Vị trí được khóa theo điểm bán đầu tiên của tài khoản.</p>
                ) : (
                  <p className="form-hint">Chọn một gợi ý địa chỉ để xác định tọa độ, hoặc đặt ghim trên bản đồ.</p>
                )}
              </div>
              {!sellerLocationPost ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-expanded={mapPickerOpen}
                  aria-controls="marketplace-map-picker"
                  onClick={() => setMapPickerOpen((open) => !open)}
                >
                  {mapPickerOpen ? 'Ẩn bản đồ' : 'Chỉnh trên bản đồ'}
                </button>
              ) : null}
            </div>
            {!sellerLocationPost ? (
              <div id="marketplace-map-picker">
                <DeferredMapBlock visible={mapPickerOpen} label="Chọn vị trí trên bản đồ">
                  <LocationPickerMap
                    latitude={Number.isFinite(latNum) ? latNum : DEFAULT_LAT}
                    longitude={Number.isFinite(lngNum) ? lngNum : DEFAULT_LNG}
                    onLocationChange={(lat, lng) => {
                      setLatitude(String(lat))
                      setLongitude(String(lng))
                    }}
                  />
                </DeferredMapBlock>
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sale-images">Ảnh sản phẩm</label>
            <p className="form-hint">Chọn tối đa {MAX_MEDIA} ảnh (có thể chọn nhiều file cùng lúc).</p>
            <input
              id="sale-images"
              className="form-input marketplace-file-input"
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || mediaFiles.length >= MAX_MEDIA}
              onChange={(e) => {
                addMediaFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {mediaFiles.length > 0 ? (
              <ul className="marketplace-media-grid" aria-label="Ảnh đã chọn">
                {mediaFiles.map((m) => (
                  <li key={m.id} className="marketplace-media-tile">
                    <img src={m.previewUrl} alt={m.file.name} />
                    <button
                      type="button"
                      className="marketplace-media-remove"
                      aria-label={`Xóa ${m.file.name}`}
                      onClick={() => removeMedia(m.id)}
                      disabled={uploading}
                    >
                      ×
                    </button>
                    <span className="marketplace-media-name" title={m.file.name}>
                      {m.file.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : presetImageUrl ? (
              <div className="food-preset-selected">
                <img src={presetImageUrl} alt="Ảnh món mẫu đang chọn" />
                <p>
                  Đang dùng ảnh mẫu. Người bán chịu trách nhiệm thay bằng ảnh đúng món và khẩu phần thực tế.
                  {selectedFoodPreset ? (
                    <> Nguồn ảnh: <a href={selectedFoodPreset.imageSource} target="_blank" rel="noreferrer">{selectedFoodPreset.imageAuthor}</a>.</>
                  ) : null}
                </p>
              </div>
            ) : existingMediaUrls.length > 0 ? (
              <div className="food-preset-selected">
                <img src={existingMediaUrls[0]} alt="Ảnh hiện tại của tin bán" />
                <p>Giữ {existingMediaUrls.length} ảnh hiện tại. Chọn ảnh mới để thay thế.</p>
              </div>
            ) : (
              <p className="form-hint">
                {listingType === MarketplaceListingType.Food
                  ? 'Đồ ăn bắt buộc có ảnh món thật hoặc chọn ảnh mẫu.'
                  : 'Chưa chọn ảnh — sẽ dùng ảnh mặc định.'}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Đang tải ảnh / đăng tin…' : editingPostId ? 'Lưu chỉnh sửa' : 'Đăng tin'}
          </button>
        </form>
      ) : tab === 'purchases' || tab === 'sales' ? (
        <div className="marketplace-orders-dashboard">
          {tab === 'sales' && sellerActionCount > 0 && orderStatusFilter === 'all' ? (
            <div className="marketplace-order-alert" role="status">
              <span aria-hidden="true">!</span>
              <div>
                <strong>Bạn có {sellerActionCount} đơn mới cần xác nhận</strong>
                <p>Người mua đang chờ. Đơn chưa xác nhận sẽ tự hết hạn sau 30 phút.</p>
              </div>
            </div>
          ) : null}

          {filteredOrderGroups.length === 0 ? (
            tab === 'sales' && orderStatusFilter === 'all' ? (
              <div className="marketplace-empty">
                <h3>Chưa có đơn bán</h3>
                <p>Đơn hàng từ khách mua sẽ xuất hiện tại đây.</p>
                <button type="button" className="btn btn-primary" onClick={() => openLeaf('mine')}>
                  Xem tin đã đăng
                </button>
              </div>
            ) : (
              <div className="page-frame-empty">
                <p className="page-frame-empty__title">
                  {orderStatusFilter !== 'all'
                    ? 'Không có đơn khớp bộ lọc trạng thái'
                    : 'Chưa có đơn đồ ăn hoặc đồ dùng'}
                </p>
              </div>
            )
          ) : tab === 'purchases' && !purchaseKindsReady
            && purchaseBuckets.food.length + purchaseBuckets.goods.length + purchaseBuckets.other.length === 0 ? (
            <p className="marketplace-card__info">Đang phân loại đơn đồ ăn và đồ dùng…</p>
          ) : (
            <>
              {tab === 'purchases' && purchaseKindFailures.length > 0 ? (
                <p className="marketplace-card__info" role="alert">
                  Không tải được loại sản phẩm cho một số đơn. Những đơn đó không được gán vào Đồ ăn hay Đồ dùng.
                </p>
              ) : null}
              {(tab === 'purchases'
                ? [
                    { id: 'food', title: 'Đồ ăn', groups: purchaseBuckets.food, empty: orderStatusFilter === 'all' ? 'Chưa có đơn đồ ăn.' : 'Không có đơn đồ ăn khớp bộ lọc.' },
                    { id: 'goods', title: 'Đồ dùng', groups: purchaseBuckets.goods, empty: orderStatusFilter === 'all' ? 'Chưa có đơn đồ dùng.' : 'Không có đơn đồ dùng khớp bộ lọc.' },
                    ...(purchaseBuckets.other.length > 0
                      ? [{ id: 'other', title: 'Chưa xếp loại', groups: purchaseBuckets.other, empty: '' }]
                      : []),
                  ]
                : [{ id: 'orders', title: '', groups: filteredOrderGroups, empty: '' }]
              ).map((source) => (
                <section key={source.id} className={source.title ? 'marketplace-purchase-source' : undefined}>
                  {source.title ? (
                    <h3>
                      {source.title}
                      <span>{source.groups.length} đơn</span>
                    </h3>
                  ) : null}
                  {source.title && source.groups.length === 0 ? (
                    <p>{source.empty}</p>
                  ) : (
            <div className="marketplace-order-groups">
              {source.groups.map((group) => {
                const firstOrder = group.orders[0]
                const requested = group.status === MarketplaceOrderStatus.Requested
                const accepted = group.status === MarketplaceOrderStatus.Accepted
                const delivered = group.status === MarketplaceOrderStatus.Delivered
                const completedAwaitingRelease = group.status === MarketplaceOrderStatus.Completed
                  && group.orders.some((order) => !order.fundsReleasedAt)
                const busy = orderGroupBusy === group.groupKey
                const progressStep = orderProgressStep(group.status)
                const happyPathComplete = progressStep === ORDER_STEPS.length
                const purchaseKind = tab === 'purchases'
                  ? resolvedPurchaseKind(group, purchaseKinds, failedPurchaseIdSet)
                  : null
                const focused = purchaseFocusId != null && group.orders.some((order) => order.id === purchaseFocusId)

                return (
                  <section
                    key={group.groupKey}
                    className={`marketplace-order-group is-active-order${focused ? ' is-purchase-focus' : ''}`}
                  >
                    <header className="marketplace-order-group__header">
                      <div className="marketplace-store-avatar" aria-hidden="true">
                        {group.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span>
                          {group.isSeller ? 'Đơn từ người mua' : 'Đơn từ người bán'}
                          {purchaseKind ? ` · ${purchaseKindLabel(purchaseKind)}` : ''}
                        </span>
                        <h3>{group.name}</h3>
                        <p>{formatDate(group.createdAt)}</p>
                      </div>
                      <span className="marketplace-order-status-pill">
                        {marketplaceOrderStatusLabel[group.status] ?? 'Đơn hàng'}
                      </span>
                    </header>

                    {progressStep != null ? (
                      <div className="marketplace-order-progress" aria-label={happyPathComplete ? 'Tiến trình đơn hàng: hoàn tất' : `Tiến trình đơn hàng: bước ${progressStep} trên 4`}>
                        {ORDER_STEPS.map((label, index) => {
                          const step = index + 1
                          const done = happyPathComplete || step < progressStep
                          const state = done ? 'is-done' : step === progressStep ? 'is-current' : ''
                          return (
                            <div key={label} className={state}>
                              <span aria-hidden="true">{done ? '✓' : step}</span>
                              <strong>{label}</strong>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="marketplace-card__info">
                        Trạng thái ghi nhận: {marketplaceOrderStatusLabel[group.status] ?? 'Đơn hàng'}.
                      </p>
                    )}

                    <div className="marketplace-order-summary">
                      <div>
                        <span>Tổng thanh toán · Số dư Homeji</span>
                        <strong>{formatPrice(group.total)}</strong>
                      </div>
                      <div className="marketplace-order-eta">
                        <span aria-hidden="true">◷</span>
                        <div>
                          <strong>{formatOrderEta(group)}</strong>
                          <small>{formatDate(group.pickupAt)}</small>
                        </div>
                      </div>
                    </div>

                    <ul className="marketplace-order-items">
                      {group.orders.map((order) => (
                        <li key={order.id}>
                          {order.postImageUrl ? <img src={order.postImageUrl} alt="" /> : <span aria-hidden="true" />}
                          <div>
                            <strong>{order.postTitle || 'Món Homeji'}</strong>
                            <small>{order.quantity} × {formatPrice(order.unitPrice)}</small>
                          </div>
                          <b>{formatPrice(order.agreedPrice)}</b>
                        </li>
                      ))}
                    </ul>

                    <div className="marketplace-order-pickup">
                      <span aria-hidden="true">⌖</span>
                      <p>{firstOrder?.pickupAddress || group.address}</p>
                    </div>

                    {group.isSeller ? (
                      <div className="marketplace-order-seller-total">
                        <span>Thực nhận sau phí</span>
                        <strong>{formatPrice(group.orders.reduce((sum, order) => sum + order.sellerNetAmount, 0))}</strong>
                      </div>
                    ) : null}

                    {firstOrder ? (
                      <footer className="marketplace-order-group__actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={contactingPostId !== null}
                          onClick={() => void contactAboutPost(firstOrder.marketplacePostId, firstOrder.id)}
                        >
                          {group.isSeller ? 'Liên hệ người mua' : 'Liên hệ người bán'}
                        </button>
                        {requested && group.isSeller ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busy}
                              onClick={() => void handleOrderGroupAction(
                                group.groupKey,
                                () => rejectMarketplaceOrder(firstOrder.id),
                                'Đã từ chối và hoàn tiền toàn bộ đơn.',
                              )}
                            >
                              Từ chối đơn
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy}
                              onClick={() => void handleOrderGroupAction(
                                group.groupKey,
                                () => acceptMarketplaceOrder(firstOrder.id),
                                'Đã xác nhận toàn bộ đơn hàng.',
                              )}
                            >
                              {busy ? 'Đang xử lý…' : 'Xác nhận nhận đơn'}
                            </button>
                          </>
                        ) : null}
                        {requested && group.isBuyer ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`Hủy toàn bộ đơn gồm ${group.orders.length} món và hoàn tiền?`)) return
                              void handleOrderGroupAction(
                                group.groupKey,
                                () => cancelMarketplaceOrder(firstOrder.id),
                                'Đã hủy và hoàn tiền toàn bộ đơn.',
                              )
                            }}
                          >
                            {busy ? 'Đang hủy…' : 'Hủy đơn'}
                          </button>
                        ) : null}
                        {accepted && group.isBuyer ? (
                          <p className="marketplace-card__info">Người bán đang chuẩn bị đơn. Bạn sẽ xác nhận sau khi người bán báo đã giao.</p>
                        ) : null}
                        {accepted && group.isSeller ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void handleOrderGroupAction(
                              group.groupKey,
                              () => markMarketplaceOrderDelivered(firstOrder.id),
                              'Đã báo giao toàn bộ đơn. Tiền bắt đầu được giữ trong 24 giờ.',
                            )}
                          >
                            {busy ? 'Đang xử lý…' : 'Đã giao đủ món'}
                          </button>
                        ) : null}
                        {delivered && group.isBuyer ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void handleOrderGroupAction(
                              group.groupKey,
                              () => completeMarketplaceOrder(firstOrder.id),
                              'Đã xác nhận nhận hàng. Tiền vẫn được giữ đủ 24 giờ trước khi về ví người bán.',
                            )}
                          >
                            {busy ? 'Đang xử lý…' : 'Đã nhận đủ món'}
                          </button>
                        ) : null}
                        {delivered && group.isSeller ? (
                          <p className="marketplace-card__info">
                            Tiền đang được giữ 24 giờ và sẽ tự về ví lúc{' '}
                            <strong>{formatDate(firstOrder.fundsReleaseDueAt ?? firstOrder.updatedAt)}</strong>.
                          </p>
                        ) : null}
                        {completedAwaitingRelease ? (
                          <p className="marketplace-card__info">
                            Người mua đã xác nhận. Tiền vẫn được giữ đến{' '}
                            <strong>{formatDate(firstOrder.fundsReleaseDueAt ?? firstOrder.updatedAt)}</strong>{' '}
                            rồi tự động về ví người bán.
                          </p>
                        ) : null}
                      </footer>
                    ) : null}
                  </section>
                )
              })}
            </div>
                  )}
                </section>
              ))}
            </>
          )}
        </div>
      ) : listForTab.length === 0 ? (
        <div className="page-frame-empty">
          <p className="page-frame-empty__title">
            {tab === 'mine'
              ? myPosts.length > 0
                ? 'Không có tin nào phù hợp với bộ lọc'
                : 'Bạn chưa có tin đăng nào'
              : keyword.trim() || category || priceFilter
                ? 'Không có đồ dùng phù hợp với bộ lọc'
                : 'Chưa có đồ dùng đang bán quanh đây'}
          </p>
        </div>
      ) : (
        <div className={`marketplace-list${tab === 'browse' ? ' marketplace-list--grid' : ''}${tab === 'mine' ? ' marketplace-list--rows' : ''}`}>
          {listForTab.map((p) => renderPostCard(p, tab === 'mine' ? 'mine' : 'browse'))}
        </div>
      )}
        </div>
      )}

      <MapToast
        message={toastMessage}
        tone={toastTone}
        onDismiss={() => {
          setActionMsg('')
          setActionError('')
          if (error && !disrupted) setHiddenLoadError(error)
        }}
      />
    </>
  )

  if (embedded) {
    return (
      <div className={`feature-page marketplace-page marketplace-page--food`}>
        {body}
      </div>
    )
  }

  return (
    <PageFrame title="Chợ đồ" actions={frameActions}>
      <div className="marketplace-page marketplace-page--food">{body}</div>
    </PageFrame>
  )
}
