import type { ReactNode } from 'react'
import { PremiumBadge, type PremiumBadgeVariant, type PremiumBadgeIconType } from './PremiumBadge'
import { VerifiedOwnerBadge } from './VerifiedOwnerBadge'
import './ListingTrustBadges.css'

export type ListingTrustBadgesProps = {
  premium: boolean
  verified: boolean
  premiumVariant?: PremiumBadgeVariant
  premiumLabel?: ReactNode
  premiumIcon?: PremiumBadgeIconType
}

export function ListingTrustBadges({
  premium,
  verified,
  premiumVariant,
  premiumLabel,
  premiumIcon,
}: ListingTrustBadgesProps) {
  if (!premium && !verified) return null
  return (
    <div className="listing-trust-badges" aria-label="Thông tin người đăng">
      {premium ? (
        <PremiumBadge
          variant={premiumVariant}
          label={premiumLabel}
          icon={premiumIcon}
        />
      ) : null}
      {verified ? <VerifiedOwnerBadge /> : null}
    </div>
  )
}
