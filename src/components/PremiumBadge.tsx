import type { ReactNode } from 'react'
import './PremiumBadge.css'
import { PremiumStars } from './PremiumStars'
import { SparkleIcon, CrownIcon, ElectricBoltIcon } from './icons/SvgIcons'

export type PremiumBadgeVariant = 'pill' | 'boost' | 'glass' | 'compact' | 'subtle'
export type PremiumBadgeIconType = 'sparkle' | 'crown' | 'rocket' | 'bolt' | ReactNode

export type PremiumBadgeProps = {
  /** Nhãn hiển thị; mặc định là 'Nổi bật' thay cho chữ 'Premium' thô cũ */
  label?: ReactNode
  /** Biểu tượng; mặc định là 'sparkle' (✦), hỗ trợ 'crown', 'rocket', 'bolt' hoặc ReactNode tùy chọn */
  icon?: PremiumBadgeIconType
  /** Biến thể hiển thị thay thế:
   * - 'pill': Bo tròn tiêu chuẩn, nền Champagne ánh kim (mặc định)
   * - 'boost': Nhấn mạnh tính năng Đẩy tin / Ưu tiên tốc độ
   * - 'glass': Nền kính mờ frosted glass thích hợp đè lên ảnh
   * - 'compact': Nhỏ gọn, tối giản không gian
   * - 'subtle': Tinh tế, nền nhẹ nhàng trang nhã
   */
  variant?: PremiumBadgeVariant
  /** Hiệu ứng ánh sao lấp lánh nhẹ; mặc định bật để bảo toàn test contract */
  showStars?: boolean
  className?: string
  title?: string
}

function RocketSvg({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" />
      <path d="M15 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" />
    </svg>
  )
}

export function PremiumBadge({
  label = 'Nổi bật',
  icon = 'sparkle',
  variant = 'pill',
  showStars = true,
  className = '',
  title = 'Tin đăng nổi bật (Gói Premium). Đây không phải dấu xác minh tin đăng.',
}: PremiumBadgeProps = {}) {
  const renderedIcon =
    icon === 'sparkle' ? (
      <SparkleIcon size={12} fill="currentColor" />
    ) : icon === 'crown' ? (
      <CrownIcon size={12} fill="currentColor" />
    ) : icon === 'rocket' ? (
      <RocketSvg size={12} />
    ) : icon === 'bolt' ? (
      <ElectricBoltIcon size={12} fill="currentColor" />
    ) : (
      icon
    )

  return (
    <span
      className={`premium-badge premium-badge--${variant}${className ? ` ${className}` : ''}`}
      title={title}
    >
      {renderedIcon}
      <span className="premium-badge__text">{label}</span>
      {showStars ? <PremiumStars /> : null}
    </span>
  )
}
