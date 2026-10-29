import './PremiumBadge.css'
import { PremiumStars } from './PremiumStars'

export function PremiumBadge() {
  return <span className="premium-badge" title="Người đăng đang dùng gói Premium. Đây không phải dấu xác minh tin đăng."><span aria-hidden="true">♛</span> Premium<PremiumStars /></span>
}
