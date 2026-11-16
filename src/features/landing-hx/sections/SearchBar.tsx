import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, BedDouble, ChevronDown, MapPin, Users, Wallet } from 'lucide-react'
import { DISTRICT_OPTIONS, PRICE_OPTIONS, type ListingKind, type Option } from '../../../lib/mock/homeji'

export type ListingQuery = {
  kind: 'all' | ListingKind
  district: string
  price: string
}

const TABS = [
  { value: 'room', label: 'Thuê phòng', icon: BedDouble, priceLabel: 'Giá thuê / tháng' },
  { value: 'roommate', label: 'Tìm bạn ở ghép', icon: Users, priceLabel: 'Ngân sách / người' },
] as const

function SelectField({ label, icon, value, options, onChange }: {
  label: string
  icon: ReactNode
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const id = useId()
  // The select fills the whole box so any click on it opens the list; the label floats on top.
  return (
    <div className="tw:group/field tw:relative tw:min-w-0">
      <label
        htmlFor={id}
        className="tw:pointer-events-none tw:absolute tw:top-2.5 tw:right-10 tw:left-4 tw:flex tw:whitespace-nowrap tw:items-center tw:gap-1.5 tw:text-xs tw:font-semibold tw:text-ink-muted tw:[&_svg]:size-3.5"
      >
        <span className="tw:shrink-0 tw:text-brand-text" aria-hidden="true">{icon}</span>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={[
          'tw:h-16 tw:w-full tw:cursor-pointer tw:appearance-none tw:truncate tw:rounded-xl tw:border tw:border-line tw:bg-canvas',
          'tw:pt-5 tw:pr-10 tw:pl-4 tw:text-[15px] tw:font-semibold tw:text-ink',
          'tw:transition-[border-color,background-color] tw:duration-200 tw:ease-hx',
          'tw:hover:border-line-strong tw:hover:bg-surface tw:focus-visible:border-brand tw:focus-visible:bg-surface',
          'tw:[&>option]:bg-surface tw:[&>option]:text-ink',
        ].join(' ')}
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown
        className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:right-4 tw:size-4 tw:-translate-y-1/2 tw:text-ink-subtle tw:transition-colors tw:duration-200 tw:group-hover/field:text-ink"
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * Floating search card. The two tabs switch what is searched (rooms or roommates);
 * submitting hands the query to the listings section below.
 */
export function SearchBar({ onSearch }: { onSearch: (query: ListingQuery) => void }) {
  const [kind, setKind] = useState<ListingKind>('room')
  const [district, setDistrict] = useState('')
  const [price, setPrice] = useState('')
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabId = (value: ListingKind) => `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel`
  const active = TABS.find(tab => tab.value === kind) ?? TABS[0]

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = (moves[event.key] + TABS.length) % TABS.length
    setKind(TABS[next].value)
    tabRefs.current[next]?.focus()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch({ kind, district, price })
  }

  return (
    <div className="tw:rounded-2xl tw:border tw:border-line tw:bg-surface tw:p-2 tw:shadow-search">
      <div role="tablist" aria-label="Bạn đang tìm gì" className="tw:flex tw:gap-1 tw:p-1">
        {TABS.map((tab, index) => {
          const selected = tab.value === kind
          const Icon = tab.icon
          return (
            <button
              key={tab.value}
              ref={node => { tabRefs.current[index] = node }}
              type="button"
              role="tab"
              id={tabId(tab.value)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setKind(tab.value)}
              onKeyDown={event => onTabKey(event, index)}
              className={[
                'tw:relative tw:inline-flex tw:min-h-11 tw:flex-1 tw:items-center tw:justify-center tw:gap-2 tw:whitespace-nowrap tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-3 tw:sm:flex-none tw:sm:px-4',
                'tw:text-sm tw:font-semibold tw:transition-colors tw:duration-200',
                selected ? 'tw:text-brand-text' : 'tw:text-ink-muted tw:hover:text-ink',
              ].join(' ')}
            >
              {selected && (
                <motion.span
                  layoutId={`${baseId}-pill`}
                  className="tw:absolute tw:inset-0 tw:rounded-xl tw:bg-brand-soft"
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden="true"
                />
              )}
              <Icon className="tw:relative tw:size-4" aria-hidden="true" />
              <span className="tw:relative">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(kind)}>
        <form
          role="search"
          aria-label={active.label}
          onSubmit={submit}
          className="tw:grid tw:gap-2 tw:p-1 tw:pt-2 tw:sm:grid-cols-2 tw:xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <SelectField label="Khu vực" icon={<MapPin />} value={district} options={DISTRICT_OPTIONS} onChange={setDistrict} />
          <SelectField label={active.priceLabel} icon={<Wallet />} value={price} options={PRICE_OPTIONS} onChange={setPrice} />
          {/* 19px bold label: the large-text threshold that lets white sit on #EA580C at AA. */}
          <button
            type="submit"
            className={[
              'tw:group/cta tw:inline-flex tw:h-16 tw:items-center tw:justify-center tw:gap-2 tw:rounded-xl tw:border-0 tw:px-7 tw:sm:col-span-2 tw:xl:col-span-1',
              'tw:bg-cta tw:text-[1.1875rem] tw:font-bold tw:text-cta-on tw:shadow-[0_10px_24px_-14px_rgb(15_23_42/0.55)]',
              'tw:transition-[background-color,transform,box-shadow] tw:duration-200 tw:ease-hx',
              'tw:hover:bg-cta-hover tw:hover:shadow-[0_14px_28px_-14px_rgb(15_23_42/0.6)] tw:motion-safe:hover:-translate-y-0.5 tw:active:translate-y-0 tw:active:scale-[0.98]',
            ].join(' ')}
          >
            {/* Same label on both tabs so switching never reflows the row. */}
            Tìm kiếm
            <ArrowRight
              className="tw:size-5 tw:transition-transform tw:duration-300 tw:ease-hx tw:motion-safe:group-hover/cta:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </form>
      </div>
    </div>
  )
}
