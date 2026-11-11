import React, { useState, useEffect } from 'react'
import { FOOD_PRESETS, type FoodPreset } from '../../../lib/foodPresets'
import { ProfitMarginCalculator } from './ProfitMarginCalculator'
import { LiveFoodCardPreview } from './LiveFoodCardPreview'

export interface FoodFormData {
  title: string
  description: string
  price: number
  category: string
  availableQuantity: number
  unit: string
  preparationMinutes: number
  estimatedCost: number
  dailyQuota: number
  freshnessBadge: string
  allergenAlerts: string
  isSamplePhoto: boolean
  mediaUrls: string[]
  mediaFiles: File[]
}

export interface MarketplaceSellFoodFormProps {
  editingPostId?: string | null
  initialValues?: {
    title?: string
    description?: string
    price?: number
    category?: string
    availableQuantity?: number
    unit?: string
    preparationMinutes?: number
    estimatedCost?: number
    dailyQuota?: number
    freshnessBadge?: string
    allergenAlerts?: string
    isSamplePhoto?: boolean
    mediaUrls?: string[]
  }
  sellingAddress: string
  latNum?: number | null
  lngNum?: number | null
  hasAddressAnchor?: boolean
  uploading: boolean
  actionError: string
  onSubmit: (data: FoodFormData) => Promise<void>
}

const CATEGORIES = ['Cơm nhà', 'Bún/Phở', 'Bánh mì', 'Ăn vặt', 'Đồ uống', 'Món chay']
const FRESHNESS_OPTIONS = [
  { value: 'CookToOrder', label: '🔥 Nấu nóng theo đơn (Đặt mới nấu)' },
  { value: 'DailyBatch', label: '🍲 Nấu theo mẻ trong ca (Còn nóng hổi)' },
  { value: 'ChilledReady', label: '🧊 Đồ ăn vặt / Đồ uống ướp lạnh' },
]
const ALLERGEN_PRESETS = ['Không cay', 'Cay vừa', 'Cay nhiều', 'Có đậu phộng', 'Có hải sản', 'Món chay']

