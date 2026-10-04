type SubscriptionSnapshot = { isPremium: boolean; packageCode: string | null; packageName: string | null; premiumExpiresAt: string | null }
/** Null means unknown/loading/failed, not Free. Never infer entitlement from a pending payment. */
export function currentSubscription(snapshot: SubscriptionSnapshot | null) {
  if (!snapshot) return { label: 'Chưa xác định gói', premium: null, code: null }
  return { label: snapshot.isPremium ? snapshot.packageName?.trim() || 'Homeji Premium' : 'Homeji Free', premium: snapshot.isPremium, code: snapshot.packageCode?.trim().toUpperCase() ?? null }
}
