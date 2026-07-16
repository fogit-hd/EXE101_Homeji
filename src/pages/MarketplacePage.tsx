import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  getMarketplaceSellerPlans,
  getMyMarketplaceSellerPlan,
  getMyMarketplaceOrders,
  getMyWallet,
  getMyWalletTransactions,
  getMyWalletWithdrawals,
  getStoredSession,
  markMarketplacePostSold,
  rejectMarketplaceOrder,
  searchMarketplacePosts,
  purchaseMarketplaceSellerPlan,
  createWalletWithdrawal,
  uploadImages,
  type MarketplaceOrder,
  type MarketplacePost,
  type MarketplaceSellerPlan,
  type MarketplaceSellerSubscription,
  type Wallet,
  type WalletTransaction,
  type WalletWithdrawal,
} from '../api'
import {
  MarketplaceListingType,
  MarketplaceOrderStatus,
  MarketplacePostStatus,
  WalletTransactionKind,
  WalletWithdrawalStatus,
} from '../api/types'
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
import { FOOD_PRESETS, type FoodPreset } from '../lib/foodPresets'
import { groupMarketplaceOrderRefunds } from '../lib/walletTransactionDisplay'
import {
  subscribeToMarketplaceTabRequests,
  takeMarketplaceTabRequest,
  type MarketplaceTab,
} from '../lib/marketplaceNavigation'
import {
  formatDate,
  formatPrice,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  marketplaceOrderStatusLabel,
  marketplacePostStatusLabel,
} from '../lib/labels'
import './MarketplacePage.css'

const DEFAULT_LAT = 10.8706
const DEFAULT_LNG = 106.7974
/** Placeholder — API requires ≥1 media URL when no file selected. */
const DEFAULT_MEDIA = '/brand/homeji-logo.png'
const MAX_MEDIA = 10
const MINIMUM_FOOD_CART_TOTAL = 25_000
const WALLET_TRANSACTION_LABELS: Record<number, string> = {
  [WalletTransactionKind.TopUp]: 'Nạp số dư',
  [WalletTransactionKind.Purchase]: 'Thanh toán đơn',
  [WalletTransactionKind.Refund]: 'Hoàn tiền',
  [WalletTransactionKind.SaleProceeds]: 'Doanh thu bán hàng',
  [WalletTransactionKind.PlatformFee]: 'Phí nền tảng',
  [WalletTransactionKind.SellerPlanPurchase]: 'Gói người bán',
  [WalletTransactionKind.Withdrawal]: 'Rút tiền',
  [WalletTransactionKind.WithdrawalRefund]: 'Hoàn tiền rút',
}

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

type OrderView = 'buying' | 'selling'

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

const TERMINAL_ORDER_STATUSES = new Set<number>([
  MarketplaceOrderStatus.Rejected,
  MarketplaceOrderStatus.Cancelled,
  MarketplaceOrderStatus.Completed,
  MarketplaceOrderStatus.Expired,
])

function formatOrderEta(group: MarketplaceOrderGroup): string {
  if (group.status === MarketplaceOrderStatus.Requested) {
    const expiresAt = new Date(group.createdAt).getTime() + 30 * 60 * 1000
    const remainingMinutes = Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000))
    return remainingMinutes > 0
      ? `Người bán còn ${remainingMinutes} phút để xác nhận`
      : 'Đang kiểm tra thời hạn xác nhận'
  }

  const pickupAt = new Date(group.pickupAt)
  const remainingMinutes = Math.ceil((pickupAt.getTime() - Date.now()) / 60_000)
  if (remainingMinutes <= 0) return `Dự kiến nhận: ${formatDate(group.pickupAt)}`
  if (remainingMinutes < 60) return `Dự kiến sẵn sàng sau ${remainingMinutes} phút`
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return `Dự kiến sẵn sàng sau ${hours} giờ${minutes ? ` ${minutes} phút` : ''}`
}

