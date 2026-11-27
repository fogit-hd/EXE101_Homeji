import { SparkleIcon } from '../../../icons/SvgIcons'
import './FeaturedListingBadge.css'

/** A listing promotion, separate from the user's membership badge. */
export function FeaturedListingBadge() {
  return <span className="premium-badge featured-label" title="Tin đăng nổi bật (Gói Premium). Đây không phải dấu xác minh tin đăng.">
    <span className="featured-label__icon" aria-hidden="true"><SparkleIcon size={12} fill="currentColor" /></span>
    <span className="featured-label__reflection" aria-hidden="true" />
    <span className="featured-label__text">Nổi bật</span>
  </span>
}
