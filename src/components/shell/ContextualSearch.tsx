import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import { useSearch } from '../../contexts/SearchContext'
import { NEARBY_PLACE_CATEGORY_OPTIONS } from '../../lib/placeAutocomplete'
import { NaturalRentalSearch } from '../ai/NaturalRentalSearch'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'

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

  if (narrow) {
    return (
      <>
        <button type="button" className="hj-search-open" aria-label="Mở tìm kiếm" onClick={() => setOverlay(true)}>
          <img className="hj-glyph" src="/bar/search.svg" alt="" width={20} height={20} />
        </button>
        {overlay ? (
          <div className="hj-search-overlay">
            <SearchField autoFocus onClose={() => setOverlay(false)} />
          </div>
        ) : null}
      </>
    )
  }

  return <SearchField />
}

function SearchField({ autoFocus = false, onClose }: { autoFocus?: boolean; onClose?: () => void }) {
  const {
    query,
    placeholder,
    contextTitle,
    contextScope,
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

  const dismiss = () => {
    setOpen(false)
    setFocused(false)
    inputRef.current?.blur()
    onClose?.()
  }
  useDismissOnOutside(open || focused, [rootRef], dismiss)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
    setOpen(false)
    onClose?.()
  }

  return (
    <div ref={rootRef} className="hj-search-slot">
      <div className="hj-search-context">
        <p className="hj-search-context__title">{contextTitle}</p>
        <p className="hj-search-context__scope">{contextScope}</p>
      </div>
      {aiFeatureFlags.naturalSearch && (context === 'housing' || context === 'map') ? <NaturalRentalSearch /> : null}
      <form className="hj-search" role="search" onSubmit={onSubmit}>
        <label className="hj-search__label" htmlFor="hj-global-search">
          Tìm kiếm
        </label>
        <div className="hj-search__field">
          <span className="hj-search__icon" aria-hidden>
            <img className="hj-glyph" src="/bar/search.svg" alt="" width={20} height={20} />
          </span>
          <input
            ref={inputRef}
            id="hj-global-search"
            className="hj-search__input"
            value={query}
            placeholder={placeholder}
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
            <button type="button" className="hj-search__clear" aria-label="Xóa tìm kiếm" onClick={() => { clear(); setOpen(false) }}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
              </svg>
            </button>
          ) : null}
          <button type="submit" className="hj-search__submit">
            <span className="hj-search__submit-full">Tìm kiếm</span>
            <span className="hj-search__submit-short">Tìm</span>
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
            {locationSearch && query.trim().length >= 2 && !isLoading && suggestions.length === 0 ? <li className="hj-search__suggest-note">Chưa có gợi ý địa điểm. Thử tên đường đầy đủ hoặc tên trường và cơ sở. Nút Tìm vẫn tìm theo từ khóa tin đăng.</li> : null}
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
    </div>
  )
}
