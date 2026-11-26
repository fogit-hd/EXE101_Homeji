import { useState, type ReactNode, type Ref } from 'react'
import { MobileSheet } from '../MobileSheet'
import './mobile-listings.css'

export type MobileQuickChip = { id: string; label: string; icon?: ReactNode; active: boolean; onToggle: () => void }

type Props = {
  catalogs: { id: string; label: string }[]
  catalog: string
  onCatalog: (id: string) => void
  resultLabel: string
  activeFilterCount: number
  filtersOpen: boolean
  onOpenFilters: () => void
  filterButtonRef?: Ref<HTMLButtonElement>
  sortChoices: readonly (readonly [string, string])[]
  sort: string
  onSort: (id: string) => void
  showingMap: boolean
  onToggleMap: () => void
  quickChips: MobileQuickChip[]
}

/**
 * Phone toolbar for Tìm phòng: listing type as a segmented control, then one sideways-scrolling
 * row with the tools (filter, sort, map) ahead of the quick filters. Two short rows instead of the
 * desktop toolbar plus a wrapped chip grid.
 */
export function MobileListingsToolbar({
  catalogs, catalog, onCatalog, resultLabel, activeFilterCount, filtersOpen, onOpenFilters, filterButtonRef,
  sortChoices, sort, onSort, showingMap, onToggleMap, quickChips,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false)
  const sortLabel = sortChoices.find(([id]) => id === sort)?.[1] ?? 'Mới nhất'
  const filterLabel = activeFilterCount ? `Bộ lọc, ${activeFilterCount} đang bật` : 'Bộ lọc'

  return (
    <div className="m-listings-bar">
      <div className="m-seg" role="group" aria-label="Loại tin">
        {catalogs.map((option) => (
          <button key={option.id} type="button" aria-pressed={catalog === option.id} onClick={() => onCatalog(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="m-chips m-listings-bar__row" role="group" aria-label="Công cụ và bộ lọc nhanh">
        <button
          ref={filterButtonRef}
          type="button"
          className={`m-chip m-chip--tool${activeFilterCount ? ' is-active' : ''}`}
          aria-label={filterLabel}
          title={filterLabel}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={onOpenFilters}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
          </svg>
          <span>Bộ lọc</span>
          {activeFilterCount ? <span className="m-chip__count" aria-hidden="true">{activeFilterCount}</span> : null}
        </button>
        <button
          type="button"
          className={`m-chip m-chip--tool${sort !== 'default' ? ' is-active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={sortOpen}
          aria-label={`Sắp xếp: ${sortLabel}`}
          onClick={() => setSortOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m3 16 4 4 4-4M7 20V4m14 4-4-4-4 4m4-4v16" />
          </svg>
          <span>{sortLabel}</span>
        </button>
        <button type="button" className="m-chip m-chip--tool" onClick={onToggleMap}>
          {showingMap ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></svg>
          )}
          <span>{showingMap ? 'Danh sách' : 'Bản đồ'}</span>
        </button>
        {quickChips.length ? <span className="m-listings-bar__divider" aria-hidden="true" /> : null}
        {quickChips.map((chip) => (
          <button key={chip.id} type="button" className="m-chip" aria-pressed={chip.active} onClick={chip.onToggle}>
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
      <p className="m-listings-bar__count" aria-live="polite">{resultLabel}</p>

      <MobileSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sắp xếp theo">
        <div className="m-options" role="radiogroup" aria-label="Sắp xếp theo">
          {sortChoices.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={sort === id}
              className="m-option"
              onClick={() => { onSort(id); setSortOpen(false) }}
            >
              <span>{label}</span>
              {sort === id ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              ) : null}
            </button>
          ))}
        </div>
      </MobileSheet>
    </div>
  )
}
