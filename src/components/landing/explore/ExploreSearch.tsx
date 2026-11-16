import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  fetchPlacePredictions,
  type PlacePredictionItem,
} from '../../../lib/placeAutocomplete'
import {
  GUEST_DISTRICTS,
  GUEST_WARDS,
  type GuestAreaOption,
} from '../guestMapAreas'

export type ExploreAreaSuggestion = {
  kind: 'area'
  id: string
  title: string
  subtitle: string
  area: GuestAreaOption
}

export type ExplorePlaceSuggestion = {
  kind: 'place'
  id: string
  title: string
  subtitle: string
  placeId: string
}

export type ExploreSuggestion = ExploreAreaSuggestion | ExplorePlaceSuggestion

type Props = {
  value: string
  onValueChange: (value: string) => void
  onPickSuggestion: (suggestion: ExploreSuggestion) => void
  onSubmitText: (value: string) => void
  schools: GuestAreaOption[]
  mapsReady: boolean
  disabled?: boolean
}

function matchArea(query: string, areas: GuestAreaOption[]): GuestAreaOption[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return areas.filter(area => {
    const hay = `${area.label} ${area.keyword} ${area.address ?? ''} ${area.description ?? ''}`.toLowerCase()
    return hay.includes(q)
  }).slice(0, 6)
}

export function ExploreSearch({
  value,
  onValueChange,
  onPickSuggestion,
  onSubmitText,
  schools,
  mapsReady,
  disabled,
}: Props) {
  const listId = useId()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [placeItems, setPlaceItems] = useState<PlacePredictionItem[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  const areaSuggestions = useMemo((): ExploreAreaSuggestion[] => {
    const areas = [...GUEST_DISTRICTS, ...GUEST_WARDS, ...schools]
    return matchArea(value, areas).map(area => ({
      kind: 'area' as const,
      id: `area:${area.id}`,
      title: area.label,
      subtitle: area.address ?? area.description ?? 'Khu vực Homeji',
      area,
    }))
  }, [schools, value])

  const placeSuggestions = useMemo((): ExplorePlaceSuggestion[] => (
    placeItems.map(item => ({
      kind: 'place' as const,
      id: `place:${item.placeId}`,
      title: item.title,
      subtitle: item.subtitle,
      placeId: item.placeId,
    }))
  ), [placeItems])

  const suggestions = useMemo(
    () => [...areaSuggestions, ...placeSuggestions],
    [areaSuggestions, placeSuggestions],
  )

  useEffect(() => {
    const q = value.trim()
    const id = ++requestId.current
    if (q.length < 2 || !mapsReady) {
      const timer = window.setTimeout(() => {
        if (id === requestId.current) setPlaceItems([])
      }, 0)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      void fetchPlacePredictions(q, { limit: 5, concreteLocalPlaces: true })
        .then(items => {
          if (id === requestId.current) setPlaceItems(items)
        })
        .catch(() => {
          if (id === requestId.current) setPlaceItems([])
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [mapsReady, value])

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const activeId = activeIndex >= 0 ? suggestions[activeIndex]?.id : undefined
  const showList = open && value.trim().length >= 2 && suggestions.length > 0

  const pick = (suggestion: ExploreSuggestion) => {
    onValueChange(suggestion.title)
    onPickSuggestion(suggestion)
    setOpen(false)
    setActiveIndex(-1)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(index => Math.min(index + 1, suggestions.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, -1))
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        pick(suggestions[activeIndex])
        return
      }
      onSubmitText(value)
      setOpen(false)
    }
  }

  return (
    <div className="explore-search" ref={rootRef}>
      <label className="explore-search__label" htmlFor={inputId}>Tìm khu vực hoặc địa điểm</label>
      <input
        id={inputId}
        className="explore-search__input"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeId}
        autoComplete="off"
        spellCheck={false}
        placeholder="Bạn muốn ở khu vực nào?"
        value={value}
        disabled={disabled}
        onChange={event => {
          onValueChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList ? (
        <ul id={listId} className="explore-search__list" role="listbox" aria-label="Gợi ý tìm kiếm">
          {areaSuggestions.length > 0 ? (
            <li className="explore-search__group" role="presentation">Khu vực</li>
          ) : null}
          {areaSuggestions.map((item, index) => {
            const absolute = index
            return (
              <li
                key={item.id}
                id={item.id}
                role="option"
                aria-selected={activeIndex === absolute}
                className={activeIndex === absolute ? 'is-active' : undefined}
                onMouseDown={event => event.preventDefault()}
                onClick={() => pick(item)}
              >
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </li>
            )
          })}
          {placeSuggestions.length > 0 ? (
            <li className="explore-search__group" role="presentation">Địa điểm</li>
          ) : null}
          {placeSuggestions.map((item, index) => {
            const absolute = areaSuggestions.length + index
            return (
              <li
                key={item.id}
                id={item.id}
                role="option"
                aria-selected={activeIndex === absolute}
                className={activeIndex === absolute ? 'is-active' : undefined}
                onMouseDown={event => event.preventDefault()}
                onClick={() => pick(item)}
              >
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