export const MarketplaceSellFoodForm: React.FC<MarketplaceSellFoodFormProps> = ({
  editingPostId,
  initialValues,
  sellingAddress,
  hasAddressAnchor,
  uploading,
  actionError,
  onSubmit,
}) => {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [price, setPrice] = useState<number>(initialValues?.price || 30000)
  const [estimatedCost, setEstimatedCost] = useState<number>(initialValues?.estimatedCost || 15000)
  const [category, setCategory] = useState(initialValues?.category || 'Cơm nhà')
  const [unit, setUnit] = useState(initialValues?.unit || 'suất')
  const [preparationMinutes, setPreparationMinutes] = useState<number>(initialValues?.preparationMinutes || 20)
  const [dailyQuota, setDailyQuota] = useState<number>(initialValues?.dailyQuota || 20)
  const [availableQuantity, setAvailableQuantity] = useState<number>(initialValues?.availableQuantity || 20)
  const [freshnessBadge, setFreshnessBadge] = useState(initialValues?.freshnessBadge || 'CookToOrder')
  const [allergenAlerts, setAllergenAlerts] = useState(initialValues?.allergenAlerts || 'Không cay')
  const [isSamplePhoto, setIsSamplePhoto] = useState<boolean>(initialValues?.isSamplePhoto ?? false)
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialValues?.mediaUrls || [])
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [previewUrl, setPreviewUrl] = useState<string>(initialValues?.mediaUrls?.[0] || '')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (initialValues) {
      if (initialValues.title !== undefined) setTitle(initialValues.title)
      if (initialValues.description !== undefined) setDescription(initialValues.description)
      if (initialValues.price !== undefined) setPrice(initialValues.price)
      if (initialValues.estimatedCost !== undefined) setEstimatedCost(initialValues.estimatedCost)
      if (initialValues.category !== undefined) setCategory(initialValues.category)
      if (initialValues.unit !== undefined) setUnit(initialValues.unit)
      if (initialValues.preparationMinutes !== undefined) setPreparationMinutes(initialValues.preparationMinutes)
      if (initialValues.dailyQuota !== undefined) setDailyQuota(initialValues.dailyQuota)
      if (initialValues.availableQuantity !== undefined) setAvailableQuantity(initialValues.availableQuantity)
      if (initialValues.freshnessBadge !== undefined) setFreshnessBadge(initialValues.freshnessBadge)
      if (initialValues.allergenAlerts !== undefined) setAllergenAlerts(initialValues.allergenAlerts)
      if (initialValues.isSamplePhoto !== undefined) setIsSamplePhoto(initialValues.isSamplePhoto)
      if (initialValues.mediaUrls !== undefined && initialValues.mediaUrls.length > 0) {
        setMediaUrls(initialValues.mediaUrls)
        setPreviewUrl(initialValues.mediaUrls[0] || '')
      }
    }
  }, [editingPostId, initialValues])

  const applyPreset = (preset: FoodPreset) => {
    setTitle(preset.title)
    setDescription(preset.description)
    setPrice(preset.price)
    setEstimatedCost(Math.round(preset.price * 0.5))
    setCategory(preset.category)
    setUnit(preset.unit)
    setPreparationMinutes(preset.preparationMinutes)
    setDailyQuota(20)
    setAvailableQuantity(20)
    setPreviewUrl(preset.imageUrl)
    setMediaUrls([preset.imageUrl])
    setMediaFiles([])
    setIsSamplePhoto(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setMediaFiles(files)
      const objectUrl = URL.createObjectURL(files[0])
      setPreviewUrl(objectUrl)
      setIsSamplePhoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!title.trim()) {
      setFormError('Vui lòng nhập tên món ăn.')
      return
    }

    if (price < 10000) {
      setFormError('Giá món ăn tối thiểu là 10.000đ để đảm bảo chi phí vận hành.')
      return
    }

    if (preparationMinutes < 5 || preparationMinutes > 120) {
      setFormError('Thời gian chế biến phải từ 5 đến 120 phút.')
      return
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      price,
      category,
      unit: unit.trim() || 'suất',
      availableQuantity: Math.max(1, availableQuantity),
      preparationMinutes,
      estimatedCost,
      dailyQuota: Math.max(1, dailyQuota),
      freshnessBadge,
      allergenAlerts,
      isSamplePhoto,
      mediaUrls,
      mediaFiles,
    })
  }

  return (
    <div className="marketplace-sell-food-studio" style={{ padding: '16px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>
          {editingPostId ? 'Chỉnh sửa món ăn' : '🍳 Bếp Sinh Viên: Đăng Món Mới'}
        </h2>
        <p style={{ color: 'var(--text-secondary, #64748b)', margin: 0, fontSize: '0.9rem' }}>
          Chia sẻ món ăn tự nấu chuẩn vị nhà làm, kết nối cộng đồng sinh viên Thủ Đức.
        </p>
      </div>

      {!editingPostId && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            ⚡ Điền nhanh từ món mẫu phổ biến:
          </label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
            {FOOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '100px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--surface-1, #ffffff)',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🍽️</span> {preset.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tên món & danh mục */}
          <div>
            <label htmlFor="food-title" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Tên món ăn <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="food-title"
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Cơm gà sốt teriyaki, Bún chả..."
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="food-category" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Danh mục ẩm thực
              </label>
              <select
                id="food-category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="food-unit" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Đơn vị tính
              </label>
              <input
                id="food-unit"
                type="text"
                className="form-control"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="suất, hộp, phần, ly..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="food-description" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Mô tả khẩu phần & nguyên liệu
            </label>
            <textarea
              id="food-description"
              className="form-control"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thịt gà ta tươi ngon, canh rau ngót kèm dưa chua. Đóng hộp giấy bảo vệ môi trường..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>

          {/* Giá bán & Giá vốn với ProfitMarginCalculator */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="food-price" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Giá bán mỗi suất (VNĐ) <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                id="food-price"
                type="number"
                min={10000}
                step={1000}
                className="form-control"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              />
            </div>
            <div>
              <label htmlFor="food-cost" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Giá vốn nguyên liệu (VNĐ)
              </label>
              <input
                id="food-cost"
                type="number"
                min={0}
                step={1000}
                className="form-control"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              />
            </div>
          </div>

          <ProfitMarginCalculator price={price} estimatedCost={estimatedCost} />

          {/* Định mức & Số lượng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="food-quota" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Định mức nấu hôm nay
              </label>
              <input
                id="food-quota"
                type="number"
                min={1}
                max={100}
                className="form-control"
                value={dailyQuota}
                onChange={(e) => {
                  const val = Number(e.target.value) || 1
                  setDailyQuota(val)
                  setAvailableQuantity(val)
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              />
            </div>
            <div>
              <label htmlFor="food-prep-time" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Thời gian nấu (phút)
              </label>
              <input
                id="food-prep-time"
                type="number"
                min={5}
                max={120}
                className="form-control"
                value={preparationMinutes}
                onChange={(e) => setPreparationMinutes(Number(e.target.value) || 20)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}
              />
            </div>
          </div>

          {/* Cam kết tươi ngon */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Cam kết độ tươi ngon
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {FRESHNESS_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="freshnessBadge"
                    value={opt.value}
                    checked={freshnessBadge === opt.value}
                    onChange={(e) => setFreshnessBadge(e.target.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Cảnh báo dị ứng */}
          <div>
            <label htmlFor="food-allergen" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Ghi chú vị & Dị ứng
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {ALLERGEN_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAllergenAlerts(p)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: allergenAlerts === p ? 'var(--color-primary, #0284c7)' : 'var(--surface-2, #f8fafc)',
                    color: allergenAlerts === p ? '#fff' : 'inherit',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              id="food-allergen"
              type="text"
              className="form-control"
              value={allergenAlerts}
              onChange={(e) => setAllergenAlerts(e.target.value)}
              placeholder="VD: Không cay, có mè rang..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
            />
          </div>

          {/* Tải ảnh hoặc dùng ảnh mẫu */}
          <div>
            <label htmlFor="food-image-input" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Ảnh món ăn thật
            </label>
            <input
              id="food-image-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}
            />
            {isSamplePhoto && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309' }}>
                ⚠️ Đang dùng ảnh mẫu demo. Bạn nên chụp ảnh món thật sau khi nấu xong để tăng độ tin cậy.
              </p>
            )}
          </div>

          {(formError || actionError) && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.875rem',
                border: '1px solid #fecaca',
              }}
            >
              {formError || actionError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              backgroundColor: 'var(--color-primary, #0284c7)',
              color: '#fff',
              border: 'none',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Đang lưu món ăn…' : editingPostId ? 'Lưu chỉnh sửa món' : '🚀 Mở Bán Món Này'}
          </button>
        </form>

        {/* Cột Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text-secondary, #64748b)' }}>
              📱 Xem trước hiển thị trên App:
            </h3>
            <LiveFoodCardPreview
              title={title}
              price={price}
              unit={unit}
              availableQuantity={availableQuantity}
              preparationMinutes={preparationMinutes}
              freshnessBadge={freshnessBadge}
              allergenAlerts={allergenAlerts}
              imageUrl={previewUrl}
              isSamplePhoto={isSamplePhoto}
              address={sellingAddress || (hasAddressAnchor ? 'Khu vực Làng Đại học Thủ Đức' : undefined)}
            />
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              border: '1px dashed var(--border-color, #cbd5e1)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #64748b)',
            }}
          >
            <strong>🛡️ Quy tắc cộng đồng:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
              <li>Tiền thanh toán được giữ an toàn bởi Homeji Escrow trong 24 giờ.</li>
              <li>Chỉ nhận đơn khi bếp sẵn sàng nấu và đảm bảo vệ sinh an toàn thực phẩm.</li>
              <li>Nếu hủy hoặc giao trễ, vui lòng nhắn trước cho người mua qua khung chat.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
