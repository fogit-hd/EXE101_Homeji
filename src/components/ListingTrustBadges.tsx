import { PremiumBadge } from './PremiumBadge'
import { VerifiedOwnerBadge } from './VerifiedOwnerBadge'
import './ListingTrustBadges.css'

export function ListingTrustBadges({ premium, verified }: { premium: boolean; verified: boolean }) {
  if (!premium && !verified) return null
  return <div className="listing-trust-badges" aria-label="Thông tin người đăng">
    {premium ? <PremiumBadge /> : null}
    {verified ? <VerifiedOwnerBadge /> : null}
  </div>
}
