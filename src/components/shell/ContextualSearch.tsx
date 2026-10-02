import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import { useSearch } from '../../contexts/SearchContext'

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
  } = useSearch()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(autoFocus)
  const rootRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    <div className="hj-search-slot">
      <div className="hj-search-context">
        <p className="hj-search-context__title">{contextTitle}</p>
        <p className="hj-search-context__scope">{contextScope}</p>
      </div>
      <form ref={rootRef} className="hj-search" role="search" onSubmit={onSubmit}>
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
        {open && (suggestions.length > 0 || recentSearches.length > 0 || isLoading) ? (
          <ul className="hj-search__suggest" role="listbox">
            {isLoading ? <li className="hj-search__suggest-note">Đang gợi ý…</li> : null}
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
            {suggestions.length === 0 ? recentSearches.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    submit(item)
                    setOpen(false)
                    onClose?.()
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
