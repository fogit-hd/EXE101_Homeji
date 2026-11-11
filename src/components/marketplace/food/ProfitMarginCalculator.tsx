import React from 'react'

export interface ProfitMarginCalculatorProps {
  price: number
  estimatedCost: number
  packagingCost?: number
}

export const ProfitMarginCalculator: React.FC<ProfitMarginCalculatorProps> = ({
  price,
  estimatedCost,
  packagingCost = 0,
}) => {
  const safePrice = Math.max(0, price || 0)
  const safeCost = Math.max(0, estimatedCost || 0)
  const safePack = Math.max(0, packagingCost || 0)

  const platformFee = Math.round(safePrice * 0.1)
  const netRevenue = safePrice - platformFee
  const estimatedProfit = netRevenue - safeCost - safePack
  const marginPercent = safePrice > 0 ? Math.round((estimatedProfit / safePrice) * 1000) / 10 : 0

  const isLowPrice = safePrice > 0 && safePrice < 10000
  const isThinMargin = safePrice >= 10000 && marginPercent < 20
  const isHighStudentPrice = safePrice > 45000

  return (
    <div
      className="profit-margin-calculator"
      style={{
        padding: '14px 16px',
        borderRadius: '12px',
        backgroundColor: 'var(--surface-2, #f8fafc)',
        border: '1px solid var(--border-color, #e2e8f0)',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        <span>💡 Bảng tính lợi nhuận ròng (Gói Sàn 10%)</span>
        <span
          style={{
            color: marginPercent >= 20 ? 'var(--color-success, #16a34a)' : marginPercent > 0 ? 'var(--color-warning, #d97706)' : 'var(--color-danger, #dc2626)',
            fontWeight: 700,
          }}
        >
          {safePrice > 0 ? `${marginPercent}% biên lãi` : '—'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', color: 'var(--text-secondary, #64748b)' }}>
        <div>
          <span>Phí sàn (10%):</span>{' '}
          <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
            -{platformFee.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Doanh thu thực:</span>{' '}
          <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
            {netRevenue.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Giá vốn nguyên liệu:</span>{' '}
          <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
            -{safeCost.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Lãi ròng ước tính:</span>{' '}
          <strong
            style={{
              color: estimatedProfit >= 0 ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
            }}
          >
            {estimatedProfit >= 0 ? '+' : ''}
            {estimatedProfit.toLocaleString('vi-VN')} đ
          </strong>
        </div>
      </div>

      {isLowPrice && (
        <div
          role="alert"
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: '0.8rem',
            border: '1px solid #fecaca',
          }}
        >
          ⚠️ Giá món ăn tối thiểu là 10.000đ để đảm bảo chi phí vận hành.
        </div>
      )}

      {isThinMargin && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: '#fffbeb',
            color: '#b45309',
            fontSize: '0.8rem',
            border: '1px solid #fde68a',
          }}
        >
          ⚠️ Biên lãi ước tính dưới 20%. Bạn nên cân nhắc điều chỉnh lại giá hoặc khẩu phần để bù đắp công sức nấu nướng.
        </div>
      )}

      {isHighStudentPrice && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '0.8rem',
            border: '1px solid #bfdbfe',
          }}
        >
          ℹ️ Mức giá trên 45.000đ khá cao so với mặt bằng sinh viên Thủ Đức. Hãy đảm bảo phần ăn có khẩu phần lớn hoặc kèm nước uống.
        </div>
      )}
    </div>
  )
}
