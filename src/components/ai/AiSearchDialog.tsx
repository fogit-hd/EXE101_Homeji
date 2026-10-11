import { useEffect, useRef } from 'react'
import type { AiHighlightResponse } from '../../api'
import { AiSearchReview } from './AiSearchReview'

export function AiSearchDialog({ result, busy, onClose, onApply, onCorrection }: {
  result: AiHighlightResponse; busy: boolean; onClose: () => void; onApply: () => void; onCorrection: (text: string) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    root.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { previous?.focus() }
  }, [])
  return <div className="rental-assistant__modal" role="dialog" aria-modal="true" aria-label="Xác nhận tìm phòng" ref={root} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose() }
    if (event.key !== 'Tab') return
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary') ?? [])
    const first = items[0], last = items.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}><div><button type="button" onClick={onClose}>Đóng</button>
    <AiSearchReview result={result} onApply={() => { if (!busy) onApply() }} onRefine={text => { if (!busy) onCorrection(text) }} />
  </div></div>
}
