/** A source deadline describes an advertisement snapshot, never physical room availability. */
export function rentalSourceFreshness(expiresAt?: string | null, checkedAt?: string | null, now = Date.now()): 'expired' | 'notExpired' | 'unknown' {
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN
  const checked = checkedAt ? Date.parse(checkedAt) : NaN
  if (!Number.isFinite(expiry) || !Number.isFinite(checked) || checked > now) return 'unknown'
  return expiry <= now ? 'expired' : 'notExpired'
}
