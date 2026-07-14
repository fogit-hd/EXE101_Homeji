import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acceptMarketplaceOrder,
  archiveMarketplacePost,
  cancelMarketplaceOrder,
  completeMarketplaceOrder,
  createMarketplaceOrder,
  createMarketplacePost,
  getMyMarketplaceOrders,
  getStoredSession,
  markMarketplacePostSold,
  rejectMarketplaceOrder,
  searchMarketplacePosts,
  uploadImages,
  type MarketplaceOrder,
  type MarketplacePost,
} from '../api'
import { MarketplaceOrderStatus, MarketplacePostStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { AddressAutocomplete, type PlaceResult } from '../components/map/AddressAutocomplete'
import { LocationPickerMap } from '../components/map/LocationPickerMap'
import { MapToast } from '../components/map/MapToast'
import type { MarketplaceMapPin } from '../components/map/RentalMap'
import { useAuth } from '../contexts/AuthContext'
import { isValidCoord, MAP_FOCUS_ZOOM } from '../lib/googleMaps'
import { getErrorMessage } from '../lib/errors'
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
const DEFAULT_MEDIA = '/vite.svg'
const MAX_MEDIA = 10

type MediaDraft = {
  id: string
  file: File
  previewUrl: string
}

type MarketTab = 'browse' | 'mine' | 'sell' | 'orders'

type Props = {
  embedded?: boolean
  onPostsForMap?: (pins: MarketplaceMapPin[]) => void
  onFocusMap?: (loc: { lat: number; lng: number; zoom?: number }) => void
  selectedMarketplaceId?: string | null
  onSelectMarketplaceId?: (id: string | null) => void
}

function postThumb(p: MarketplacePost): string | null {
  const url = p.mediaUrls?.find((u) => u && !u.endsWith('/vite.svg'))
  return url || null
}

function toPins(list: MarketplacePost[]): MarketplaceMapPin[] {
  return list
    .filter((p) => isValidCoord(p.latitude, p.longitude))
    .map((p) => ({
      id: p.id,
      title: p.title,
      lat: p.latitude,
      lng: p.longitude,
      price: p.price,
    }))
}

export function MarketplacePage({
  embedded = false,
  onPostsForMap,
  onFocusMap,
  selectedMarketplaceId = null,
  onSelectMarketplaceId,
}: Props) {
  const { profile } = useAuth()
  const myUserId = profile?.id ?? getStoredSession()?.userId ?? null

  const [tab, setTab] = useState<MarketTab>('browse')
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
    if (tab === 'orders') {
      setOrders(await getMyMarketplaceOrders())
      return
    }
    if (tab === 'sell') {
      return
    }
    const list = await searchMarketplacePosts({
      keyword: keyword.trim() || undefined,
      category: category.trim() || undefined,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LNG,
      radiusKm: 25,
      pageSize: 40,
    })
    setPosts(list)

    if (tab === 'browse') {
      const forMap = list.filter(
        (p) =>
          isValidCoord(p.latitude, p.longitude) &&
          (p.status === MarketplacePostStatus.Active || p.status == null),
      )
      onPostsForMap?.(toPins(forMap))
    }
  }, [tab, keyword, category, onPostsForMap, myUserId])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(loadFn, [
    tab,
    keyword,
    category,
    myUserId,
  ])

  const [loadErrorHidden, setLoadErrorHidden] = useState(false)

  useEffect(() => {
    setLoadErrorHidden(false)
  }, [error])

  const toastMessage =
    actionError ||
    actionMsg ||
    (error && !disrupted && !loadErrorHidden ? error : '') ||
    null
  const toastTone = actionMsg && !actionError ? 'success' : 'error'

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => {
      setActionMsg('')
      setActionError('')
      if (error && !disrupted) setLoadErrorHidden(true)
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
      let urls: string[] = [DEFAULT_MEDIA]
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
      await createMarketplacePost({
        title,
        description,
        price: Number(price) || 0,
        condition,
        category: sellCategory,
        address: address.trim(),
        latitude: latNum,
        longitude: lngNum,
        mediaUrls: urls,
      })
      setActionMsg('Đã đăng tin chợ đồ — xem trong “Tin của tôi”.')
      setTitle('')
      setDescription('')
      setPrice('')
      for (const m of mediaFiles) URL.revokeObjectURL(m.previewUrl)
      setMediaFiles([])
      setTab('mine')
      void reload()
      onFocusMap?.({ lat: latNum, lng: lngNum, zoom: MAP_FOCUS_ZOOM })
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đăng tin thất bại'))
    } finally {
      setUploading(false)
    }
  }

  const handleOrder = async (postId: string) => {
    setActionError('')
    try {
      const pickupAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await createMarketplaceOrder(postId, {
        pickupAt,
        pickupAddress: 'Thỏa thuận khi chat',
        note: 'Đặt từ Homeji map',
      })
      setActionMsg('Đã gửi yêu cầu mua.')
      setTab('orders')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đặt mua thất bại'))
    }
  }

  const showOnMap = (p: MarketplacePost) => {
    if (!isValidCoord(p.latitude, p.longitude)) return
    onSelectMarketplaceId?.(p.id)
    onFocusMap?.({ lat: p.latitude, lng: p.longitude, zoom: MAP_FOCUS_ZOOM })
  }

  const renderPostCard = (p: MarketplacePost, mode: 'browse' | 'mine') => {
    const thumb = postThumb(p)
    const mine = mode === 'mine'
    return (
      <article
        key={p.id}
        className={`marketplace-card map-motion-fade-up${
          selectedMarketplaceId === p.id ? ' is-selected' : ''
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
                {mine ? 'Tin của tôi' : marketplacePostStatusLabel[p.status] ?? p.category}
              </span>
              {mine ? (
                <span className="marketplace-card__status">
                  {marketplacePostStatusLabel[p.status] ?? p.category}
                </span>
              ) : null}
            </div>
            <h3 className="marketplace-card__title">{p.title}</h3>
            <p className="marketplace-card__price">{formatPrice(p.price)}</p>
            <p className="marketplace-card__info">
              {p.condition}
              {p.category ? ` · ${p.category}` : ''}
            </p>
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
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void markMarketplacePostSold(p.id).then(() => reload())}
              >
                Đã bán
              </button>
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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void handleOrder(p.id)}
            >
              Đặt mua
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  const listForTab = tab === 'mine' ? myPosts : browsePosts

  return (
    <div className={embedded ? 'map-embed marketplace-embed' : 'container page marketplace-page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Chợ đồ</h1>
          <p className="page-subtitle">Mua bán đồ nội thất / đồ dùng quanh khu vực thuê</p>
        </>
      ) : null}

      <div className="tabs marketplace-tabs" role="tablist" aria-label="Chợ đồ" style={{ ['--map-tab-cols' as string]: 4 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'browse'}
          className={`tab ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => setTab('browse')}
        >
          Đang bán
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
        </button>
      </div>

      {tab === 'browse' || tab === 'mine' ? (
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
        </div>
      ) : null}

      {tab === 'mine' ? (
        <p className="marketplace-tab-hint">Quản lý tin bạn đã đăng — đánh dấu đã bán hoặc ẩn tin.</p>
      ) : null}

      {showLoader ? (
        <HomejiLoader onIntroComplete={onIntroComplete} message={disrupted ? error : undefined} />
      ) : tab === 'sell' ? (
        <form className="card marketplace-sell-form" onSubmit={(e) => void handleCreate(e)}>
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
          </div>
          <div className="form-group">
            <label className="form-label">Địa chỉ / điểm giao</label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Nhập địa chỉ — gợi ý Places API"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vị trí trên bản đồ</label>
            <p className="form-hint">Chọn gợi ý địa chỉ hoặc kéo pin để gắn tin chợ đồ lên map.</p>
            <LocationPickerMap
              latitude={latNum}
              longitude={lngNum}
              onLocationChange={(lat, lng) => {
                setLatitude(String(lat))
                setLongitude(String(lng))
              }}
            />
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
            ) : (
              <p className="form-hint">Chưa chọn ảnh — sẽ dùng ảnh mặc định.</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Đang tải ảnh / đăng tin…' : 'Đăng tin'}
          </button>
        </form>
      ) : tab === 'orders' ? (
        orders.length === 0 ? (
          <div className="empty-state card">Chưa có đơn hàng.</div>
        ) : (
          <div className="marketplace-list">
            {orders.map((o) => {
              const iAmBuyer = Boolean(myUserId && o.buyerId === myUserId)
              const iAmSeller = Boolean(myUserId && o.sellerId === myUserId)
              const requested = o.status === MarketplaceOrderStatus.Requested
              const accepted = o.status === MarketplaceOrderStatus.Accepted
              return (
                <article key={o.id} className="marketplace-order card map-motion-fade-up">
                  <div className="marketplace-order__body">
                    <div className="marketplace-card__meta-row">
                      <span className={`marketplace-card__badge${iAmSeller ? ' is-mine' : ''}`}>
                        {marketplaceOrderStatusLabel[o.status] ?? 'Đơn'}
                      </span>
                      <span className="marketplace-card__status">
                        {iAmSeller ? 'Bạn là người bán' : iAmBuyer ? 'Bạn là người mua' : 'Đơn hàng'}
                      </span>
                    </div>
                    <p className="marketplace-card__price">{formatPrice(o.agreedPrice)}</p>
                    <p className="marketplace-card__addr">{o.pickupAddress}</p>
                    <small className="marketplace-card__seller">{formatDate(o.pickupAt)}</small>
                    {requested && iAmBuyer ? (
                      <p className="marketplace-card__info">Đang chờ người bán xác nhận yêu cầu của bạn.</p>
                    ) : null}
                    {requested && iAmSeller ? (
                      <p className="marketplace-card__info">Người mua đang chờ bạn nhận hoặc từ chối.</p>
                    ) : null}
                  </div>
                  <div className="marketplace-card__actions">
                    {requested && iAmSeller ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void acceptMarketplaceOrder(o.id).then(() => reload())}
                        >
                          Nhận đơn
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void rejectMarketplaceOrder(o.id).then(() => reload())}
                        >
                          Từ chối
                        </button>
                      </>
                    ) : null}
                    {requested && iAmBuyer ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void cancelMarketplaceOrder(o.id).then(() => reload())}
                      >
                        Hủy yêu cầu
                      </button>
                    ) : null}
                    {accepted && iAmSeller ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void completeMarketplaceOrder(o.id).then(() => reload())}
                      >
                        Hoàn tất
                      </button>
                    ) : null}
                    {accepted && iAmBuyer ? (
                      <p className="marketplace-card__info">Người bán đã nhận — chờ giao / hoàn tất.</p>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )
      ) : listForTab.length === 0 ? (
        <div className="empty-state card">
          {tab === 'mine' ? 'Bạn chưa có tin đăng nào.' : 'Chưa có tin đang bán quanh đây.'}
        </div>
      ) : (
        <div className="marketplace-list">
          {listForTab.map((p) => renderPostCard(p, tab === 'mine' ? 'mine' : 'browse'))}
        </div>
      )}

      <MapToast
        message={toastMessage}
        tone={toastTone}
        onDismiss={() => {
          setActionMsg('')
          setActionError('')
          if (error && !disrupted) setLoadErrorHidden(true)
        }}
      />
    </div>
  )
}
