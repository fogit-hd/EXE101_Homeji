const amountFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** Shared available-balance display for the marketplace header and Số dư summary. */
const availableBalanceFormat = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function formatAvailableBalance(value: number): string {
  return availableBalanceFormat.format(Math.round(value))
}

const ledgerTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** One formatter for every Số dư surface (header, summary, forms, ledger). */
export function formatWalletAmount(value: number): string {
  return `${amountFormat.format(Math.abs(Math.round(value)))} ₫`
}

export function formatWalletSigned(value: number): string {
  const body = formatWalletAmount(value)
  if (value > 0) return `+${body}`
  if (value < 0) return `−${body}`
  return body
}

export type WalletTabId = 'deposit' | 'withdraw' | 'history'
export type DepositReturn = 'none' | 'processing' | 'failed'

export function parseWalletTab(value: string | null): WalletTabId | null {
  if (value === 'deposit' || value === 'topup') return 'deposit'
  if (value === 'withdraw') return 'withdraw'
  if (value === 'history') return 'history'
  return null
}

export function readDepositReturn(params: URLSearchParams): DepositReturn {
  const code = params.get('resultCode')
  const status = (params.get('status') || params.get('code') || '').toLowerCase()
  const cancel = (params.get('cancel') || params.get('cancelled') || '').toLowerCase()
  if (cancel === 'true' || status === 'cancelled' || status === 'cancel' || status === 'failed') return 'failed'
  if (code && code !== '0') return 'failed'
  if (code === '0' || status === 'paid' || status === '00' || status === 'success') return 'processing'
  return 'none'
}

export function historyCutoff(range: '30' | '7' | 'all'): number | null {
  if (range === 'all') return null
  return Date.now() - Number(range) * 24 * 60 * 60 * 1000
}

export function formatWalletLedgerTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = ledgerTimeFormat.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')}/${pick('month')} · ${pick('hour')}:${pick('minute')}`
}
