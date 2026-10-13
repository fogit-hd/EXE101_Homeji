import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SPRING, transitions } from '../../lib/motionTokens'
import './MarketplaceFilterPanel.css'
import { EMPTY_MARKETPLACE_FILTERS, type MarketplaceFilterValue } from './marketplaceFilterValue'


type Option = { value: string; label: string; short?: string }

const PRICE_OPTIONS: Option[] = [
  { value: '', label: 'Tất cả' },
  { value: 'under100', label: 'Dưới 100.000 đ', short: 'Dưới 100k' },
  { value: '100to500', label: '100.000–500.000 đ', short: '100k–500k' },
  { value: 'over500', label: 'Trên 500.000 đ', short: 'Trên 500k' },
]

const SVG = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const ICONS: Record<string, ReactNode> = {
  '': SVG(<><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>),
  'Ăn sáng': SVG(<><path d="M3 17h18" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 6V3M5.6 8.6 4 7M18.4 8.6 20 7" /></>),
  'Cơm nhà': SVG(<><path d="M3 11h18a9 9 0 0 1-18 0Z" /><path d="M7 11c0-3 2.2-5 5-5s5 2 5 5" /></>),
  'Mì / bún': SVG(<><path d="M3 12h18a9 9 0 0 1-18 0Z" /><path d="M16 3 9 12M20 5l-7 7" /></>),
  'Đồ uống': SVG(<><path d="M6 8h12l-1.6 12H7.6Z" /><path d="M5 8h14M13 8l2-5" /></>),
  'Ăn vặt': SVG(<><circle cx="12" cy="12" r="9" /><path d="M9 9h.01M14.5 8h.01M15 14h.01M9.5 15h.01M12 12h.01" /></>),
  'Nội thất': SVG(<><path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" /><path d="M3 11h18v5H3zM5 16v3M19 16v3" /></>),
  'Điện tử': SVG(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
  'Đồ bếp': SVG(<><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M12 7V3M8 8V5M16 8V5" /></>),
  'Đồ học tập': SVG(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M8 7h7" /></>),
  'Xe / di chuyển': SVG(<><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m6 17 4-8h5l3 8M9 6h3" /></>),
  'Đồ gia dụng': SVG(<><path d="M3 11 12 4l9 7v9H3Z" /><path d="M9 20v-6h6v6" /></>),
  'Khác': SVG(<><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>),
}
/** Runtime categories that aren't in the presets get a generic tag icon. */
const GENERIC_ICON = SVG(<><path d="M3 12V4h8l10 10-8 8Z" /><circle cx="7.5" cy="7.5" r="1" /></>)
const SLIDERS = SVG(<><path d="M4 6h16M7 12h10M10 18h4" /></>)
const CLOSE = SVG(<path d="M18 6 6 18M6 6l12 12" />)
const CARET = SVG(<path d="m6 9 6 6 6-6" />)

const MOBILE_QUERY = '(max-width: 639.98px)'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

type Props = {
  value: MarketplaceFilterValue
  onApply: (next: MarketplaceFilterValue) => void
  /** Category list for a given (staged) listing kind; same rules as before. */
  categoriesFor: (kind: string) => string[]
  /** Number of loaded posts matching the staged filters (category counts pass a category). */
  countFor: (filters: MarketplaceFilterValue) => number
  unit: string
  hasLocation: boolean
  /** 'mine' tab: Loại tin + Trạng thái sections. */
  mineOptions?: { kinds: Option[]; statuses: Option[] }
}

function Pills({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  const group = useId()
  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const index = Math.max(0, options.findIndex(o => o.value === value))
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus()
  }
  return (
    <div className="mfp-pills" role="radiogroup" aria-label={label} onKeyDown={move}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-value={o.value}
            className={on ? 'mfp-pill is-on' : 'mfp-pill'} onClick={() => onChange(o.value)}>
            {on ? <motion.span layoutId={`${group}-pill`} className="mfp-pill__bg" transition={SPRING.snappy} /> : null}
            <span className="mfp-pill__label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MarketplaceFilterPanel({ value, onApply, categoriesFor, countFor, unit, hasLocation, mineOptions }: Props) {
  const [open, setOpen] = useState(false)
  const [staged, setStaged] = useState(value)
  const mobile = useIsMobile()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const titleId = useId()

  const sortOptions: Option[] = [
    { value: 'default', label: 'Mới nhất' },
    { value: 'priceAsc', label: 'Giá tăng dần' },
    { value: 'priceDesc', label: 'Giá giảm dần' },
    ...(hasLocation ? [{ value: 'nearby', label: 'Gần tôi' }] : []),
  ]

  const openPanel = () => { setStaged(value); setOpen(true) }
  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true })
  }
  const apply = () => { onApply(staged); close() }
  const clearAll = () => { setStaged(EMPTY_MARKETPLACE_FILTERS) }

  // Outside click + Esc close; focus moves into the panel and is trapped there while open.
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (mobile) return // the sheet's own backdrop handles it
      if (!wrapRef.current?.contains(event.target as Node)) close(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('.is-on, button')?.focus({ preventScroll: true }), 30)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); window.clearTimeout(t) }
  }, [open, mobile])

  const priceLabel = (v: string) => PRICE_OPTIONS.find(o => o.value === v)
  const chips: { key: keyof MarketplaceFilterValue; label: string }[] = []
  if (mineOptions && value.kind) chips.push({ key: 'kind', label: mineOptions.kinds.find(o => o.value === value.kind)?.label ?? value.kind })
  if (mineOptions && value.status) chips.push({ key: 'status', label: mineOptions.statuses.find(o => o.value === value.status)?.label ?? value.status })
  if (value.category) chips.push({ key: 'category', label: value.category })
  if (value.price) chips.push({ key: 'price', label: priceLabel(value.price)?.short ?? priceLabel(value.price)?.label ?? value.price })
  if (value.sort !== 'default') chips.push({ key: 'sort', label: sortOptions.find(o => o.value === value.sort)?.label ?? value.sort })
  const activeCount = chips.length

  const removeChip = (key: keyof MarketplaceFilterValue) => {
    const next = { ...value, [key]: EMPTY_MARKETPLACE_FILTERS[key] }
    if (key === 'kind') next.category = ''
    onApply(next)
  }

  const categories = categoriesFor(staged.kind)
  const tiles = ['', ...categories]
  const resultCount = countFor(staged)

  const panelMotion = mobile
    ? { initial: { y: '100%' }, animate: { y: 0, transition: SPRING.soft }, exit: { y: '100%', transition: transitions.exit } }
    : { initial: { opacity: 0, y: -8, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1, transition: SPRING.soft }, exit: { opacity: 0, y: -6, scale: 0.98, transition: transitions.exit } }

  return (
    <div ref={wrapRef} className="mfp">
      <div className="mfp-chips" aria-label="Bộ lọc đang áp dụng">
        <AnimatePresence initial={false}>
          {chips.map(chip => (
            <motion.span key={chip.key} layout className="mfp-chip"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1, transition: SPRING.snappy }}
              exit={{ opacity: 0, scale: 0.85, transition: transitions.exit }}>
              {chip.label}
              <button type="button" className="mfp-chip__x" aria-label={`Bỏ lọc ${chip.label}`} onClick={() => removeChip(chip.key)}>{CLOSE}</button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <motion.button ref={buttonRef} type="button" whileTap={{ scale: 0.97 }}
        className={['mfp-button', activeCount ? 'is-active' : '', open ? 'is-open' : ''].filter(Boolean).join(' ')}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId}
        onClick={() => (open ? close() : openPanel())}>
        {SLIDERS}
        <span>Bộ lọc</span>
        <AnimatePresence initial={false}>
          {activeCount ? (
            <motion.span key="badge" className="mfp-badge" aria-label={`${activeCount} bộ lọc`}
              initial={{ scale: 0 }} animate={{ scale: 1, transition: SPRING.snappy }} exit={{ scale: 0 }}>{activeCount}</motion.span>
          ) : null}
        </AnimatePresence>
        <span className="mfp-caret">{CARET}</span>
      </motion.button>

      <AnimatePresence>
        {open && mobile ? (
          <motion.div key="backdrop" className="mfp-backdrop" onClick={() => close()}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        ) : null}
        {open ? (
          <motion.div key="panel" ref={panelRef} id={panelId} role="dialog" aria-modal={mobile} aria-labelledby={titleId}
            className={mobile ? 'mfp-panel mfp-panel--sheet' : 'mfp-panel'} {...panelMotion}>
            {mobile ? <div className="mfp-handle" aria-hidden="true" /> : null}
            <div className="mfp-head">
              <h2 id={titleId}>Bộ lọc</h2>
              {mobile ? <button type="button" className="mfp-close" aria-label="Đóng bộ lọc" onClick={() => close()}>{CLOSE}</button> : null}
            </div>
            <div className="mfp-body">
              {mineOptions ? (
                <>
                  <section className="mfp-sec"><h3>Loại tin</h3>
                    <Pills label="Loại tin" options={mineOptions.kinds} value={staged.kind} onChange={kind => setStaged(s => ({ ...s, kind, category: '' }))} /></section>
                  <section className="mfp-sec"><h3>Trạng thái</h3>
                    <Pills label="Trạng thái" options={mineOptions.statuses} value={staged.status} onChange={status => setStaged(s => ({ ...s, status }))} /></section>
                </>
              ) : null}
              <section className="mfp-sec">
                <h3>Danh mục</h3>
                <div className="mfp-grid" role="group" aria-label="Danh mục">
                  {tiles.map(cat => {
                    const on = staged.category === cat
                    return (
                      <motion.button key={cat || 'all'} type="button" aria-pressed={on} whileTap={{ scale: 0.96 }}
                        className={on ? 'mfp-tile is-on' : 'mfp-tile'} onClick={() => setStaged(s => ({ ...s, category: cat }))}>
                        <span className="mfp-tile__icon">{ICONS[cat] ?? GENERIC_ICON}</span>
                        <span className="mfp-tile__label">{cat || 'Tất cả'}</span>
                        <span className="mfp-tile__count">{countFor({ ...staged, category: cat })}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </section>
              <section className="mfp-sec"><h3>Khoảng giá</h3>
                <Pills label="Khoảng giá" options={PRICE_OPTIONS} value={staged.price} onChange={price => setStaged(s => ({ ...s, price }))} /></section>
              <section className="mfp-sec"><h3>Sắp xếp</h3>
                <Pills label="Sắp xếp" options={sortOptions} value={staged.sort} onChange={sort => setStaged(s => ({ ...s, sort }))} /></section>
            </div>
            <div className="mfp-foot">
              <button type="button" className="mfp-clear" onClick={clearAll}>Xóa bộ lọc</button>
              <button type="button" className="btn btn-primary mfp-apply" onClick={apply}>Xem {resultCount} {unit}</button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
