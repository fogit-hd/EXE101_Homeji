import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addRentalPostMedia,
  archiveRentalPost,
  deleteRentalPostMedia,
  getRentalPost,
  submitRentalPost,
  updateRentalPost,
  type RentalPost,
} from '../api'
import { MediaType, RentalPostType } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { AddressAutocomplete } from '../components/map/AddressAutocomplete'
import { LocationPickerMap } from '../components/map/LocationPickerMap'
import { useGoogleMaps } from '../contexts/GoogleMapsProvider'
import { geocodeAddress, isValidCoord } from '../lib/googleMaps'
import { getErrorMessage } from '../lib/errors'
import { AMENITY_OPTIONS, rentalPostTypeLabel } from '../lib/labels'

export function EditRentalPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { isLoaded: mapsLoaded } = useGoogleMaps()

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
  const [mediaPath, setMediaPath] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
    setAmenities([...data.amenities])
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
        amenities,
      })
      setPost(updated)
      setMessage('Đã lưu tin đăng.')
    } catch (err) {
      setError(getErrorMessage(err, 'Lưu thất bại'))
    }
  }

  const handleAddMedia = async () => {
    if (!postId || !mediaPath) return
    try {
      const updated = await addRentalPostMedia(postId, {
        mediaType: MediaType.Image,
        path: mediaPath,
        isThumbnail: (post?.media.length ?? 0) === 0,
        sortOrder: post?.media.length ?? 0,
      })
      setPost(updated)
      setMediaPath('')
      setMessage('Đã thêm ảnh.')
    } catch (err) {
      setError(getErrorMessage(err, 'Thêm ảnh thất bại'))
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
      navigate(`/posts/${postId}`)
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
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
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
    return (
      <HomejiLoader
        fullPage
        onIntroComplete={onIntroComplete}
        message={disrupted ? loadError : undefined}
      />
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
                {a}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Lưu nháp</button>
      </form>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Hình ảnh</h2>
        <div className="form-group">
          <label className="form-label">URL ảnh</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={mediaPath} onChange={(e) => setMediaPath(e.target.value)} placeholder="https://..." />
            <button type="button" className="btn btn-secondary" onClick={() => void handleAddMedia()}>Thêm</button>
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
