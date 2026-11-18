import { PaymentMethod } from '../../api/types'
import './PaymentMethodMarks.css'

export function PayPalLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-paypal${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <svg className="pay-brand-pill__paypal-svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M7.6 19.8H5.1a.7.7 0 0 1-.69-.82L6.68 4.65A1.2 1.2 0 0 1 7.87 3.6h5.56c3.1 0 5.07 1.48 4.63 4.46-.45 3.04-2.74 4.74-5.94 4.74H9.6l-.96 6.13a.85.85 0 0 1-.84.72l-.2.15Z"
          fill="currentColor"
        />
        <path
          d="M19.35 8.15c-.48 3.24-2.85 5.15-6.28 5.15h-2.1l-1.08 6.9a.68.68 0 0 1-.67.57H7.2a.55.55 0 0 1-.54-.64l1.13-7.2h2.7c3.4 0 5.95-1.76 6.48-5.15.12-.77.08-1.45-.08-2.03 1.72.52 2.71 1.78 2.46 3.4Z"
          fill="#0079C1"
          className="pay-brand-pill__paypal-accent"
        />
      </svg>
      <span>PayPal</span>
    </span>
  )
}

export function GooglePayLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-gpay${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M21.8 12.23c0-.72-.06-1.41-.18-2.07H12v3.92h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.49Z" fill="#4285F4" />
        <path d="M12 22c2.76 0 5.07-.91 6.76-2.48l-3.3-2.56c-.91.61-2.08.97-3.46.97-2.66 0-4.91-1.8-5.72-4.21H2.87v2.64A10 10 0 0 0 12 22Z" fill="#34A853" />
        <path d="M6.28 13.72a6.01 6.01 0 0 1 0-3.44V7.64H2.87a10 10 0 0 0 0 8.72l3.41-2.64Z" fill="#FBBC05" />
        <path d="M12 6.07c1.5 0 2.84.52 3.9 1.53l2.93-2.93C17.06 3.02 14.75 2 12 2a10 10 0 0 0-9.13 5.64l3.41 2.64C7.09 7.87 9.34 6.07 12 6.07Z" fill="#EA4335" />
      </svg>
      <span>Pay</span>
    </span>
  )
}

export function ApplePayLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-apple${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <svg width="12" height="14" viewBox="0 0 17 20" fill="currentColor">
        <path d="M13.94 10.6c-.02-2.25 1.84-3.34 1.92-3.39-1.05-1.53-2.68-1.74-3.25-1.77-1.37-.14-2.7.82-3.4.82-.71 0-1.79-.8-2.95-.78-1.5.02-2.9.88-3.67 2.23-1.58 2.74-.4 6.79 1.12 9 .76 1.09 1.65 2.31 2.82 2.27 1.14-.05 1.57-.73 2.95-.73 1.37 0 1.77.73 2.96.7 1.22-.02 1.99-1.1 2.73-2.2.87-1.26 1.22-2.49 1.24-2.55-.03-.01-2.44-.94-2.47-3.6ZM11.71 4.13c.62-.76 1.05-1.8.93-2.85-.9.04-2.02.6-2.66 1.35-.57.66-1.08 1.73-.95 2.75 1.01.08 2.05-.51 2.68-1.25Z" />
      </svg>
      <span>Pay</span>
    </span>
  )
}

export function MomoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-momo${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <b>M</b>
      <span>MoMo</span>
    </span>
  )
}

export function PayOsBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-payos${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3h-3zM20 14v7M14 20h3" strokeLinecap="round" />
      </svg>
      <span>PayOS</span>
    </span>
  )
}

export function WalletBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pay-brand-pill is-wallet${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M16 12h5" strokeLinecap="round" />
      </svg>
      <span>Ví Homeji</span>
    </span>
  )
}

export function PaymentMethodBadges({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  if (method === PaymentMethod.PayPal) return <PayPalLogo compact={compact} />
  if (method === PaymentMethod.Momo) return <MomoBadge compact={compact} />
  if (method === PaymentMethod.PayOs) return <PayOsBadge compact={compact} />
  return <WalletBadge compact={compact} />
}
