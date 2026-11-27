import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useBackButtonClose } from '../hooks/useBackButtonClose'
import './mobile-sheet.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** Visually hide the title row (the content brings its own heading). The dialog keeps its name. */
  hideTitle?: boolean
  /** `full` fills the screen under the status bar (search, notifications); `auto` sizes to content. */
  size?: 'auto' | 'full'
  headerAction?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** Id of a heading inside the content that names the sheet; the sheet then renders no title of its own. */
  labelledBy?: string
}

const CLOSE_DRAG_PX = 96

/**
 * Phone bottom sheet. A native modal `<dialog>` gives focus trapping, Escape and an inert page;
 * the backdrop blurs the page instead of darkening it. Drag the handle or title row down to close,
 * and the phone's Back gesture closes it too.
 */
export function MobileSheet({ open, onClose, title, hideTitle = false, size = 'auto', headerAction, footer, children, className = '', labelledBy }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const ownTitleId = useId()
  const titleId = labelledBy ?? ownTitleId
  const [closing, setClosing] = useState(false)
  const drag = useRef<{ id: number; startY: number; dy: number } | null>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useBackButtonClose(open, onClose)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setClosing(false)
      dialog.showModal()
      document.documentElement.classList.add('m-sheet-open')
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Unlock page scroll once no sheet is open, however this one closed (button, Back, unmount).
  const releaseScroll = () => {
    if (!document.querySelector('dialog.m-sheet[open]')) document.documentElement.classList.remove('m-sheet-open')
  }
  useEffect(() => () => {
    if (ref.current?.open) ref.current.close()
    releaseScroll()
  }, [])

  const requestClose = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { closeRef.current(); return }
    setClosing(true)
    window.setTimeout(() => closeRef.current(), 180)
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || (event.target as HTMLElement).closest('button, a, input')) return
    drag.current = { id: event.pointerId, startY: event.clientY, dy: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId || !ref.current) return
    gesture.dy = Math.max(0, event.clientY - gesture.startY)
    ref.current.style.setProperty('--m-sheet-drag', `${gesture.dy}px`)
  }
  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId) return
    drag.current = null
    ref.current?.style.removeProperty('--m-sheet-drag')
    if (gesture.dy > CLOSE_DRAG_PX) requestClose()
  }

  return (
    <dialog
      ref={ref}
      className={`m-sheet m-sheet--${size}${closing ? ' is-closing' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); requestClose() }}
      onClose={releaseScroll}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose() }}
    >
      {open ? (
        <div className="m-sheet__panel">
          <header
            className={`m-sheet__head${hideTitle ? ' m-sheet__head--bare' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <span className="m-sheet__handle" aria-hidden="true" />
            {labelledBy ? null : <h2 id={titleId} className={hideTitle ? 'sr-only' : 'm-sheet__title'}>{title}</h2>}
            {headerAction}
            <button type="button" className="m-sheet__close" aria-label="Đóng" title="Đóng" onClick={requestClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div className="m-sheet__body">{children}</div>
          {footer ? <footer className="m-sheet__foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  )
}
