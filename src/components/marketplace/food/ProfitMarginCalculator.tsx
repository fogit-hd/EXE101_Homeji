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
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--food-warm-border, var(--border))',
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
        <span>Bảng tính lợi nhuận ròng (Gói sàn 10%)</span>
        <span
          className="profit-margin-percent-badge"
          style={{
            color: marginPercent >= 25 ? 'var(--grab-green)' : marginPercent >= 15 ? 'var(--food-warm-amber)' : 'var(--error)',
            fontWeight: 700,
          }}
        >
          {safePrice > 0 ? `${marginPercent}% biên lãi` : '—'}
        </span>
      </div>

      {safePrice > 0 && (
        <div className="profit-margin-gauge" style={{ marginBottom: '12px' }} aria-label={`Thước đo biên lợi nhuận: ${marginPercent}%`}>
          <div
            style={{
              height: '8px',
              width: '100%',
              backgroundColor: 'var(--border)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              className="profit-margin-gauge__bar"
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, marginPercent))}%`,
                backgroundColor:
                  marginPercent >= 25
                    ? 'var(--grab-green)'
                    : marginPercent >= 15
                    ? 'var(--food-warm-amber)'
                    : 'var(--error)',
                borderRadius: '999px',
                transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            <span>Rủi ro (&lt;15%)</span>
            <span>Mỏng (15–25%)</span>
            <span>Lý tưởng (&gt;25%)</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px 16px', color: 'var(--text-secondary)' }}>
        <div>
          <span>Phí sàn (10%):</span>{' '}
          <strong style={{ color: 'var(--text-heading)' }}>
            -{platformFee.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Doanh thu thực:</span>{' '}
          <strong style={{ color: 'var(--text-heading)' }}>
            {netRevenue.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Giá vốn nguyên liệu:</span>{' '}
          <strong style={{ color: 'var(--text-heading)' }}>
            -{safeCost.toLocaleString('vi-VN')} đ
          </strong>
        </div>
        <div>
          <span>Lãi ròng ước tính:</span>{' '}
          <strong
            style={{
              color: estimatedProfit >= 0 ? 'var(--success)' : 'var(--error)',
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
            backgroundColor: 'var(--error-soft)',
            color: 'var(--error)',
            fontSize: '0.8rem',
            border: '1px solid var(--error)',
          }}
        >
          Giá món ăn tối thiểu là 10.000đ để đảm bảo chi phí vận hành.
        </div>
      )}

      {isThinMargin && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--warning-soft)',
            color: 'var(--warning)',
            fontSize: '0.8rem',
            border: '1px solid var(--warning-border)',
          }}
        >
          Biên lãi ước tính dưới 20%. Bạn nên cân nhắc điều chỉnh lại giá hoặc khẩu phần để bù đắp công sức nấu nướng.
        </div>
      )}

      {isHighStudentPrice && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--info-soft)',
            color: 'var(--info-text)',
            fontSize: '0.8rem',
            border: '1px solid var(--info-border)',
          }}
        >
          ℹ️ Mức giá trên 45.000đ khá cao so với mặt bằng sinh viên Thủ Đức. Hãy đảm bảo phần ăn có khẩu phần lớn hoặc kèm nước uống.
        </div>
      )}
    </div>
  )
}
