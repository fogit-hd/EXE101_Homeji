import type { ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import './mobile-detail.css'

type Props = {
  titleId: string
  /** Short page name in the top bar ("Chi tiết phòng trọ"). */
  title: string
  onClose: () => void
  /** Icon buttons on the right of the top bar (share, save). */
  actions?: ReactNode
  /** Sticky bottom bar: one primary action, at most one secondary. */
  bar?: ReactNode
  /** Status line pinned above the bottom bar (saved, sent, errors). */
  toast?: ReactNode
  busy?: boolean
  dialogRef?: Ref<HTMLDivElement>
  children: ReactNode
}

/**
 * Full-screen detail page for phones. It covers the app header and tab bar, scrolls on its own,
 * and keeps the main actions within thumb reach at the bottom. The caller owns focus, Escape and
 * history; this is layout only.
 */
export function MobileDetailPage({ titleId, title, onClose, actions, bar, toast, busy, dialogRef, children }: Props) {
  return createPortal(
    <div ref={dialogRef} className="m-detail" data-glass-exclude role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy || undefined}>
      <header className="m-detail__bar">
        <button type="button" className="m-detail__icon" data-room-detail-close aria-label="Quay lại" title="Quay lại" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h2 id={titleId} className="m-detail__title">{title}</h2>
        <div className="m-detail__actions">{actions}</div>
      </header>
      <div className="m-detail__scroll">{children}</div>
      {toast ? <div className="m-detail__toast">{toast}</div> : null}
      {bar ? <div className="m-detail__cta">{bar}</div> : null}
    </div>,
    document.body,
  )
}

export function MobileDetailSection({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`m-detail__section${className ? ` ${className}` : ''}`}>
      {title ? <h3 className="m-detail__h">{title}</h3> : null}
      {children}
    </section>
  )
}

export const MobileShareIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>
