import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addRentalPostMedia,
  archiveRentalPost,
  deleteRentalPostMedia,
  getRentalPost,
  submitRentalPost,
  updateRentalPost,
  uploadImages,
  type RentalPost,
} from '../api'
import { MediaType, RentalPostType, RoomTransferKind } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { AddressAutocomplete } from '../components/map/AddressAutocomplete'
import { LocationPickerMap } from '../components/map/LocationPickerMap'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleMaps } from '../contexts/GoogleMapsProvider'
import { geocodeAddress, isValidCoord } from '../lib/googleMaps'
import { getErrorMessage } from '../lib/errors'
import { AMENITY_OPTIONS, amenityLabel, normalizeAmenityCode, rentalPostTypeLabel } from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'

export function EditRentalPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const { profile } = useAuth()

  const [post, setPost] = useState<RentalPost | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [type, setType] = useState<RentalPostType>(RentalPostType.VacantRoom)
  const [amenities, setAmenities] = useState<string[]>([])
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [originalLeaseEndsOn, setOriginalLeaseEndsOn] = useState('')
  const [transferKind, setTransferKind] = useState<RoomTransferKind>(RoomTransferKind.LeaseAssignment)
  const [passFee, setPassFee] = useState('0')
  const [transferReason, setTransferReason] = useState('')
  const [ownerConsentConfirmed, setOwnerConsentConfirmed] = useState(false)
  const [ownerConsentContact, setOwnerConsentContact] = useState('')

  const loadFn = useCallback(async () => {
    if (!postId) return
    const data = await getRentalPost(postId)
    setPost(data)
    setTitle(data.title)
    setDescription(data.description)
    setPrice(String(data.price))
    setDeposit(String(data.deposit))
    setArea(String(data.area))
    setAddress(data.address)
    setLatitude(String(data.latitude))
    setLongitude(String(data.longitude))
    setType(data.type)
    setAmenities(data.amenities.map((a) => normalizeAmenityCode(a)))
    setAvailableFrom(data.availableFrom ?? '')
    setOriginalLeaseEndsOn(data.originalLeaseEndsOn ?? '')
    setTransferKind(data.transferKind ?? RoomTransferKind.LeaseAssignment)
    setPassFee(String(data.passFee ?? 0))
    setTransferReason(data.transferReason ?? '')
    setOwnerConsentConfirmed(data.ownerConsentConfirmed ?? false)
    setOwnerConsentContact(data.ownerConsentContact ?? '')
  }, [postId])

  const { showLoader, onIntroComplete, error: loadError, disrupted } = usePersistentLoad(
    loadFn,
    [postId],
    { enabled: !!postId },
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postId) return
    setError('')
    try {
      const updated = await updateRentalPost(postId, {
        type,
        title,
        description,
        price: Number(price),
        deposit: Number(deposit),
        area: Number(area),
        address,
        latitude: isValidCoord(latNum, lngNum) ? latNum : Number(latitude),
        longitude: isValidCoord(latNum, lngNum) ? lngNum : Number(longitude),
        amenities: amenities.map((a) => normalizeAmenityCode(a)),
        availableFrom: availableFrom || undefined,
        transferKind: type === RentalPostType.RoomTransfer ? transferKind : undefined,
        originalLeaseEndsOn: type === RentalPostType.RoomTransfer ? originalLeaseEndsOn : undefined,
        passFee: type === RentalPostType.RoomTransfer ? Number(passFee) : undefined,
        transferReason: type === RentalPostType.RoomTransfer ? transferReason : undefined,
        ownerConsentConfirmed: type === RentalPostType.RoomTransfer ? ownerConsentConfirmed : undefined,
        ownerConsentContact: type === RentalPostType.RoomTransfer ? ownerConsentContact : undefined,
      })
      setPost(updated)
      setMessage('Đã lưu tin đăng.')
    } catch (err) {
      setError(getErrorMessage(err, 'Lưu thất bại'))
    }
  }

  const handleAddMedia = async () => {
    if (!postId || !profile || mediaFiles.length === 0) return
    setError('')
    setUploadingMedia(true)
    try {
      const remainingSlots = Math.max(0, 10 - (post?.media.length ?? 0))
      const selectedFiles = mediaFiles.slice(0, remainingSlots)
      if (selectedFiles.length === 0) {
        setError('Mỗi tin được tối đa 10 ảnh.')
        return
      }

      const uploaded = await uploadImages(
        selectedFiles,
        `rental-posts/${profile.id}/${postId}`,
      )
      let updated = post
      for (const image of uploaded) {
        updated = await addRentalPostMedia(postId, {
          mediaType: MediaType.Image,
          bucket: 'cloudinary',
          path: image.url,
          isThumbnail: (updated?.media.length ?? 0) === 0,
          sortOrder: updated?.media.length ?? 0,
        })
      }
      setPost(updated)
      setMediaFiles([])
      setMessage(`Đã tải lên ${uploaded.length} ảnh.`)
    } catch (err) {
      setError(getErrorMessage(err, 'Thêm ảnh thất bại'))
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!postId) return
    try {
      await deleteRentalPostMedia(postId, mediaId)
      const updated = await getRentalPost(postId)
      setPost(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Xóa ảnh thất bại'))
    }
  }

  const handleSubmit = async () => {
    if (!postId) return
    try {
      await submitRentalPost(postId)
      setMessage('Tin đăng đã gửi duyệt.')
      navigate(mapPostUrl(postId))
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi duyệt thất bại'))
    }
  }

  const handleArchive = async () => {
    if (!postId || !confirm('Lưu trữ tin đăng này?')) return
    try {
      await archiveRentalPost(postId)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, 'Lưu trữ thất bại'))
    }
  }

  const toggleAmenity = (amenity: string) => {
    const code = normalizeAmenityCode(amenity)
    setAmenities((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code],
    )
  }

  const handlePlaceSelect = (place: { address: string; lat: number; lng: number }) => {
    setAddress(place.address)
    setLatitude(String(place.lat))
    setLongitude(String(place.lng))
  }

  const handleGeocodeAddress = async () => {
    if (!mapsLoaded || !address.trim()) return
    setError('')
    const result = await geocodeAddress(address)
    if (!result) {
      setError('Không tìm thấy tọa độ cho địa chỉ này.')
      return
    }
    setAddress(result.formattedAddress)
    setLatitude(String(result.lat))
    setLongitude(String(result.lng))
    setMessage('Đã cập nhật tọa độ từ địa chỉ.')
  }

  const latNum = Number(latitude)
  const lngNum = Number(longitude)

  if (showLoader) {
    return disrupted ? (
      <HomejiLoader
        fullPage
        onIntroComplete={onIntroComplete}
        message={loadError}
      />
    ) : (
      <main className="container page">
        <ContentSkeleton variant="form" count={6} label="Đang tải nội dung chỉnh sửa tin…" />
      </main>
    )
  }

  return (
    <div className="container page">
      <h1 className="page-title">Chỉnh sửa tin đăng</h1>
      <p className="page-subtitle">{rentalPostTypeLabel[type]}</p>

      {(error || loadError) && !disrupted && (
        <div className="alert alert-error">{error || loadError}</div>
      )}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card" onSubmit={handleSave}>
        {type === RentalPostType.RoomTransfer ? (
          <section className="room-transfer-form" aria-labelledby="room-transfer-title">
            <div className="room-transfer-form__notice">
              <strong id="room-transfer-title">Thông tin pass phòng</strong>
              <p>Homeji tách chuyển hợp đồng và cho thuê lại. Tin chỉ công khai sau khi đội ngũ kiểm tra xác nhận của chủ nhà.</p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="transfer-kind">Hình thức</label>
                <select
                  id="transfer-kind"
                  className="form-select"
                  value={transferKind}
                  onChange={(event) => setTransferKind(Number(event.target.value) as RoomTransferKind)}
                >
                  <option value={RoomTransferKind.LeaseAssignment}>Chuyển hợp đồng — rời hẳn</option>
                  <option value={RoomTransferKind.TemporarySublet}>Cho thuê lại tạm thời — sẽ quay lại</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="transfer-from">Ngày có thể vào</label>
                <input id="transfer-from" className="form-input" type="date" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lease-end">Hợp đồng gốc kết thúc</label>
                <input id="lease-end" className="form-input" type="date" value={originalLeaseEndsOn} onChange={(event) => setOriginalLeaseEndsOn(event.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="pass-fee">Phí pass (VND, nếu có)</label>
                <input id="pass-fee" className="form-input" type="number" min="0" value={passFee} onChange={(event) => setPassFee(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="owner-contact">Kênh để Homeji xác minh chủ nhà</label>
                <input id="owner-contact" className="form-input" value={ownerConsentContact} onChange={(event) => setOwnerConsentContact(event.target.value)} maxLength={200} placeholder="Số điện thoại hoặc email chủ nhà/người quản lý" required />
                <small className="form-hint">Thông tin này chỉ hiển thị cho bộ phận kiểm duyệt.</small>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-reason">Lý do pass an toàn</label>
              <textarea id="transfer-reason" className="form-textarea" value={transferReason} onChange={(event) => setTransferReason(event.target.value)} maxLength={500} required />
            </div>
            <label className="room-transfer-form__consent">
              <input type="checkbox" checked={ownerConsentConfirmed} onChange={(event) => setOwnerConsentConfirmed(event.target.checked)} required />
              Tôi xác nhận chủ nhà/người cho thuê đã đồng ý cho chuyển hợp đồng hoặc cho thuê lại và Homeji có thể liên hệ để kiểm tra.
            </label>
            <p className="room-transfer-form__warning">Không đặt cọc trước khi xem phòng, xác minh người cho thuê và đọc văn bản chuyển giao.</p>
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
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Giá thuê (VND)</label>
            <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Tiền cọc</label>
            <input className="form-input" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Diện tích (m²)</label>
            <input className="form-input" type="number" value={area} onChange={(e) => setArea(e.target.value)} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Địa chỉ</label>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Nhập địa chỉ — gợi ý tự động (Places API)"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleGeocodeAddress()}>
              Lấy tọa độ từ địa chỉ
            </button>
            {isValidCoord(latNum, lngNum) && (
              <span className="map-coord-hint">
                {latNum.toFixed(5)}, {lngNum.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Vị trí trên bản đồ</label>
          <p className="form-hint">Chọn từ gợi ý địa chỉ, bấm &quot;Lấy tọa độ&quot;, hoặc click/kéo pin trên bản đồ.</p>
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
          <label className="form-label">Tiện ích</label>
          <div className="amenity-filters">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                className={`amenity-chip ${amenities.includes(a) ? 'active' : ''}`}
                onClick={() => toggleAmenity(a)}
              >
                {amenityLabel(a)}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Lưu nháp</button>
      </form>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Hình ảnh</h2>
        <div className="form-group">
          <label className="form-label" htmlFor="rental-media">Chọn ảnh phòng</label>
          <p className="form-hint">Tối thiểu 3 ảnh thật, tối đa 10 ảnh. Chấp nhận JPEG, PNG hoặc WebP.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="rental-media"
              className="form-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => setMediaFiles(Array.from(event.target.files ?? []))}
            />
            <button type="button" className="btn btn-secondary" disabled={uploadingMedia || mediaFiles.length === 0} onClick={() => void handleAddMedia()}>
              {uploadingMedia ? 'Đang tải...' : `Tải ${mediaFiles.length || ''} ảnh`}
            </button>
          </div>
        </div>
        {post?.media.map((m) => (
          <div key={m.id} className="media-item">
            <img src={m.path} alt="" width={120} height={80} style={{ objectFit: 'cover', borderRadius: 8 }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleDeleteMedia(m.id)}>Xóa</button>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-primary" onClick={() => void handleSubmit()}>Gửi duyệt</button>
        <button type="button" className="btn btn-secondary" onClick={() => void handleArchive()}>Lưu trữ</button>
      </div>
    </div>
  )
}
