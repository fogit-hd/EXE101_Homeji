import { useState, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext.logic'

export function PhoneAction({ phone, className, children, hasPhone, onAuthenticated }: { phone: string; className?: string; children: ReactNode; hasPhone?: boolean; onAuthenticated?: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const normalized = phone.replace(/[^+\d]/g, '')
  const validPhone = /^\+?\d{8,15}$/.test(normalized)
  if (!(hasPhone ?? validPhone)) return null
  if (!isAuthenticated) return <button type="button" className={className} aria-label="Đăng nhập để xem số điện thoại" onClick={() => openAuthModal({ intent: 'contact', onSuccess: () => { setRevealed(true); onAuthenticated?.() } })}>
    Đăng nhập để xem số điện thoại
  </button>
  if (!validPhone) return null
  return <a className={className} href={`tel:${normalized}`} onClick={event => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
    if (!mobile) { event.preventDefault(); setRevealed(true) }
  }} aria-label={revealed ? `Số điện thoại ${phone}` : 'Gọi điện'}>
    {revealed ? <span aria-live="polite">{phone}</span> : children}
  </a>
}
