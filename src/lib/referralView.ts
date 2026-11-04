import type { ReferralSummary, Voucher } from '../api/referrals'

export type ReferralPanel = 'loading' | 'guest' | 'setup' | 'error' | 'create' | 'share'
export type VoucherState = 'usable' | 'used' | 'expired'
export type VoucherGroup = { key: string; voucher: Voucher; state: VoucherState; count: number }

export function referralPanel(input: {
  isLoading: boolean
  isAuthenticated: boolean
  needsProfileSetup: boolean
  hasData: boolean
  hasError: boolean
  hasCode: boolean
}): ReferralPanel {
  if (input.isLoading) return 'loading'
  if (!input.isAuthenticated) return 'guest'
  if (input.needsProfileSetup) return 'setup'
  if (!input.hasData) return input.hasError ? 'error' : 'loading'
  return input.hasCode ? 'share' : 'create'
}

/** Mirrors the backend claim rules so the form never offers a request that must fail. */
export function canClaimReferral(summary: ReferralSummary | null): boolean {
  return Boolean(summary) && !summary!.received && summary!.successfulInvites === 0 && summary!.remainingPairs > 0
}

const STATE_ORDER: Record<VoucherState, number> = { usable: 0, used: 1, expired: 2 }

function voucherState(voucher: Voucher, now: number): VoucherState {
  if (voucher.used) return 'used'
  return Date.parse(voucher.expiresAt) <= now ? 'expired' : 'usable'
}

export function groupVouchers(vouchers: readonly Voucher[], now: number): VoucherGroup[] {
  const groups = new Map<string, VoucherGroup>()
  for (const voucher of vouchers) {
    const state = voucherState(voucher, now)
    const key = `${state}:${voucher.purpose}:${voucher.expiresAt}`
    const group = groups.get(key)
    if (group) group.count += 1
    else groups.set(key, { key, voucher, state, count: 1 })
  }
  return [...groups.values()].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state])
}
