import './PremiumBadge.css'
import { PremiumStars } from './PremiumStars'
import { CrownIcon } from './icons/SvgIcons'

export function PremiumBadge() {
  return <span className="premium-badge" title="Người đăng đang dùng gói Premium. Đây không phải dấu xác minh tin đăng."><CrownIcon size={12} fill="currentColor" /> Premium<PremiumStars /></span>
}
