import { useState, type ReactNode } from 'react'

export function PhoneAction({ phone, className, children }: { phone: string; className?: string; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  const normalized = phone.replace(/[^+\d]/g, '')
  if (!/^\+?\d{8,15}$/.test(normalized)) return null
  return <a className={className} href={`tel:${normalized}`} onClick={event => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
    if (!mobile) { event.preventDefault(); setRevealed(true) }
  }} aria-label={revealed ? `Số điện thoại ${phone}` : 'Gọi điện'}>
    {revealed ? <span aria-live="polite">{phone}</span> : children}
  </a>
}
