import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { amenityLabel } from '../../../lib/labels'
import { useIsMobile } from '../../../mobile/useIsMobile'
import { MobileSheet } from '../../../mobile/MobileSheet'
import './ListingAmenities.css'

const key = (label: string) => label.trim().toLocaleLowerCase('vi-VN')
const priorities = new Set(['Máy lạnh', 'Máy nước nóng', 'Bếp', 'Giờ tự do', 'Không chung chủ'].map(key))

/** Never infer amenities: normalize and rank only values supplied by the listing. */
function rankedAmenities(values: string[], selected: string[]) {
  const wanted = new Set(selected.map(value => key(amenityLabel(value))))
  const unique = new Map<string, string>()
  for (const raw of values) {
    if (!raw.trim()) continue
    const label = amenityLabel(raw)
    if (!unique.has(key(label))) unique.set(key(label), label)
  }
  return [...unique.values()].map(label => ({ label, matched: wanted.has(key(label)) }))
    .sort((a, b) => Number(b.matched) - Number(a.matched) || Number(priorities.has(key(b.label))) - Number(priorities.has(key(a.label))))
}

export function ListingAmenities({ values, selected = [], title, area, propertyType }: { values: string[]; selected?: string[]; title: string; area?: string; propertyType?: string }) {
  const amenities = rankedAmenities(values, selected)
  const matched = amenities.filter(item => item.matched)
  const primary = amenities.filter(item => !item.matched && priorities.has(key(item.label)))
  const preview = [...matched, ...primary].slice(0, Math.max(2, matched.length))
  const isMobile = useIsMobile()
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const headingId = `${id}-title`
  const placePopover = useCallback(() => {
    const anchor = trigger.current?.getBoundingClientRect()
    const panel = popover.current
    if (!anchor || !panel) return
    const width = Math.min(360, window.innerWidth - 32)
    const height = Math.min(panel.scrollHeight, 400, window.innerHeight - 32)
    panel.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - width - 16))}px`
    panel.style.top = `${Math.max(16, Math.min(anchor.bottom + 8 + height <= window.innerHeight - 16 ? anchor.bottom + 8 : anchor.top - height - 8, window.innerHeight - height - 16))}px`
  }, [])
  useEffect(() => {
    if (!desktopOpen) return
    const update = () => { if (popover.current?.matches(':popover-open')) placePopover() }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [desktopOpen, placePopover])
  const fullList = <>
    <p className="listing-amenities__room">{title}</p>
    <ul className="listing-amenities__all">{amenities.map(({ label, matched }) => <li key={key(label)}>
      <Check size={16} aria-hidden="true" /><span>{label}</span>{matched ? <small>Khớp bộ lọc</small> : null}
    </li>)}</ul>
  </>
  return <div className="listing-amenities" data-glass-exclude>
    <div className="listing-amenities__facts" aria-label="Thông số phòng">
      {area ? <span>{area}</span> : null}{propertyType ? <span>{propertyType}</span> : null}
    </div>
    <ul className={`listing-amenities__preview${matched.length > 2 ? ' has-many-matches' : ''}`} aria-label="Tiện ích chính">
      {preview.map(({ label, matched }) => <li key={key(label)} className={matched ? 'is-matched' : undefined} title={label}>
        {matched ? <Check size={12} aria-hidden="true" /> : null}<span>{label}</span>
      </li>)}
    </ul>
    {amenities.length ? <button ref={trigger} type="button" className="listing-amenities__more" data-glass-exclude
      popoverTarget={isMobile ? undefined : id} aria-haspopup={isMobile ? 'dialog' : undefined}
      aria-label={`Có ${amenities.length} tiện ích · Xem tất cả của ${title}`}
      onClick={() => { if (isMobile) setSheetOpen(true) }}>
      <span>Có {amenities.length} tiện ích</span><span aria-hidden="true"> · </span><span className="listing-amenities__link">Xem tất cả</span>
    </button> : <p className="listing-amenities__empty">Chưa có thông tin tiện ích</p>}
    {isMobile ? <MobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`Tất cả ${amenities.length} tiện ích`}>
      {fullList}
    </MobileSheet> : <div id={id} ref={popover} popover="auto" className="listing-amenities__popover" role="region" aria-labelledby={headingId}
      onToggle={event => { setDesktopOpen(event.newState === 'open'); if (event.newState === 'open') placePopover() }}>
      <header><h3 id={headingId}>Tất cả {amenities.length} tiện ích</h3><button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Đóng tiện ích"><X size={18} aria-hidden="true" /></button></header>
      {fullList}
    </div>}
  </div>
}
