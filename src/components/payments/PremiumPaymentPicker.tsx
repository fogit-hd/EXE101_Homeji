import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { formatPrice } from '../../lib/labels'
import './PremiumPaymentPicker.css'

export function PremiumPaymentPicker({ name, durationDays, amount, busy, onClose, children }: {
  name: string; durationDays: number; amount: number; busy: boolean; onClose: () => void; children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<dialog ref={dialog} className="pay-v2 pay-checkout" data-glass-exclude
    aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="pay-checkout__head">
      <div><h2 id={titleId}>Chọn cách thanh toán</h2><p id={descriptionId}>{name} · {durationDays} ngày</p><strong>{formatPrice(amount)}</strong></div>
      <button type="button" className="pay-checkout__close" aria-label="Đóng lựa chọn thanh toán" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="pay-checkout__body">{children}</div>
  </dialog>, document.getElementById('root') ?? document.body)
}
