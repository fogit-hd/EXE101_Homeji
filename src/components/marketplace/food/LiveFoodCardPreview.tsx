import React from 'react'

export interface LiveFoodCardPreviewProps {
  title: string
  price: number
  unit: string
  availableQuantity: number
  preparationMinutes?: number
  freshnessBadge?: string
  allergenAlerts?: string
  imageUrl?: string
  isSamplePhoto?: boolean
  address?: string
}

export const LiveFoodCardPreview: React.FC<LiveFoodCardPreviewProps> = ({
  title,
  price,
  unit,
  availableQuantity,
  preparationMinutes = 20,
  freshnessBadge = 'CookToOrder',
  allergenAlerts,
  imageUrl,
  isSamplePhoto = false,
  address,
}) => {
  const displayImage =
    imageUrl ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'

  const freshnessText =
    freshnessBadge === 'DailyBatch'
      ? 'Mới nấu hôm nay'
      : freshnessBadge === 'ChilledReady'
      ? 'Ướp lạnh'
      : 'Nấu theo đơn'

  return (
    <div
      className="live-food-card-preview"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-color, #e2e8f0)',
        backgroundColor: 'var(--surface-1, #ffffff)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        maxWidth: '320px',
        margin: '0 auto',
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '75%', backgroundColor: '#f1f5f9' }}>
        <img
          src={displayImage}
          alt={title || 'Xem trước món ăn'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {isSamplePhoto && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backdropFilter: 'blur(2px)',
            }}
          >
            [Ảnh mẫu]
          </span>
        )}
        <span
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'var(--surface-1, #ffffff)',
            color: 'var(--color-primary, #0284c7)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '100px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {freshnessText} · {preparationMinutes}p
        </span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <h4
          style={{
            margin: '0 0 6px 0',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary, #0f172a)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title || 'Tên món ăn của bạn'}
        </h4>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--color-primary, #0284c7)',
              }}
            >
              {(price || 0).toLocaleString('vi-VN')} đ
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
              /{unit || 'suất'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
            Còn {availableQuantity || 0} suất
          </span>
        </div>

        {allergenAlerts && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #64748b)',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              padding: '4px 8px',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            Lưu ý: {allergenAlerts}
          </div>
        )}

        {address && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #64748b)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Địa chỉ: {address}
          </div>
        )}
      </div>
    </div>
  )
}