function orderProgressStep(status: MarketplaceOrder['status']): number {
  if (status === MarketplaceOrderStatus.Completed) return 3
  if (status === MarketplaceOrderStatus.Accepted) return 2
  return 1
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
  const myUserId = profile?.id ?? getStoredSession()?.userId ?? null
  const cartStorageKey = `homeji:marketplace-cart:v1:${myUserId ?? 'guest'}`

  const [tab, setTab] = useState<MarketplaceTab>(() => takeMarketplaceTabRequest('food'))
  const [posts, setPosts] = useState<MarketplacePost[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<string>(MARKETPLACE_CONDITIONS[2])
  const [sellCategory, setSellCategory] = useState<string>(MARKETPLACE_CATEGORIES[0])
  const [address, setAddress] = useState('Thủ Đức, TP.HCM')
  const [latitude, setLatitude] = useState(String(DEFAULT_LAT))
  const [longitude, setLongitude] = useState(String(DEFAULT_LNG))
  const [mediaFiles, setMediaFiles] = useState<MediaDraft[]>([])
  const [uploading, setUploading] = useState(false)
  const [listingType, setListingType] = useState<MarketplaceListingType>(MarketplaceListingType.Food)
  const [availableQuantity, setAvailableQuantity] = useState('10')
  const [unit, setUnit] = useState('phần')
  const [preparationMinutes, setPreparationMinutes] = useState('20')
  const [presetImageUrl, setPresetImageUrl] = useState('')
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({})
  const [cartItems, setCartItems] = useState<MarketplaceCartItem[]>(() => readCart(cartStorageKey))
  const [cartOpen, setCartOpen] = useState(false)
  const [cartBusy, setCartBusy] = useState(false)
  const [orderGroupBusy, setOrderGroupBusy] = useState('')
  const [orderView, setOrderView] = useState<OrderView | null>(null)
  const [expandedFoodSellerIds, setExpandedFoodSellerIds] = useState<Set<string>>(
    () => new Set(),
  )
  const handledMarketplaceSelectionRef = useRef<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [withdrawalsUnavailable, setWithdrawalsUnavailable] = useState(false)
  const [sellerPlans, setSellerPlans] = useState<MarketplaceSellerPlan[]>([])
  const [sellerPlan, setSellerPlan] = useState<MarketplaceSellerSubscription | null>(null)
  const [topUpAmount, setTopUpAmount] = useState('100000')
  const [walletBusy, setWalletBusy] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBankName, setWithdrawBankName] = useState('')
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('')
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState('')

  useEffect(() => subscribeToMarketplaceTabRequests(setTab), [])

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

  const latNum = Number(latitude)
  const lngNum = Number(longitude)

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
    if (nextTab === 'food') {
      setExpandedFoodSellerIds(new Set([selectedMarketplaceId]))
    }
    handledMarketplaceSelectionRef.current = selectedMarketplaceId
  }, [posts, selectedMarketplaceId])

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

  const loadFn = useCallback(async () => {
    if (tab === 'wallet') {
      const [nextWallet, transactions, marketplaceOrders, plans, currentPlan, withdrawalResult] = await Promise.all([
        getMyWallet(),
        getMyWalletTransactions(50),
        getMyMarketplaceOrders(),
        getMarketplaceSellerPlans(),
        getMyMarketplaceSellerPlan(),
        getMyWalletWithdrawals()
          .then((items) => ({ items, unavailable: false }))
          .catch(() => ({ items: [] as WalletWithdrawal[], unavailable: true })),
      ])
      setWallet(nextWallet)
      setWalletTransactions(transactions)
      setOrders(marketplaceOrders)
      setSellerPlans(plans)
      setSellerPlan(currentPlan)
      setWithdrawals(withdrawalResult.items)
      setWithdrawalsUnavailable(withdrawalResult.unavailable)
      return
    }
    if (tab === 'orders') {
      setOrders(await getMyMarketplaceOrders())
      return
    }
    if (tab === 'sell') {
      setPosts(await searchMarketplacePosts({ pageSize: 50 }))
      return
    }
    const list = await searchMarketplacePosts({
      keyword: keyword.trim() || undefined,
      category: category.trim() || undefined,
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
    setPosts(list)

    if (tab === 'browse' || tab === 'food') {
      const forMap = list.filter(
        (p) =>
          isValidCoord(p.latitude, p.longitude) &&
          (p.status === MarketplacePostStatus.Active || p.status == null),
      )
      onPostsForMap?.(marketplacePostsToSellerPins(forMap))
    }
  }, [tab, keyword, category, onPostsForMap, userLocation])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(
    loadFn,
    [tab, keyword, category, myUserId],
    { holdForIntro: false },
  )

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
    if (!address.trim()) {
      setActionError('Nhập địa chỉ bán đồ.')
      return
    }
    if (!isValidCoord(latNum, lngNum)) {
      setActionError('Chọn vị trí trên bản đồ hoặc gợi ý địa chỉ.')
      return
    }
    try {
      setUploading(true)
      let urls: string[] = presetImageUrl ? [presetImageUrl] : [DEFAULT_MEDIA]
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
      const createdPost = await createMarketplacePost({
        title,
        description,
        price: Number(price) || 0,
        condition,
        category: sellCategory,
        address: address.trim(),
        latitude: latNum,
        longitude: lngNum,
        mediaUrls: urls,
        listingType,
        availableQuantity: Number(availableQuantity) || 1,
        unit: unit.trim() || 'phần',
        preparationMinutes:
          listingType === MarketplaceListingType.Food ? Number(preparationMinutes) || 0 : null,
      })
      const destinationTab = createdPost.listingType === MarketplaceListingType.Food
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
      setTab(destinationTab)
      void reload()
      onFocusMap?.({ lat: latNum, lng: lngNum, zoom: MAP_FOCUS_ZOOM })
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đăng tin thất bại'))
    } finally {
      setUploading(false)
    }
  }

  const handleOrder = async (post: MarketplacePost) => {
    setActionError('')
    try {
      const pickupAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const quantity = orderQuantities[post.id] ?? 1
      await createMarketplaceOrder(post.id, {
        pickupAt,
        pickupAddress: 'Thỏa thuận khi chat',
        note: 'Đặt từ Homeji map',
        quantity,
      })
      setActionMsg('Đã gửi yêu cầu mua.')
      setTab('orders')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đặt mua thất bại'))
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

  const startWalletTopUp = async (method: 'momo' | 'payos') => {
    const amount = Number(topUpAmount)
    setWalletBusy(method)
    setActionError('')
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
      setActionMsg('Đã mở cổng thanh toán. Số dư chỉ được cộng sau callback xác thực từ nhà cung cấp.')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không tạo được giao dịch nạp số dư'))
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
    if (cartItems.length === 0 || cartBusy) return
    setCartBusy(true)
    setActionError('')
    try {
      const estimatedPreparationMinutes = Math.max(
        10,
        ...cartItems.map((item) => item.preparationMinutes),
      )
      await createMarketplaceCartOrder({
        items: cartItems.map((item) => ({ postId: item.postId, quantity: item.quantity })),
        pickupAt: new Date(Date.now() + estimatedPreparationMinutes * 60 * 1000).toISOString(),
        pickupAddress: cartItems[0]?.sellerAddress || 'Nhận tại bếp Homeji',
        note: 'Đặt từ giỏ hàng Homeji',
      })
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
      setCartItems([])
      setCartOpen(false)
      setActionMsg(`Đã đặt ${itemCount} món. Chờ bếp xác nhận.`)
      setTab('orders')
      await reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Thanh toán giỏ hàng thất bại'))
    } finally {
      setCartBusy(false)
    }
  }

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount)
    const reserve = wallet?.minimumWithdrawalReserve ?? 20_000
    if (!Number.isInteger(amount) || amount <= 0) {
      setActionError('Số tiền rút phải là số nguyên dương.')
      return
    }
    if (!wallet || wallet.balance - amount < reserve) {
      setActionError(`Ví phải còn tối thiểu ${formatPrice(reserve)} sau khi rút.`)
      return
    }
    if (!withdrawBankName.trim() || !withdrawAccountNumber.trim() || !withdrawAccountHolder.trim()) {
      setActionError('Vui lòng nhập đầy đủ thông tin tài khoản nhận tiền.')
      return
    }
    if (!window.confirm(`Xác nhận gửi yêu cầu rút ${formatPrice(amount)}? Số tiền sẽ được trừ khỏi ví ngay.`)) return

    setWalletBusy('withdraw')
    setActionError('')
    setActionMsg('')
    try {
      await createWalletWithdrawal({
        amount,
        bankName: withdrawBankName.trim(),
        accountNumber: withdrawAccountNumber.trim(),
        accountHolder: withdrawAccountHolder.trim(),
      })
      setWithdrawAmount('')
      setActionMsg('Đã tạo yêu cầu rút tiền. Số dư đã được giữ lại để admin xử lý.')
      await reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không thể tạo yêu cầu rút tiền.'))
    } finally {
      setWalletBusy('')
    }
  }

  const buySellerPlan = async (code: string) => {
    setWalletBusy(code)
    setActionError('')
    try {
      const current = await purchaseMarketplaceSellerPlan(code)
      setSellerPlan(current)
      setActionMsg(`Đã kích hoạt gói ${current.packageName}.`)
      await reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không mua được gói người bán'))
    } finally {
      setWalletBusy('')
    }
  }

  const showOnMap = (p: MarketplacePost) => {
    if (!isValidCoord(p.latitude, p.longitude)) return
    onSelectMarketplaceId?.(p.sellerId)
    onFocusMap?.({ lat: p.latitude, lng: p.longitude, zoom: MAP_FOCUS_ZOOM })
  }

  const renderPostCard = (p: MarketplacePost, mode: 'browse' | 'mine') => {
    const thumb = postThumb(p)
    const mine = mode === 'mine'
    return (
      <article
        key={p.id}
        className={`marketplace-card map-motion-fade-up${
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => showOnMap(p)}>
              Xem map
            </button>
          ) : null}
          {mine && p.status === MarketplacePostStatus.Active ? (
            <>
              {p.listingType !== MarketplaceListingType.Food ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void markMarketplacePostSold(p.id).then(() => reload())}
                >
                  Đã bán
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void archiveMarketplacePost(p.id).then(() => reload())}
              >
                Ẩn tin
              </button>
            </>
          ) : null}
          {!mine && p.status === MarketplacePostStatus.Active ? (
            <>
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
                onClick={() => void handleOrder(p)}
              >
                Mua bằng số dư
              </button>
            </>
          ) : null}
        </div>
      </article>
    )
  }

  const listForTab = useMemo(() => {
    const unfiltered = tab === 'mine'
      ? myPosts
      : tab === 'food'
        ? browsePosts.filter((post) => post.listingType === MarketplaceListingType.Food)
        : browsePosts.filter((post) => post.listingType !== MarketplaceListingType.Food)
    const list = selectedMarketplaceId && tab !== 'mine'
      ? unfiltered.filter((post) => post.sellerId === selectedMarketplaceId)
      : unfiltered
    if (tab === 'mine' || !userLocation) return list
    return [...list].sort((left, right) =>
      (left.distanceKm ?? Number.POSITIVE_INFINITY) -
      (right.distanceKm ?? Number.POSITIVE_INFINITY),
    )
  }, [tab, myPosts, browsePosts, userLocation, selectedMarketplaceId])
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
      posts: sellerPosts,
    }))
  }, [tab, listForTab])
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
      const groupKey = `${order.buyerId}:${order.sellerId}:${order.createdAt}`
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
  const selectedOrderView: OrderView = orderView
    ?? (sellerActionCount > 0 ? 'selling' : 'buying')
  const selectedOrderGroups = selectedOrderView === 'selling'
    ? sellingOrderGroups
    : buyingOrderGroups
  const activeOrderGroups = selectedOrderGroups.filter(
    (group) => !TERMINAL_ORDER_STATUSES.has(group.status),
  )
  const historicalOrderGroups = selectedOrderGroups.filter(
    (group) => TERMINAL_ORDER_STATUSES.has(group.status),
  )

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
  const sellerLocationPost = myPosts[0] ?? null
  const selectedFoodPreset = FOOD_PRESETS.find((preset) => preset.imageUrl === presetImageUrl)

  return (
    <div className={embedded ? 'map-embed marketplace-embed' : 'container page marketplace-page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Chợ Homeji</h1>
          <p className="page-subtitle">Đồ ăn sinh viên và đồ dùng gần nơi ở — thanh toán an toàn bằng Số dư Homeji</p>
        </>
      ) : null}

      <div className="tabs marketplace-tabs" role="tablist" aria-label="Chợ Homeji" style={{ ['--map-tab-cols' as string]: 6 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'food'}
          className={`tab ${tab === 'food' ? 'active' : ''}`}
          onClick={() => {
            onSelectMarketplaceId?.(null)
            setExpandedFoodSellerIds(new Set())
            setTab('food')
          }}
        >
          Đồ ăn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'browse'}
          className={`tab ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => {
            onSelectMarketplaceId?.(null)
            setTab('browse')
          }}
        >
          Chợ đồ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mine'}
          className={`tab ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setTab('mine')}
        >
          Tin của tôi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sell'}
          className={`tab ${tab === 'sell' ? 'active' : ''}`}
          onClick={() => setTab('sell')}
        >
          Đăng bán
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'orders'}
          className={`tab ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Đơn hàng
          {sellerActionCount > 0 ? (
            <span className="marketplace-tab-alert" aria-label={`${sellerActionCount} đơn bán cần xử lý`}>
              {sellerActionCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'wallet'}
          className={`tab ${tab === 'wallet' ? 'active' : ''}`}
          onClick={() => setTab('wallet')}
        >
          Số dư
        </button>
      </div>

      {tab === 'browse' || tab === 'food' || tab === 'mine' ? (
        <div className="marketplace-filters">
          <input
            className="form-input"
            placeholder={tab === 'mine' ? 'Tìm tin của bạn…' : 'Từ khóa…'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="Từ khóa"
          />
          <select
            className="form-select"
            aria-label="Lọc danh mục"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {tab !== 'mine' ? (
            <div className={`marketplace-distance-sort${userLocation ? ' is-active' : ''}`}>
              {userLocation ? (
                <>
                  <span aria-hidden="true">⌖</span>
                  <span>Gần tôi · xếp từ gần đến xa</span>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={locating || !onRequestLocation}
                  onClick={onRequestLocation}
                >
                  <span aria-hidden="true">⌖</span>
                  {locating ? 'Đang lấy vị trí…' : 'Dùng vị trí để xếp gần nhất'}
                </button>
              )}
            </div>
          ) : null}
          {tab === 'food' ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm marketplace-cart-trigger"
              onClick={() => setCartOpen(true)}
              aria-label={`Mở giỏ hàng có ${cartItemCount} món`}
            >
              <span aria-hidden="true">🛒</span>
              Giỏ hàng
              <strong>{cartItemCount}</strong>
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'mine' ? (
        <p className="marketplace-tab-hint">Quản lý tin bạn đã đăng — đánh dấu đã bán hoặc ẩn tin.</p>
      ) : null}

      {showLoader ? (
        disrupted ? (
          <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
        ) : (
          <MarketplaceLoadingSkeleton tab={tab} />
        )
      ) : tab === 'sell' ? (
        <form className="card marketplace-sell-form" onSubmit={(e) => void handleCreate(e)}>
          <div className="marketplace-listing-type" role="group" aria-label="Loại mặt hàng">
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
              🍱 Đồ ăn
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
              🪑 Đồ dùng
            </button>
          </div>

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
            <label className="form-label">Tiêu đề</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="marketplace-sell-grid">
            <div className="form-group">
              <label className="form-label">Giá (VND)</label>
              <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tình trạng</label>
              <select
                className="form-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                {listingType === MarketplaceListingType.Food ? (
                  <option value="Mới làm trong ngày">Mới làm trong ngày</option>
                ) : null}
                {MARKETPLACE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Danh mục</label>
              <select
                className="form-select"
                value={sellCategory}
                onChange={(e) => setSellCategory(e.target.value)}
                required
              >
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Số lượng sẵn bán</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={listingType === MarketplaceListingType.Food ? 100 : 1}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Đơn vị</label>
              <input
                className="form-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={30}
                placeholder="phần, ly, ổ..."
                required
              />
            </div>
            {listingType === MarketplaceListingType.Food ? (
              <div className="form-group">
                <label className="form-label">Thời gian chuẩn bị (phút)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={240}
                  value={preparationMinutes}
                  onChange={(e) => setPreparationMinutes(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label">Địa chỉ / điểm giao cố định</label>
            {sellerLocationPost ? (
              <div className="seller-location-lock">
                <strong>{sellerLocationPost.address}</strong>
                <span>Mọi món của bạn dùng chung điểm bán này để người mua dễ gom đơn.</span>
              </div>
            ) : (
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Nhập địa chỉ — gợi ý Places API"
                required
              />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Vị trí trên bản đồ</label>
            {sellerLocationPost ? (
              <p className="form-hint">Vị trí được khóa theo điểm bán đầu tiên của tài khoản.</p>
            ) : (
              <>
                <p className="form-hint">Chọn gợi ý địa chỉ hoặc kéo pin để gắn tin chợ đồ lên map.</p>
                <LocationPickerMap
                  latitude={latNum}
                  longitude={lngNum}
                  onLocationChange={(lat, lng) => {
                    setLatitude(String(lat))
                    setLongitude(String(lng))
                  }}
                />
              </>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Ảnh sản phẩm</label>
            <p className="form-hint">Chọn tối đa {MAX_MEDIA} ảnh (có thể chọn nhiều file cùng lúc).</p>
            <input
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
            ) : (
              <p className="form-hint">
                {listingType === MarketplaceListingType.Food
                  ? 'Đồ ăn bắt buộc có ảnh món thật hoặc chọn ảnh mẫu.'
                  : 'Chưa chọn ảnh — sẽ dùng ảnh mặc định.'}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Đang tải ảnh / đăng tin…' : 'Đăng tin'}
          </button>
        </form>
      ) : tab === 'wallet' ? (
        <div className="marketplace-wallet">
          <section className="wallet-balance-card card">
            <div>
              <span>Số dư khả dụng</span>
              <strong>{formatPrice(wallet?.balance ?? 0)}</strong>
              <small>
                {wallet?.isActivated
                  ? 'Đã kích hoạt mua bán qua Số dư Homeji'
                  : `Nạp tối thiểu ${formatPrice(wallet?.minimumTopUp ?? 100_000)} để kích hoạt`}
              </small>
            </div>
            <div className="wallet-stats">
              <span>Đã nạp <b>{formatPrice(wallet?.totalDeposited ?? 0)}</b></span>
              <span>Đã mua <b>{formatPrice(wallet?.totalSpent ?? 0)}</b></span>
              <span>Đã kiếm <b>{formatPrice(wallet?.totalEarned ?? 0)}</b></span>
            </div>
          </section>

          <section className="wallet-topup card">
            <div className="wallet-section-head">
              <div>
                <h3>Nạp Số dư Homeji</h3>
                <p>Tiền chỉ được cộng sau webhook có chữ ký từ MoMo/PayOS, không cộng theo trang chuyển hướng.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
                Làm mới
              </button>
            </div>
            <div className="wallet-quick-amounts">
              {[100_000, 200_000, 500_000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={Number(topUpAmount) === amount ? 'is-active' : ''}
                  onClick={() => setTopUpAmount(String(amount))}
                >
                  {formatPrice(amount)}
                </button>
              ))}
            </div>
            <div className="wallet-topup-actions">
              <input
                className="form-input"
                type="number"
                min={wallet?.minimumTopUp ?? 100_000}
                max={wallet?.maximumTopUp ?? 5_000_000}
                step={10_000}
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                aria-label="Số tiền nạp"
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(walletBusy)}
                onClick={() => void startWalletTopUp('momo')}
              >
                {walletBusy === 'momo' ? 'Đang tạo…' : 'Nạp qua MoMo'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(walletBusy)}
                onClick={() => void startWalletTopUp('payos')}
              >
                {walletBusy === 'payos' ? 'Đang tạo…' : 'Nạp qua PayOS'}
              </button>
            </div>
          </section>

          <section className="wallet-withdraw card">
            <div className="wallet-section-head">
              <div>
                <h3>Rút tiền về tài khoản cá nhân</h3>
                <p>
                  Admin sẽ kiểm tra và chuyển khoản thủ công. Ví phải còn tối thiểu{' '}
                  <strong>{formatPrice(wallet?.minimumWithdrawalReserve ?? 20_000)}</strong>.
                </p>
              </div>
            </div>
            {withdrawalsUnavailable ? (
              <p className="wallet-withdraw-unavailable" role="status">
                Rút tiền đang tạm khóa vì database chưa được cập nhật. Các chức năng số dư khác vẫn hoạt động bình thường.
              </p>
            ) : null}
            <div className="wallet-withdraw-grid">
              <input
                className="form-input"
                value={withdrawBankName}
                onChange={(event) => setWithdrawBankName(event.target.value)}
                placeholder="Tên ngân hàng"
                aria-label="Tên ngân hàng nhận tiền"
                maxLength={120}
              />
              <input
                className="form-input"
                value={withdrawAccountNumber}
                onChange={(event) => setWithdrawAccountNumber(event.target.value)}
                placeholder="Số tài khoản"
                aria-label="Số tài khoản nhận tiền"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={40}
              />
              <input
                className="form-input"
                value={withdrawAccountHolder}
                onChange={(event) => setWithdrawAccountHolder(event.target.value.toUpperCase())}
                placeholder="Tên chủ tài khoản"
                aria-label="Tên chủ tài khoản nhận tiền"
                maxLength={120}
              />
              <input
                className="form-input"
                type="number"
                min={1}
                max={Math.max(0, (wallet?.balance ?? 0) - (wallet?.minimumWithdrawalReserve ?? 20_000))}
                step={1_000}
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Số tiền muốn rút"
                aria-label="Số tiền muốn rút"
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={withdrawalsUnavailable || Boolean(walletBusy) || !wallet || wallet.balance <= (wallet.minimumWithdrawalReserve ?? 20_000)}
                onClick={() => void submitWithdrawal()}
              >
                {walletBusy === 'withdraw' ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu rút tiền'}
              </button>
            </div>
            <div className="wallet-withdraw-history">
              <h4>Yêu cầu gần đây</h4>
              {withdrawals.length === 0 ? (
                <p className="marketplace-tab-hint">Chưa có yêu cầu rút tiền.</p>
              ) : (
                <ul>
                  {withdrawals.map((request) => (
                    <li key={request.id}>
                      <div>
                        <strong>{formatPrice(request.amount)}</strong>
                        <small>{request.bankName} · ••••{request.accountNumber.slice(-4)} · {formatDate(request.createdAt)}</small>
                      </div>
                      <span className={`withdrawal-status is-${request.status}`}>
                        {request.status === WalletWithdrawalStatus.Pending
                          ? 'Chờ xử lý'
                          : request.status === WalletWithdrawalStatus.Completed
                            ? 'Đã chuyển'
                            : 'Đã từ chối'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="seller-plans card">
            <div className="wallet-section-head">
              <div>
                <h3>Gói người bán</h3>
                <p>
                  Gói hiện tại: <strong>{sellerPlan?.packageName ?? 'Bắt đầu'}</strong>. Phí gói trừ từ số dư;
                  luôn giữ quỹ đảm bảo {formatPrice(wallet?.minimumWithdrawalReserve ?? 20_000)}.
                </p>
              </div>
            </div>
            <div className="seller-plan-grid">
              {sellerPlans.map((plan) => (
                <article key={plan.code} className={plan.isCurrent ? 'is-current' : ''}>
                  <span>{plan.name}</span>
                  <strong>{plan.monthlyPrice ? formatPrice(plan.monthlyPrice) : 'Miễn phí'}</strong>
                  <p>Hoa hồng {(plan.commissionRate * 100).toFixed(0)}% mỗi đơn hoàn tất</p>
                  {plan.monthlyPrice > 0 ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={Boolean(walletBusy) || plan.isCurrent}
                      onClick={() => void buySellerPlan(plan.code)}
                    >
                      {plan.isCurrent ? 'Đang dùng' : walletBusy === plan.code ? 'Đang mua…' : 'Mua bằng số dư'}
                    </button>
                  ) : (
                    <small>Tự áp dụng khi chưa có gói trả phí</small>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="wallet-history card">
            <div className="wallet-section-head"><h3>Lịch sử số dư</h3></div>
            {displayedWalletTransactions.length === 0 ? (
              <p className="marketplace-tab-hint">Chưa có giao dịch số dư.</p>
            ) : (
              <ul>
                {displayedWalletTransactions.map((transaction) => (
                  <li key={transaction.id}>
                    <div>
                      <strong>{WALLET_TRANSACTION_LABELS[transaction.kind] ?? transaction.description}</strong>
                      <small>{transaction.description} · {formatDate(transaction.createdAt)}</small>
                    </div>
                    <div className={transaction.amount >= 0 ? 'is-credit' : 'is-debit'}>
                      <b>{transaction.amount >= 0 ? '+' : ''}{formatPrice(transaction.amount)}</b>
                      <small>Còn {formatPrice(transaction.balanceAfter)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : tab === 'orders' ? (
        <div className="marketplace-orders-dashboard">
          <div className="marketplace-order-view" role="tablist" aria-label="Loại đơn hàng">
            <button
              type="button"
              role="tab"
              aria-selected={selectedOrderView === 'selling'}
              className={selectedOrderView === 'selling' ? 'is-active' : ''}
              onClick={() => setOrderView('selling')}
            >
              Đơn bán
              {sellerActionCount > 0 ? <strong>{sellerActionCount} mới</strong> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedOrderView === 'buying'}
              className={selectedOrderView === 'buying' ? 'is-active' : ''}
              onClick={() => setOrderView('buying')}
            >
              Đơn mua
              {buyingOrderGroups.length > 0 ? <span>{buyingOrderGroups.length}</span> : null}
            </button>
          </div>

          {selectedOrderView === 'selling' && sellerActionCount > 0 ? (
            <div className="marketplace-order-alert" role="status">
              <span aria-hidden="true">!</span>
              <div>
                <strong>Bạn có {sellerActionCount} đơn mới cần xác nhận</strong>
                <p>Người mua đang chờ. Đơn chưa xác nhận sẽ tự hết hạn sau 30 phút.</p>
              </div>
            </div>
          ) : null}

          {activeOrderGroups.length === 0 ? (
            <div className="empty-state card">
              {selectedOrderView === 'selling'
                ? 'Hiện không có đơn bán nào cần xử lý.'
                : 'Hiện không có đơn mua nào đang xử lý.'}
            </div>
          ) : (
            <div className="marketplace-order-groups">
              {activeOrderGroups.map((group) => {
                const firstOrder = group.orders[0]
                const requested = group.status === MarketplaceOrderStatus.Requested
                const accepted = group.status === MarketplaceOrderStatus.Accepted
                const busy = orderGroupBusy === group.groupKey
                const progressStep = orderProgressStep(group.status)

                return (
                  <section key={group.groupKey} className="marketplace-order-group is-active-order">
                    <header className="marketplace-order-group__header">
                      <div className="marketplace-store-avatar" aria-hidden="true">
                        {group.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span>{selectedOrderView === 'selling' ? 'Đơn từ người mua' : 'Đơn từ người bán'}</span>
                        <h3>{group.name}</h3>
                        <p>{formatDate(group.createdAt)}</p>
                      </div>
                      <span className="marketplace-order-status-pill">
                        {marketplaceOrderStatusLabel[group.status] ?? 'Đơn hàng'}
                      </span>
                    </header>

                    {group.isBuyer ? (
                      <div className="marketplace-order-progress" aria-label={`Tiến trình đơn hàng: bước ${progressStep} trên 3`}>
                        {['Đã đặt', 'Bếp xác nhận', 'Đã nhận món'].map((label, index) => {
                          const step = index + 1
                          const state = step < progressStep ? 'is-done' : step === progressStep ? 'is-current' : ''
                          return (
                            <div key={label} className={state}>
                              <span aria-hidden="true">{step < progressStep ? '✓' : step}</span>
                              <strong>{label}</strong>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    <div className="marketplace-order-summary">
                      <div>
                        <span>{group.orders.length} món · Tổng thanh toán</span>
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

                    {firstOrder && (requested || accepted) ? (
                      <footer className="marketplace-order-group__actions">
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
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void handleOrderGroupAction(
                              group.groupKey,
                              () => completeMarketplaceOrder(firstOrder.id),
                              'Đã hoàn tất toàn bộ đơn hàng.',
                            )}
                          >
                            {busy ? 'Đang xử lý…' : 'Đã nhận đủ món'}
                          </button>
                        ) : null}
                        {accepted && group.isSeller ? (
                          <p className="marketplace-card__info">Đơn đã nhận. Chờ người mua xác nhận để tiền về ví.</p>
                        ) : null}
                      </footer>
                    ) : null}
                  </section>
                )
              })}
            </div>
          )}

          {historicalOrderGroups.length > 0 ? (
            <details className="marketplace-order-history">
              <summary>
                <span>Lịch sử đơn hàng</span>
                <strong>{historicalOrderGroups.length} đơn</strong>
              </summary>
              <div>
                {historicalOrderGroups.map((group) => (
                  <article key={group.groupKey} className="marketplace-order-history__row">
                    <span className="marketplace-order-history__status">
                      {marketplaceOrderStatusLabel[group.status] ?? 'Đã đóng'}
                    </span>
                    <div>
                      <strong>{group.name}</strong>
                      <small>{group.orders.length} món · {formatDate(group.createdAt)}</small>
                    </div>
                    <b>{formatPrice(group.total)}</b>
                  </article>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : listForTab.length === 0 ? (
        <div className="empty-state card">
          {tab === 'mine'
            ? 'Bạn chưa có tin đăng nào.'
            : tab === 'food'
              ? 'Chưa có món ăn đang bán quanh đây.'
              : 'Chưa có đồ dùng đang bán quanh đây.'}
        </div>
      ) : tab === 'food' ? (
        <div className="food-store-list">
          {foodSellerGroups.map((group) => (
            <section key={group.sellerId} className="food-store map-motion-fade-up">
              <header className="food-store__header">
                <button
                  type="button"
                  className="food-store__toggle"
                  aria-expanded={expandedFoodSellerIds.has(group.sellerId)}
                  onClick={() => setExpandedFoodSellerIds((current) => {
                    const next = new Set(current)
                    if (next.has(group.sellerId)) next.delete(group.sellerId)
                    else next.add(group.sellerId)
                    return next
                  })}
                >
                  <span className="marketplace-store-avatar" aria-hidden="true">
                    {group.sellerName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="food-store__identity">
                    <span className="food-store__eyebrow">Bếp Homeji · {group.posts.length} món</span>
                    <span className="food-store__name">{group.sellerName}</span>
                    <span className="food-store__address">{group.address}</span>
                  </span>
                  <span className="food-store__distance">
                    {formatNearbyDistance(group.distanceKm, locating, Boolean(userLocation))}
                  </span>
                  <span className="food-store__chevron" aria-hidden="true">⌄</span>
                </button>
              </header>
              {expandedFoodSellerIds.has(group.sellerId) ? <div className="food-menu-grid">
                {group.posts.map((post) => {
                  const thumb = postThumb(post)
                  const cartItem = cartItems.find((item) => item.postId === post.id)
                  return (
                    <article key={post.id} className="food-menu-item">
                      <button type="button" className="food-menu-item__visual" onClick={() => showOnMap(post)}>
                        {thumb ? <img src={thumb} alt={post.title} loading="lazy" /> : <span>Homeji Food</span>}
                        <span className="food-menu-item__distance">
                          {formatNearbyDistance(post.distanceKm, locating, Boolean(userLocation))}
                        </span>
                      </button>
                      <div className="food-menu-item__body">
                        <div>
                          <h3>{post.title}</h3>
                          <p>{post.category} · {post.preparationMinutes || 0} phút</p>
                        </div>
                        <strong>{formatPrice(post.price)}</strong>
                        <div className="food-menu-item__buy">
                          <label>
                            <span className="sr-only">Số lượng {post.title}</span>
                            <input
                              type="number"
                              min={1}
                              max={post.availableQuantity}
                              value={orderQuantities[post.id] ?? 1}
                              onChange={(event) => setOrderQuantities((current) => ({
                                ...current,
                                [post.id]: Math.max(1, Math.min(post.availableQuantity, Number(event.target.value) || 1)),
                              }))}
                            />
                          </label>
                          <button
                            type="button"
                            className={`food-menu-item__add${cartItem ? ' is-added' : ''}`}
                            aria-pressed={Boolean(cartItem)}
                            onClick={() => cartItem ? removeFromCart(post) : addToCart(post)}
                          >
                            {cartItem ? 'Xóa khỏi giỏ' : 'Thêm vào giỏ'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div> : null}
            </section>
          ))}
        </div>
      ) : (
        <div className="marketplace-list">
          {listForTab.map((p) => renderPostCard(p, tab === 'mine' ? 'mine' : 'browse'))}
        </div>
      )}

      {tab === 'food' && cartItems.length > 0 && !cartOpen ? (
        <button type="button" className="food-cart-sticky" onClick={() => setCartOpen(true)}>
          <span className="food-cart-sticky__count" aria-hidden="true">{cartItemCount}</span>
          <span>
            <small>{cartItems[0]?.sellerName}</small>
            <strong>Xem giỏ hàng</strong>
          </span>
          <b>{formatPrice(cartTotal)}</b>
        </button>
      ) : null}

      {cartOpen ? createPortal((
        <div
          className="food-cart-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cartBusy) setCartOpen(false)
          }}
        >
          <section
            className="food-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-cart-title"
          >
            <header className="food-cart-drawer__header">
              <div>
                <span>Giỏ hàng · {cartItems[0]?.sellerName || 'Bếp Homeji'}</span>
                <h2 id="food-cart-title">Món bạn đã chọn</h2>
              </div>
              <button
                type="button"
                className="food-cart-drawer__close"
                onClick={() => setCartOpen(false)}
                disabled={cartBusy}
                aria-label="Đóng giỏ hàng"
              >
                ×
              </button>
            </header>

            {cartItems.length === 0 ? (
              <div className="food-cart-empty">
                <span aria-hidden="true">🛒</span>
                <strong>Giỏ hàng đang trống</strong>
                <p>Chọn món từ một bếp để bắt đầu đặt hàng.</p>
              </div>
            ) : (
              <ul className="food-cart-list">
                {cartItems.map((item) => (
                  <li key={item.postId}>
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="food-cart-list__placeholder">H</span>}
                    <div className="food-cart-list__info">
                      <strong>{item.title}</strong>
                      <span>{formatPrice(item.price)} / {item.unit}</span>
                      <button
                        type="button"
                        onClick={() => setCartItems((current) => current.filter((entry) => entry.postId !== item.postId))}
                        disabled={cartBusy}
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="food-cart-list__quantity" aria-label={`Số lượng ${item.title}`}>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.postId, item.quantity - 1)}
                        disabled={cartBusy || item.quantity <= 1}
                        aria-label={`Giảm ${item.title}`}
                      >−</button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.postId, item.quantity + 1)}
                        disabled={cartBusy || item.quantity >= item.availableQuantity}
                        aria-label={`Tăng ${item.title}`}
                      >+</button>
                    </div>
                    <b>{formatPrice(item.price * item.quantity)}</b>
                  </li>
                ))}
              </ul>
            )}

            <footer className="food-cart-drawer__footer">
              <div>
                <span>Tạm tính · {cartItemCount} món</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              {cartItems.length > 0 && cartTotal < MINIMUM_FOOD_CART_TOTAL ? (
                <p>
                  Thêm {formatPrice(MINIMUM_FOOD_CART_TOTAL - cartTotal)} để đạt đơn tối thiểu{' '}
                  {formatPrice(MINIMUM_FOOD_CART_TOTAL)}.
                </p>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={cartBusy || cartItems.length === 0 || cartTotal < MINIMUM_FOOD_CART_TOTAL}
                onClick={() => void checkoutCart()}
              >
                {cartBusy ? 'Đang đặt món…' : `Đặt món · ${formatPrice(cartTotal)}`}
              </button>
              {cartItems.length > 0 ? (
                <button
                  type="button"
                  className="food-cart-clear"
                  onClick={() => setCartItems([])}
                  disabled={cartBusy}
                >
                  Xóa toàn bộ giỏ
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      ), document.body) : null}

      <MapToast
        message={toastMessage}
        tone={toastTone}
        onDismiss={() => {
          setActionMsg('')
          setActionError('')
          if (error && !disrupted) setHiddenLoadError(error)
        }}
      />
    </div>
  )
}
