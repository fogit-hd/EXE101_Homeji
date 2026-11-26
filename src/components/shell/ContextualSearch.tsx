import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBackButtonClose } from '../../hooks/useBackButtonClose'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import { useSearch } from '../../contexts/SearchContext'
import { NEARBY_PLACE_CATEGORY_OPTIONS } from '../../lib/placeAutocomplete'
import { NaturalRentalSearch } from '../ai/NaturalRentalSearch'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import { useStreetSearchPlaceholder } from '../../hooks/useStreetSearchPlaceholder'
import { shouldHandleSearchShortcut } from '../../lib/searchShortcut'

function useNarrowBar() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const apply = () => setNarrow(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])
  return narrow
}

export function ContextualSearch() {
  const narrow = useNarrowBar()
  const [overlay, setOverlay] = useState(false)
  const closeOverlay = useCallback(() => setOverlay(false), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = document.activeElement
      const editing = target instanceof HTMLElement && (
        target.matches('input, textarea, select') || target.isContentEditable
      )
      const modalOpen = Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"][aria-modal="true"]'))
        .some(dialog => dialog.getClientRects().length > 0 && !dialog.closest('[hidden], [inert], [aria-hidden="true"]'))
      if (!shouldHandleSearchShortcut(event, editing, modalOpen)) return
      event.preventDefault()
      if (narrow) setOverlay(true)
      else document.querySelector<HTMLInputElement>('.hj-search__input')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [narrow])

  if (narrow) {
    return (
      <>
        <button type="button" className="hj-search-open" aria-label="Mở tìm kiếm" title="Mở tìm kiếm" aria-haspopup="dialog" aria-expanded={overlay} onClick={() => setOverlay(true)}>
          <img className="hj-glyph" src="/bar/search.svg" alt="" width={20} height={20} />
        </button>
        {overlay ? <MobileSearchSheet onClose={closeOverlay} /> : null}
      </>
    )
  }

  return <SearchField />
}

/**
 * Phone search is a full-screen sheet on <body>: the header has a backdrop filter, which would
 * otherwise become the containing block and clip a fixed overlay to the bar's height.
 */
function MobileSearchSheet({ onClose }: { onClose: () => void }) {
  useBackButtonClose(true, onClose)
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey) }
  }, [onClose])
  return createPortal(
    <div className="hj-search-sheet" role="dialog" aria-modal="true" aria-label="Tìm kiếm" data-glass-exclude>
      <div className="hj-search-sheet__bar">
        <button type="button" className="hj-search-sheet__back" aria-label="Đóng tìm kiếm" title="Đóng tìm kiếm" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" /></svg>
        </button>
        <SearchField autoFocus inline onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}

function SearchField({ autoFocus = false, inline = false, onClose }: { autoFocus?: boolean; inline?: boolean; onClose?: () => void }) {
  const {
    query,
    placeholder,
    suggestions,
    recentSearches,
    isLoading,
    setQuery,
    submit,
    clear,
    pickSuggestion,
    nearbyAnchor, nearbyCategory, setNearbyCategory, nearbySuggestions, nearbyLoading, context,
  } = useSearch()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(autoFocus)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const locationSearch = context === 'map' || context === 'housing'
  const searchPlaceholder = useStreetSearchPlaceholder(locationSearch && !focused && !query.trim(), placeholder)

  const dismiss = () => {
    setOpen(false)
    setFocused(false)
    inputRef.current?.blur()
    onClose?.()
  }
  useDismissOnOutside(!inline && (open || focused), [rootRef], dismiss)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
    setOpen(false)
    onClose?.()
  }

  const renderSearch = (aiTrigger: ReactNode) => (
      <form className="hj-search" role="search" onSubmit={onSubmit}>
        <label className="hj-search__label" htmlFor="hj-global-search">
          Tìm kiếm
        </label>
        <div className={`hj-search__field${aiTrigger ? ' hj-search__field--ai' : ''}`}>
          <input
            ref={inputRef}
            id="hj-global-search"
            className="hj-search__input"
            aria-keyshortcuts="/"
            value={query}
            placeholder={inline ? searchPlaceholder : 'tìm kiếm'}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setFocused(true)
              setOpen(true)
            }}
            autoComplete="off"
            autoFocus={autoFocus}
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" className="hj-search__clear" aria-label="Xóa tìm kiếm" title="Xóa tìm kiếm" onClick={() => { clear(); setOpen(false) }}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
              </svg>
            </button>
          ) : null}
          {aiTrigger}
          {/* One search control: a round magnifier button at the end of the pill. */}
          <button type="submit" className="hj-search__submit hj-search__submit--icon" aria-label="Tìm kiếm" title="Tìm kiếm">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </button>
        </div>
        {open && (locationSearch || suggestions.length > 0 || recentSearches.length > 0 || isLoading) ? (
          <ul className="hj-search__suggest" role="listbox">
            {locationSearch && !query.trim() ? <li className="hj-search__suggest-note">Nhập tên đường (ví dụ: Lê Văn Việt) hoặc trường học. Chọn địa điểm gợi ý để xem phòng và tiện ích gần đó.</li> : null}
            {nearbyAnchor && (context === 'map' || context === 'housing') ? (
              <li>
                <strong>Gần khu vực đang tìm</strong><p>{nearbyAnchor.label}</p>
                <div role="group" aria-label="Loại tiện ích gần khu vực">
                  {NEARBY_PLACE_CATEGORY_OPTIONS.map((category) => <button key={category.id} type="button" aria-pressed={nearbyCategory === category.id} onClick={() => setNearbyCategory(category.id)}>{category.label}</button>)}
                </div>
                {nearbyLoading ? <p>Đang tìm tiện ích…</p> : nearbySuggestions.length ? nearbySuggestions.map((item) => <button key={item.id} type="button" onClick={() => { pickSuggestion(item); setOpen(false); onClose?.() }}><strong>{item.title}</strong><span>{item.subtitle}</span></button>) : <p>Chưa tìm thấy tiện ích trong bán kính 1,8 km.</p>}
                <small>Dữ liệu Google Places · Khoảng cách đường thẳng</small>
              </li>
            ) : null}
            {isLoading ? <li className="hj-search__suggest-note">Đang gợi ý…</li> : null}
            {locationSearch && query.trim().length >= 2 && !isLoading && suggestions.length === 0 ? <li className="hj-search__suggest-note">Chưa tìm thấy địa điểm. Nhập thêm tên đường hoặc cơ sở trường. Bạn vẫn có thể bấm Tìm để tìm trong tin đăng.</li> : null}
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    pickSuggestion(item)
                    setOpen(false)
                    onClose?.()
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </button>
              </li>
            ))}
            {suggestions.length === 0 && recentSearches.length > 0 ? <li className="hj-search__suggest-note">Tìm kiếm gần đây</li> : null}
            {suggestions.length === 0 ? recentSearches.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (locationSearch) { setQuery(item); inputRef.current?.focus() }
                    else { submit(item); setOpen(false); onClose?.() }
                  }}
                >
                  <strong>{item}</strong>
                </button>
              </li>
            )) : null}
          </ul>
        ) : null}
      </form>
  )

  return (
    <div ref={rootRef} className="hj-search-slot">
      {/* The AI room search sits in the header on every page so the header never changes shape;
          only a place/housing query is handed to it as a starting point. */}
      {aiFeatureFlags.naturalSearch
        ? <NaturalRentalSearch query={locationSearch ? query : ''}onOpen={() => { setOpen(false); setFocused(false) }} renderTrigger={renderSearch} />
        : renderSearch(null)}
    </div>
  )
}
